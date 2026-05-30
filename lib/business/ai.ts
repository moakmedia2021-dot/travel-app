// AI helpers for the Business hub: video content + contract drafting.
// Uses OpenAI chat completions (Structured Outputs) via fetch — no SDK dep.
import type { VideoContent, VideoPlatform } from "./types";

function requireKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return key;
}

const VIDEO_SCHEMA = {
  name: "video_content",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      hooks: { type: "array", items: { type: "string" } },
      ideas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, angle: { type: "string" } },
          required: ["title", "angle"],
        },
      },
      script: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { section: { type: "string" }, text: { type: "string" } },
          required: ["section", "text"],
        },
      },
      caption: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
    },
    required: ["hooks", "ideas", "script", "caption", "hashtags"],
  },
} as const;

const PLATFORM_GUIDE: Record<VideoPlatform, string> = {
  youtube:
    "YouTube (horizontal, 30s–3min). Strong title-worthy hook, clear value, slightly longer storytelling.",
  reels:
    "Instagram Reels (vertical, 15–45s). Punchy 1-second hook, fast cuts, trending-friendly, end with a soft CTA.",
  tiktok:
    "TikTok (vertical, 15–40s). Native, casual, hook in first 1s, conversational, loopable ending.",
};

export async function generateVideoContent(args: {
  property: string;
  location: string;
  platform: VideoPlatform;
  vibe: string;
  notes: string;
}): Promise<VideoContent> {
  const key = requireKey();

  const system = `You are a short-form travel/real-estate content strategist who writes scroll-stopping hooks and tight scripts for an Airbnb collaboration creator. Always concrete and specific to the property. No filler.`;

  const user = `Create content for this Airbnb collaboration video.

Property: ${args.property || "an Airbnb stay"}
Location: ${args.location || "unspecified"}
Platform: ${PLATFORM_GUIDE[args.platform]}
Desired vibe: ${args.vibe || "aspirational but authentic"}
${args.notes ? `Extra notes: ${args.notes}` : ""}

Deliver:
- hooks: 6 distinct opening hooks (each under 12 words, thumb-stopping).
- ideas: 4 video concepts (title + the angle/why it works).
- script: a full shoot-ready script as ordered sections (e.g. "Hook", "Walkthrough - Kitchen", "Amenity highlight", "CTA"). Each section has spoken/voiceover text. Match the platform length.
- caption: a ready-to-post caption.
- hashtags: 10 relevant hashtags WITHOUT the # symbol.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: VIDEO_SCHEMA },
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return JSON.parse(content) as VideoContent;
}

// Draft a collaboration agreement body (plain text) the user can edit.
export async function generateContractBody(args: {
  creatorName: string;
  businessName: string;
  hostName: string;
  property: string;
  location: string;
  deliverables: string;
  compensation: string;
  timeline: string;
}): Promise<string> {
  const key = requireKey();

  const system = `You are a clear, fair contracts assistant. Write a concise, plain-English collaboration agreement between a content creator and an Airbnb host. Avoid legalese where possible but cover the essentials. Output plain text with numbered sections. Add a short disclaimer that this is a template and not legal advice.`;

  const user = `Draft a collaboration agreement.

Creator: ${args.creatorName}${args.businessName ? ` (${args.businessName})` : ""}
Host: ${args.hostName || "Host"}
Property: ${args.property || "the property"}${args.location ? `, ${args.location}` : ""}
Deliverables: ${args.deliverables || "social content"}
Compensation: ${args.compensation || "as agreed"}
Timeline: ${args.timeline || "as agreed"}

Cover: parties, scope/deliverables, compensation & payment terms, content usage/licensing rights, timeline, cancellation, and a short disclaimer. Keep it under ~600 words.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content?.trim() ?? "";
}
