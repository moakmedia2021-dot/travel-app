"use client";

import { useState } from "react";
import { updateHomeAirport } from "@/app/actions/profile";

type Props = {
  current: string | null;
  onSaved: (iata: string) => void;
};

export default function HomeAirportPrompt({ current, onSaved }: Props) {
  const [iata, setIata] = useState(current ?? "");
  const [editing, setEditing] = useState(!current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateHomeAirport(iata);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    onSaved(iata.toUpperCase());
  }

  if (!editing && current) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <span>Flying from</span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-medium text-neutral-900">
          {current}
        </span>
        <button onClick={() => setEditing(true)} className="text-xs text-neutral-500 hover:text-neutral-900 underline">
          change
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={iata}
        onChange={(e) => setIata(e.target.value.toUpperCase().slice(0, 3))}
        placeholder="JFK"
        className="w-20 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm font-mono uppercase shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
      />
      <button
        onClick={save}
        disabled={saving || iata.length !== 3}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {saving ? "…" : "Save home airport"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
