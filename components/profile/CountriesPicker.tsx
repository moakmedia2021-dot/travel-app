"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/countries";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

export default function CountriesPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [query]);

  function toggle(code: string) {
    if (selected.includes(code)) onChange(selected.filter((c) => c !== code));
    else onChange([...selected, code]);
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-neutral-100 p-2">
          {selected.map((code) => {
            const c = COUNTRY_BY_CODE[code];
            if (!c) return null;
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200"
                title="Remove"
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-neutral-400">×</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="p-2">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Search countries…"
          className="block w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {open && (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {filtered.map((c) => {
              const active = selected.includes(c.code);
              return (
                <label
                  key={c.code}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(c.code)}
                    className="h-4 w-4 accent-neutral-900"
                  />
                  <span>{c.flag}</span>
                  <span className="flex-1 text-neutral-700">{c.name}</span>
                  <span className="font-mono text-xs text-neutral-400">{c.code}</span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-neutral-400">No matches</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
