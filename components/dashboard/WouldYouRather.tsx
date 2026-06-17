"use client";

import { useMemo, useState } from "react";

type Side = { emoji: string; label: string };
type Matchup = { a: Side; b: Side };

const MATCHUPS: Matchup[] = [
  { a: { emoji: "🏖️", label: "Beach" }, b: { emoji: "⛰️", label: "Mountains" } },
  { a: { emoji: "🪟", label: "Window seat" }, b: { emoji: "🚶", label: "Aisle seat" } },
  { a: { emoji: "🌮", label: "Street food" }, b: { emoji: "🍽️", label: "Fine dining" } },
  { a: { emoji: "🌄", label: "Sunrise hike" }, b: { emoji: "🍹", label: "Sunset cocktails" } },
  { a: { emoji: "🌃", label: "City lights" }, b: { emoji: "✨", label: "Starry skies" } },
  { a: { emoji: "🚗", label: "Road trip" }, b: { emoji: "🚆", label: "Train journey" } },
  { a: { emoji: "🎲", label: "Spontaneous" }, b: { emoji: "📋", label: "Fully planned" } },
  { a: { emoji: "🎒", label: "Carry-on only" }, b: { emoji: "🧳", label: "Check a bag" } },
  { a: { emoji: "🧍", label: "Solo trip" }, b: { emoji: "👯", label: "Squad trip" } },
  { a: { emoji: "☀️", label: "Summer escape" }, b: { emoji: "❄️", label: "Winter wonderland" } },
  { a: { emoji: "⛺", label: "Camp under stars" }, b: { emoji: "🏝️", label: "Beach resort" } },
  { a: { emoji: "🗺️", label: "Follow the map" }, b: { emoji: "🧭", label: "Just wander" } },
  { a: { emoji: "🌅", label: "Early flight" }, b: { emoji: "🌙", label: "Red-eye" } },
  { a: { emoji: "📷", label: "Capture it all" }, b: { emoji: "😎", label: "Just be present" } },
];

const VERDICTS = [
  "Solid choice. ✈️",
  "A traveler of culture.",
  "Bold. We respect it.",
  "Can't argue with that.",
  "Iconic pick.",
  "That's the spirit.",
  "Elite taste.",
  "Adventure awaits. 🌍",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WouldYouRather() {
  const order = useMemo(() => shuffle(MATCHUPS.map((_, i) => i)), []);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [verdict, setVerdict] = useState("");
  const [count, setCount] = useState(0);

  const m = MATCHUPS[order[step % order.length]];

  function choose(side: "a" | "b") {
    if (picked) return;
    setPicked(side);
    setVerdict(VERDICTS[Math.floor(Math.random() * VERDICTS.length)]);
    setCount((c) => c + 1);
  }

  function next() {
    setPicked(null);
    setVerdict("");
    setStep((s) => s + 1);
  }

  function Choice({ side, data }: { side: "a" | "b"; data: Side }) {
    const isPicked = picked === side;
    const dimmed = picked && !isPicked;
    return (
      <button
        onClick={() => choose(side)}
        disabled={!!picked}
        className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-6 transition-all ${
          isPicked
            ? "border-blue-600 bg-blue-50"
            : dimmed
            ? "border-neutral-200 opacity-50"
            : "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50"
        } ${!picked ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="text-4xl">{data.emoji}</span>
        <span className="text-sm font-semibold text-neutral-900">{data.label}</span>
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Would you rather…</h2>
        {count > 0 && (
          <span className="text-xs text-neutral-400">{count} answered</span>
        )}
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        <Choice side="a" data={m.a} />
        <div className="flex items-center text-xs font-bold uppercase text-neutral-300">or</div>
        <Choice side="b" data={m.b} />
      </div>

      <div className="mt-4 flex min-h-[2rem] items-center justify-between gap-3">
        <p className="text-sm font-medium text-blue-600">{picked ? verdict : " "}</p>
        {picked && (
          <button
            onClick={next}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Next →
          </button>
        )}
      </div>
    </section>
  );
}
