"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateTripItinerary, bulkAddItineraryItems, openAIConfigured } from "@/app/actions/ai";
import type { GeneratedItem } from "@/lib/openai";
import { TYPE_CONFIG } from "./typeConfig";

const INTERESTS = [
  "Food",
  "History",
  "Nature",
  "Beaches",
  "Nightlife",
  "Shopping",
  "Art",
  "Adventure",
];

type Props = {
  open: boolean;
  tripId: string;
  onClose: () => void;
};

export default function AIGeneratorModal({ open, tripId, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"prompt" | "loading" | "preview">("prompt");
  const [interests, setInterests] = useState<Set<string>>(new Set(["Food"]));
  const [freeText, setFreeText] = useState("");
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("prompt");
    setError(null);
    setGenerated([]);
    setAdding(false);
    openAIConfigured().then(setConfigured);
  }, [open]);

  if (!open) return null;

  function toggleInterest(i: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleGenerate() {
    setStep("loading");
    setError(null);
    const r = await generateTripItinerary(tripId, freeText, Array.from(interests));
    if (!r.ok) {
      setError(r.error);
      setStep("prompt");
      return;
    }
    setGenerated(r.data);
    setStep("preview");
  }

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const r = await bulkAddItineraryItems(tripId, generated);
    setAdding(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onClose();
    router.refresh();
  }

  function removeItem(idx: number) {
    setGenerated((prev) => prev.filter((_, i) => i !== idx));
  }

  // Group by day for preview
  const byDay = new Map<number, GeneratedItem[]>();
  for (const item of generated) {
    const arr = byDay.get(item.day_number) ?? [];
    arr.push(item);
    byDay.set(item.day_number, arr);
  }
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/50 px-0 sm:px-4" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-base font-semibold text-neutral-900">Generate itinerary</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {configured === false ? (
            <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
              Set <code className="rounded bg-neutral-100 px-1 text-xs">OPENAI_API_KEY</code> in{" "}
              <code className="rounded bg-neutral-100 px-1 text-xs">.env.local</code> and restart.
              <br />
              Get one at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="font-medium text-neutral-700 underline">
                platform.openai.com
              </a>
              .
            </div>
          ) : step === "prompt" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  What kind of trip is this?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        interests.has(i)
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Anything else? <span className="text-neutral-400">(optional)</span>
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={3}
                  placeholder="Slow pace, love coffee shops, hate crowds. Two of us are vegetarian."
                  className="block w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              <p className="text-xs text-neutral-500">
                Uses trip destination, dates, travelers, and budget. Generates a draft you can edit before saving.
              </p>
            </div>
          ) : step === "loading" ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
              <p className="mt-4 text-sm text-neutral-600">Planning your trip…</p>
              <p className="mt-1 text-xs text-neutral-400">Usually takes 10-20 seconds</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                {generated.length} item{generated.length === 1 ? "" : "s"} across {days.length} day{days.length === 1 ? "" : "s"}. Remove anything you don't want before adding.
              </p>
              {days.map(([dayNumber, items]) => (
                <div key={dayNumber}>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-900">Day {dayNumber}</h3>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const idx = generated.indexOf(item);
                      const cfg = TYPE_CONFIG[item.type];
                      return (
                        <div key={idx} className="flex items-start gap-2 rounded-md border border-neutral-200 bg-white p-2">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}>
                            {cfg.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium text-neutral-900">
                                {item.title}
                              </span>
                              {(item.start_time || item.end_time) && (
                                <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
                                  {item.start_time}
                                  {item.start_time && item.end_time ? "–" : ""}
                                  {item.end_time}
                                </span>
                              )}
                            </div>
                            {item.location_name && (
                              <div className="text-xs text-neutral-500">{item.location_name}</div>
                            )}
                            {item.notes && (
                              <div className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{item.notes}</div>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(idx)}
                            className="shrink-0 text-neutral-300 hover:text-red-600"
                            aria-label="Remove"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {configured !== false && (
          <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-5 py-4">
            <button onClick={onClose} className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Cancel
            </button>
            {step === "prompt" && (
              <button
                onClick={handleGenerate}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                ✨ Generate
              </button>
            )}
            {step === "preview" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("prompt")}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Try again
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || generated.length === 0}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {adding ? "Adding…" : `Add ${generated.length} items`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
