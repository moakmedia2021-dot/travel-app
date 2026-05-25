"use client";

import { useEffect, useRef, useState } from "react";
import type { DuffelPlace } from "@/lib/duffel";
import { searchLocationSuggestions } from "@/app/actions/deals";

type Props = {
  value: string;
  onChange: (iata: string, label: string, place: DuffelPlace) => void;
  placeholder?: string;
  type: "airport" | "city"; // filters but also accepts the other
};

export default function DestinationCombobox({ value, onChange, placeholder, type }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<DuffelPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2 || query === value) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchLocationSuggestions(query);
      const filtered =
        type === "airport"
          ? data
          : data.filter((d) => d.subType === "CITY" || d.subType === "AIRPORT");
      setResults(filtered);
      setLoading(false);
    }, 300);
  }, [query, type, value]);

  function handleSelect(loc: DuffelPlace) {
    const label = `${loc.iataCode} · ${loc.cityName ?? loc.name}`;
    setQuery(label);
    setOpen(false);
    onChange(loc.iataCode, label, loc);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-neutral-400">Searching…</div>}
          {results.map((loc) => (
            <button
              key={`${loc.subType}-${loc.iataCode}`}
              type="button"
              onClick={() => handleSelect(loc)}
              className="flex w-full items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <div className="truncate text-neutral-900">
                  {loc.cityName ?? loc.name}
                  {loc.countryName && <span className="text-neutral-400">, {loc.countryName}</span>}
                </div>
                <div className="text-xs text-neutral-500">
                  {loc.subType === "AIRPORT" ? loc.name : "City"}
                </div>
              </div>
              <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">
                {loc.iataCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
