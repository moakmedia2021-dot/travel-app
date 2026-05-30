// Content moderation for user-generated text and images (chat + feed).
//
// Two layers:
//   1) A fast, deterministic profanity filter that blocks curse words even
//      when the OpenAI API is unavailable.
//   2) OpenAI's omni-moderation model, which flags NSFW / sexual / hateful /
//      violent text AND nude / explicit images.
//
// Philosophy: profanity is always enforced locally. For the AI layer we
// "fail open" on network/API errors (so a transient outage never blocks a
// clean message), but we "fail closed" whenever the model actually flags
// content.

const BLOCK_MESSAGE_TEXT =
  "That message contains language or content that isn't allowed here. Please keep it friendly and SFW.";
const BLOCK_MESSAGE_IMAGE =
  "That image looks like it may contain nudity or NSFW content, so it can't be posted.";

export type ModerationResult = { allowed: true } | { allowed: false; reason: string };

// ---------------------------------------------------------------------------
// Layer 1: profanity filter
// ---------------------------------------------------------------------------

// Strong terms that are safe to match as a SUBSTRING (they almost never appear
// inside innocent words), so we catch them even when embedded: "wowfuckman".
const STRONG_SUBSTR = [
  "fuck",
  "motherfucker",
  "pussy",
  "asshole",
  "dickhead",
  "nigger",
  "faggot",
  "blowjob",
  "handjob",
  "dildo",
  "jizz",
  "bullshit",
  "jackass",
  "whore",
];

// Profanity matched only as a WHOLE word — these are short and/or appear inside
// innocent words (the "Scunthorpe problem": "cunt" in Scunthorpe, "cock" in
// cocktail, "cum" in cucumber, "ass" in class, "hell" in shell).
const WORD = [
  "cunt",
  "cock",
  "cum",
  "fag",
  "slut",
  "boner",
  "wank",
  "twat",
  "bollocks",
  "nigga",
  "retard",
  "ass",
  "shit",
  "bitch",
  "bastard",
  "damn",
  "dick",
  "piss",
  "crap",
  "prick",
  "douche",
  "hell",
  "tits",
  "boobs",
  "porn",
  "sex",
  "nude",
  "naked",
  "horny",
];

// Map common leetspeak / look-alike characters to letters.
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  $: "s",
  "!": "i",
  "+": "t",
  "(": "c",
};

function normalize(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/[^a-z\s]/g, " ") // strip remaining punctuation
    .replace(/(.)\1{2,}/g, "$1$1"); // collapse 3+ repeats: "fuuuck" -> "fuuck"->"fuck"-ish
}

function stem(t: string): string {
  return t.replace(/(ing|er|ed|s|y|in)$/i, "");
}

export function findProfanity(text: string): string | null {
  if (!text) return null;
  const norm = normalize(text);
  const tokens = norm.split(/\s+/).filter(Boolean);

  // Rebuild runs of single letters to defeat "f u c k" / "s.h.i.t" evasion.
  const runs: string[] = [];
  let run = "";
  for (const t of tokens) {
    if (t.length === 1) run += t;
    else if (run) {
      runs.push(run);
      run = "";
    }
  }
  if (run) runs.push(run);

  for (const r of runs) {
    // A reconstructed run is unambiguous evasion, so match it directly.
    if (WORD.includes(r)) return r;
    for (const w of STRONG_SUBSTR) {
      if (r.includes(w)) return w;
    }
  }

  for (const t of tokens) {
    const collapsed = t.replace(/(.)\1+/g, "$1"); // fuuuck -> fuck
    const base = stem(t);
    // Whole-word matches (exact, stemmed, or repeat-collapsed).
    if (WORD.includes(t) || WORD.includes(base) || WORD.includes(collapsed)) return t;
    // Strong terms can also be embedded inside a single token.
    for (const w of STRONG_SUBSTR) {
      if (t.includes(w) || collapsed.includes(w)) return w;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Layer 2: OpenAI omni-moderation (text + images)
// ---------------------------------------------------------------------------

type OmniInput =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OmniResult = {
  results?: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
  }>;
};

async function callOmniModeration(input: OmniInput[]): Promise<OmniResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      // Don't let a slow call hang a post forever.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as OmniResult;
  } catch {
    return null; // fail open on transient errors
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Moderate a piece of user text (chat message, post, tip). */
export async function moderateText(text: string): Promise<ModerationResult> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { allowed: true };

  // Layer 1 — always enforced.
  if (findProfanity(trimmed)) {
    return { allowed: false, reason: BLOCK_MESSAGE_TEXT };
  }

  // Layer 2 — AI moderation for NSFW / hateful / violent content.
  const mod = await callOmniModeration([{ type: "text", text: trimmed }]);
  const result = mod?.results?.[0];
  if (result?.flagged) {
    return { allowed: false, reason: BLOCK_MESSAGE_TEXT };
  }
  return { allowed: true };
}

/**
 * Moderate an image by URL (must be publicly reachable). Blocks nudity and
 * other NSFW imagery. If the AI layer is unavailable, the image is allowed
 * (we can't classify it), so callers should treat this as best-effort.
 */
export async function moderateImageUrl(url: string): Promise<ModerationResult> {
  if (!url) return { allowed: true };
  const mod = await callOmniModeration([{ type: "image_url", image_url: { url } }]);
  const result = mod?.results?.[0];
  if (!result) return { allowed: true }; // no key / API error — can't classify
  const cats = result.categories ?? {};
  // Block on any sexual / explicit / graphic-violence signal.
  const nsfw =
    result.flagged &&
    (cats["sexual"] ||
      cats["sexual/minors"] ||
      cats["violence/graphic"] ||
      cats["harassment"] ||
      cats["hate"]);
  if (nsfw) {
    return { allowed: false, reason: BLOCK_MESSAGE_IMAGE };
  }
  return { allowed: true };
}
