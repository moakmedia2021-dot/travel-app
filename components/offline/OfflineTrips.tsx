"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listTripsOffline, removeTripOffline } from "@/lib/offline/db";
import type { TripBundle } from "@/lib/offline/types";
import type { ItineraryItem } from "@/lib/types";

const TYPE_ICON: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  activity: "📍",
  transport: "🚗",
  note: "📝",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function dayDate(start: string | null, day: number): string {
  if (!start) return `Day ${day}`;
  const d = new Date(start + "T00:00:00");
  d.setDate(d.getDate() + (day - 1));
  return `Day ${day} · ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
}

export default function OfflineTrips() {
  const [trips, setTrips] = useState<TripBundle[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function reload() {
    setTrips(await listTripsOffline());
  }
  useEffect(() => {
    reload();
  }, []);

  const open = useMemo(() => trips?.find((t) => t.trip.id === openId) ?? null, [trips, openId]);

  if (trips === null) {
    return <p className="py-10 text-center text-sm text-neutral-400">Loading saved trips…</p>;
  }

  if (open) {
    return <TripDetail bundle={open} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Offline trips</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Trips you&apos;ve downloaded. These work with no internet.
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-12 text-center">
          <p className="text-sm text-neutral-500">No downloaded trips yet.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Open a trip and tap <span className="font-medium">Download for offline</span> before you
            lose service.
          </p>
          <Link
            href="/trips"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Go to my trips
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map((b) => (
            <button
              key={b.trip.id}
              onClick={() => setOpenId(b.trip.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left hover:border-neutral-300"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-neutral-900">{b.trip.title}</div>
                <div className="truncate text-xs text-neutral-500">
                  {[b.trip.destination, b.items.length ? `${b.items.length} items` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <span className="shrink-0 text-xs text-neutral-400">
                saved {new Date(b.saved_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TripDetail({ bundle, onBack }: { bundle: TripBundle; onBack: () => void }) {
  const { trip, items, members } = bundle;

  const byDay = useMemo(() => {
    const map = new Map<number, ItineraryItem[]>();
    for (const it of items) {
      const arr = map.get(it.day_number) ?? [];
      arr.push(it);
      map.set(it.day_number, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm font-medium text-blue-600 hover:text-blue-700">
        ← All offline trips
      </button>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-neutral-900">{trip.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {[trip.destination, trip.start_date && `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {members.length > 0 && (
          <p className="mt-2 text-xs text-neutral-400">
            {members.map((m) => m.name).join(", ")}
          </p>
        )}
        <p className="mt-3 inline-block rounded-md bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
          Saved {new Date(bundle.saved_at).toLocaleString()}
        </p>
      </div>

      {byDay.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-400">
          No itinerary items were saved.
        </p>
      ) : (
        byDay.map(([day, dayItems]) => (
          <div key={day}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {dayDate(trip.start_date, day)}
            </h2>
            <div className="space-y-2">
              {dayItems.map((it) => (
                <div
                  key={it.id}
                  className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <span className="text-lg leading-none">{TYPE_ICON[it.type] ?? "📍"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900">{it.title}</span>
                      {(it.start_time || it.end_time) && (
                        <span className="shrink-0 text-xs text-neutral-500">
                          {it.start_time}
                          {it.end_time ? `–${it.end_time}` : ""}
                        </span>
                      )}
                    </div>
                    {it.location_name && (
                      <div className="text-xs text-neutral-500">{it.location_name}</div>
                    )}
                    {it.booking_ref && (
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Booking: <span className="font-mono">{it.booking_ref}</span>
                      </div>
                    )}
                    {it.notes && <div className="mt-1 text-xs text-neutral-600">{it.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
