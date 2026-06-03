"use client";

import { useEffect, useRef, useState } from "react";

type Dest = { emoji: string; city: string; country: string; line: string };

const DESTINATIONS: Dest[] = [
  { emoji: "🗼", city: "Paris", country: "France", line: "Croissants, the Seine, and zero regrets." },
  { emoji: "🏝️", city: "Bali", country: "Indonesia", line: "Rice terraces and slow mornings." },
  { emoji: "🗽", city: "New York", country: "USA", line: "The city that dares you to keep up." },
  { emoji: "🌸", city: "Kyoto", country: "Japan", line: "Temples, tea, and cherry blossoms." },
  { emoji: "🌋", city: "Reykjavík", country: "Iceland", line: "Waterfalls, lava fields, northern lights." },
  { emoji: "🕌", city: "Marrakech", country: "Morocco", line: "Spice markets and rooftop sunsets." },
  { emoji: "🌊", city: "Santorini", country: "Greece", line: "Blue domes and impossible sunsets." },
  { emoji: "🦁", city: "Serengeti", country: "Tanzania", line: "The great migration, up close." },
  { emoji: "⛰️", city: "Queenstown", country: "New Zealand", line: "Adventure capital of the world." },
  { emoji: "🏖️", city: "Tulum", country: "Mexico", line: "Cenotes, ruins, and warm water." },
  { emoji: "🏔️", city: "Banff", country: "Canada", line: "Turquoise lakes and big mountains." },
  { emoji: "🏛️", city: "Rome", country: "Italy", line: "2,000 years of incredible food." },
  { emoji: "🐯", city: "Chiang Mai", country: "Thailand", line: "Night markets and jungle temples." },
  { emoji: "🌴", city: "Maui", country: "Hawaii", line: "The road to Hana is calling." },
  { emoji: "🏰", city: "Edinburgh", country: "Scotland", line: "Castles, closes, and cozy pubs." },
  { emoji: "🏜️", city: "Dubai", country: "UAE", line: "Desert dunes meet the future." },
  { emoji: "🏯", city: "Seoul", country: "South Korea", line: "Palaces by day, neon by night." },
  { emoji: "🌅", city: "Cape Town", country: "South Africa", line: "Table Mountain to two oceans." },
  { emoji: "🛶", city: "Ha Long Bay", country: "Vietnam", line: "Limestone islands and quiet water." },
  { emoji: "🎭", city: "Lisbon", country: "Portugal", line: "Tiled streets and pastel light." },
  { emoji: "🏔️", city: "Patagonia", country: "Argentina", line: "The end of the world, wide open." },
  { emoji: "🐠", city: "Maldives", country: "", line: "Overwater everything." },
  { emoji: "🕍", city: "Prague", country: "Czechia", line: "Fairy-tale spires and old bridges." },
  { emoji: "🐪", city: "Petra", country: "Jordan", line: "A city carved from rose stone." },
  { emoji: "🌃", city: "Tokyo", country: "Japan", line: "Order, chaos, and the best ramen." },
  { emoji: "🏖️", city: "Rio de Janeiro", country: "Brazil", line: "Beaches, mountains, and rhythm." },
];

export default function DestinationRoulette() {
  const [current, setCurrent] = useState<Dest>(DESTINATIONS[0]);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [count, setCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((id) => clearTimeout(id));
  }, []);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setLanded(false);
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];

    // Slot-machine: flip fast, then decelerate, then land.
    const intervals = [60, 60, 60, 70, 80, 90, 110, 140, 180, 230, 300, 380];
    let elapsed = 0;
    intervals.forEach((gap, i) => {
      elapsed += gap;
      const id = window.setTimeout(() => {
        setCurrent(DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)]);
        if (i === intervals.length - 1) {
          setSpinning(false);
          setLanded(true);
          setCount((c) => c + 1);
        }
      }, elapsed);
      timers.current.push(id);
    });
  }

  return (
    <section className="border-t border-neutral-200 bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          While you wait — where to first?
        </h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Spin the globe 🌍
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
          <div
            className={`text-6xl transition-transform duration-200 sm:text-7xl ${
              spinning ? "scale-110" : landed ? "scale-105" : "scale-100"
            }`}
            aria-hidden
          >
            {current.emoji}
          </div>
          <div className="mt-4 min-h-[3.5rem]">
            <div className="text-xl font-bold text-neutral-900">
              {current.city}
              {current.country && (
                <span className="font-medium text-neutral-400">, {current.country}</span>
              )}
            </div>
            <p
              className={`mt-1 text-sm text-neutral-500 transition-opacity ${
                spinning ? "opacity-0" : "opacity-100"
              }`}
            >
              {current.line}
            </p>
          </div>

          <button
            onClick={spin}
            disabled={spinning}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-neutral-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
          >
            {spinning ? "Spinning…" : count === 0 ? "Spin the globe" : "Spin again"}
          </button>
        </div>

        {count > 0 && (
          <p className="mt-5 text-sm text-neutral-500">
            You&apos;ve discovered{" "}
            <span className="font-semibold text-neutral-900">{count}</span>{" "}
            {count === 1 ? "destination" : "destinations"}.{" "}
            <a href="#join" className="font-medium text-blue-600 hover:text-blue-700">
              Plan the first one →
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
