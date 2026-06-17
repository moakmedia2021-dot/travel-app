"use client";

import { useEffect, useState } from "react";

// App goes live August 1, 2026 (local time).
const TARGET = new Date(2026, 7, 1, 0, 0, 0).getTime();
// Build progress is measured from this anchor; the bar hits 100% at launch.
const PROGRESS_START = new Date(2026, 0, 1, 0, 0, 0).getTime();

function pctReady(): number {
  const total = TARGET - PROGRESS_START;
  const done = Math.min(Math.max(Date.now() - PROGRESS_START, 0), total);
  return total > 0 ? (done / total) * 100 : 100;
}

type Parts = { d: number; h: number; m: number; s: number; done: boolean };

function calc(): Parts {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1_000),
    done: diff === 0,
  };
}

export default function Countdown() {
  // null until mounted so server/client render the same thing (no hydration mismatch)
  const [t, setT] = useState<Parts | null>(null);

  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: { label: string; value: number | null }[] = [
    { label: "Days", value: t?.d ?? null },
    { label: "Hours", value: t?.h ?? null },
    { label: "Minutes", value: t?.m ?? null },
    { label: "Seconds", value: t?.s ?? null },
  ];

  // Only compute once mounted (avoids server/client hydration mismatch).
  const pct = t ? pctReady() : 0;

  return (
    <section className="border-t border-neutral-200 bg-neutral-50 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          Launching August 1, 2026
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {t?.done ? "We're live — let's get goin'." : "The countdown is on."}
        </h2>

        <div className="mx-auto mt-8 grid max-w-xl grid-cols-4 gap-2 sm:gap-4">
          {units.map((u) => (
            <div
              key={u.label}
              className="rounded-xl bg-neutral-900 px-1 py-4 text-white sm:py-6"
            >
              <div className="font-mono text-2xl font-bold tabular-nums sm:text-4xl">
                {u.value === null ? "––" : String(u.value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400 sm:text-xs">
                {u.label}
              </div>
            </div>
          ))}
        </div>

        {/* Build progress to launch */}
        <div className="mx-auto mt-10 max-w-xl">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-700">Building GetGoin</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-blue-600">
              {t ? `${Math.floor(pct)}%` : "––%"}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-green-500 transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {t && pct >= 100 ? "Ready to launch 🚀" : "Updates every day until launch day."}
          </p>
        </div>

        <p className="mt-6 text-sm text-neutral-500">
          Join the waitlist now and you&apos;ll be first through the door.
        </p>
      </div>
    </section>
  );
}
