"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/mockActivities";
import { searchActivitiesAction, addActivityToTrip } from "@/app/actions/deals";
import { formatMoney } from "@/lib/currencies";

type Props = {
  tripId: string;
  destination: string;
  maxDay: number;
  onHover: (preview: number | null) => void;
};

export default function ActivitiesPanel({ tripId, destination, maxDay, onHover }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(destination ?? "");
  const [results, setResults] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    const r = await searchActivitiesAction(query);
    setLoading(false);
    if (r.ok) setResults(r.data);
  }

  async function handleAdd(activity: Activity) {
    setAddingId(activity.id);
    const r = await addActivityToTrip(tripId, activity, 1); // adds to day 1; user can reorder later
    setAddingId(null);
    if (!r.ok) {
      alert(r.error);
      return;
    }
    onHover(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Showing sample activities. Hook up a real provider (Viator/GetYourGuide) later.
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tokyo, Lisbon, Mexico City…"
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "…" : "Search"}
        </button>
      </div>

      {results && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <div
              key={a.id}
              onMouseEnter={() => onHover(a.price)}
              onMouseLeave={() => onHover(null)}
              className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
            >
              <div
                className="aspect-[4/3] w-full"
                style={{
                  background: `linear-gradient(135deg, hsl(${a.imageHue}, 70%, 75%), hsl(${a.imageHue + 30}, 60%, 60%))`,
                }}
              />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900">{a.title}</h3>
                  <span className="shrink-0 text-xs text-amber-600">★ {a.rating}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{a.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>{a.durationHours}h</span>
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {formatMoney(a.price, a.currency)}
                  </span>
                </div>
                <button
                  onClick={() => handleAdd(a)}
                  disabled={addingId !== null || maxDay < 1}
                  className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {addingId === a.id ? "Adding…" : "Add to trip"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && (
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Show sample activities"}
        </button>
      )}
    </div>
  );
}
