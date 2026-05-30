"use client";

import { useState } from "react";
import { toast } from "sonner";
import { generateContent } from "@/app/actions/business";
import type { Collaboration, VideoContent, VideoPlatform } from "@/lib/business/types";

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

const PLATFORMS: { id: VideoPlatform; label: string }[] = [
  { id: "reels", label: "Instagram Reels" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
];

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Couldn't copy")
  );
}

export default function ContentStudio({ collaborations }: { collaborations: Collaboration[] }) {
  const [property, setProperty] = useState("");
  const [location, setLocation] = useState("");
  const [platform, setPlatform] = useState<VideoPlatform>("reels");
  const [vibe, setVibe] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VideoContent | null>(null);

  function applyCollab(id: string) {
    const c = collaborations.find((x) => x.id === id);
    if (!c) return;
    setProperty(c.property_name ?? c.name);
    setLocation(c.location ?? "");
    if (c.notes) setNotes(c.notes);
  }

  async function run() {
    setBusy(true);
    const r = await generateContent({ property, location, platform, vibe, notes });
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    setResult(r.data);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Inputs */}
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-neutral-900">Brief</h3>

        {collaborations.length > 0 && (
          <select className={inputClass} defaultValue="" onChange={(e) => applyCollab(e.target.value)}>
            <option value="">Prefill from a collaboration…</option>
            {collaborations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.property_name ? ` — ${c.property_name}` : ""}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input className={inputClass} value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Property / stay" />
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === p.id ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input className={inputClass} value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe (e.g. cozy cabin, luxe beachfront, moody)" />
        <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to emphasize — amenities, hook angle, audience…" />

        <button
          onClick={run}
          disabled={busy}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Generating…" : "✨ Generate content"}
        </button>
        <p className="text-xs text-neutral-400">Uses AI to write hooks, video ideas, a full script, caption, and hashtags.</p>
      </div>

      {/* Output */}
      <div className="space-y-4">
        {!result ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-400">
            {busy ? "Thinking up some bangers…" : "Your generated content will appear here."}
          </div>
        ) : (
          <>
            <OutputCard title="Hooks">
              <ul className="space-y-1.5">
                {result.hooks.map((h, i) => (
                  <li key={i} className="group flex items-start justify-between gap-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                    <span>{h}</span>
                    <button onClick={() => copy(h)} className="shrink-0 text-xs text-neutral-400 opacity-0 hover:text-neutral-700 group-hover:opacity-100">
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </OutputCard>

            <OutputCard title="Video ideas">
              <ul className="space-y-2">
                {result.ideas.map((idea, i) => (
                  <li key={i} className="rounded-md border border-neutral-100 px-3 py-2">
                    <p className="text-sm font-medium text-neutral-900">{idea.title}</p>
                    <p className="text-xs text-neutral-500">{idea.angle}</p>
                  </li>
                ))}
              </ul>
            </OutputCard>

            <OutputCard
              title="Script"
              action={
                <button
                  onClick={() => copy(result.script.map((s) => `${s.section}\n${s.text}`).join("\n\n"))}
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Copy all
                </button>
              }
            >
              <div className="space-y-3">
                {result.script.map((s, i) => (
                  <div key={i}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{s.section}</p>
                    <p className="whitespace-pre-line text-sm text-neutral-800">{s.text}</p>
                  </div>
                ))}
              </div>
            </OutputCard>

            <OutputCard title="Caption" action={<button onClick={() => copy(result.caption)} className="text-xs font-medium text-neutral-500 hover:text-neutral-900">Copy</button>}>
              <p className="whitespace-pre-line text-sm text-neutral-800">{result.caption}</p>
            </OutputCard>

            <OutputCard title="Hashtags" action={<button onClick={() => copy(result.hashtags.map((h) => `#${h}`).join(" "))} className="text-xs font-medium text-neutral-500 hover:text-neutral-900">Copy</button>}>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtags.map((h, i) => (
                  <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">#{h}</span>
                ))}
              </div>
            </OutputCard>
          </>
        )}
      </div>
    </div>
  );
}

function OutputCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
