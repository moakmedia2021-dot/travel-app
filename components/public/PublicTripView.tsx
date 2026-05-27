import Link from "next/link";
import type { ItineraryItem, Trip } from "@/lib/types";
import { TYPE_CONFIG } from "@/components/itinerary/typeConfig";
import { formatDateRange } from "@/lib/format";

type Props = {
  trip: Trip;
  ownerName: string;
  ownerUsername: string | null;
  ownerAvatar: string | null;
  memberCount: number;
  items: ItineraryItem[];
};

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeRange(start: string | null, end: string | null): string | null {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return null;
}

export default function PublicTripView({
  trip,
  ownerName,
  ownerUsername,
  ownerAvatar,
  memberCount,
  items,
}: Props) {
  // Group by day
  const days = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    const arr = days.get(item.day_number) ?? [];
    arr.push(item);
    days.set(item.day_number, arr);
  }
  const sortedDays = Array.from(days.entries()).sort(([a], [b]) => a - b);

  function dateForDay(dayNumber: number): string | null {
    if (!trip.start_date) return null;
    const d = new Date(trip.start_date + "T00:00:00");
    d.setDate(d.getDate() + (dayNumber - 1));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-neutral-200 to-neutral-300 sm:aspect-[3/1]">
          {trip.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_image_url}
              alt={trip.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="p-4 sm:p-6">
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-3xl">{trip.title}</h1>
          {trip.destination && (
            <p className="mt-1 text-sm text-neutral-500 sm:text-base">{trip.destination}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            <span className="text-neutral-300">·</span>
            <span>
              {memberCount} traveler{memberCount === 1 ? "" : "s"}
            </span>
          </div>
          {/* Owner credit */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Planned by</span>
            {ownerUsername ? (
              <Link
                href={`/profile/${ownerUsername}`}
                className="inline-flex items-center gap-1.5 font-medium text-neutral-900 hover:underline"
              >
                {ownerAvatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ownerAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                )}
                {ownerName}
              </Link>
            ) : (
              <span className="font-medium text-neutral-900">{ownerName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Itinerary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Itinerary
        </h2>
        {sortedDays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No itinerary items shared yet.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDays.map(([dayNumber, dayItems]) => (
              <div key={dayNumber}>
                <div className="mb-2 flex items-baseline gap-3">
                  <h3 className="text-base font-semibold text-neutral-900">Day {dayNumber}</h3>
                  {dateForDay(dayNumber) && (
                    <span className="text-sm text-neutral-500">{dateForDay(dayNumber)}</span>
                  )}
                </div>
                <div className="ml-0 space-y-2 sm:ml-7 sm:border-l-2 sm:border-neutral-100 sm:pl-4">
                  {dayItems
                    .sort((a, b) => a.position - b.position)
                    .map((item) => {
                      const cfg = TYPE_CONFIG[item.type];
                      const time = timeRange(item.start_time, item.end_time);
                      return (
                        <div
                          key={item.id}
                          className={`flex gap-3 rounded-lg border border-l-4 border-neutral-200 ${cfg.accent} bg-white p-3`}
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}
                          >
                            {cfg.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="truncate text-sm font-semibold text-neutral-900">
                                {item.title}
                              </h4>
                              {time && (
                                <span className="shrink-0 text-xs font-medium text-neutral-500">
                                  {time}
                                </span>
                              )}
                            </div>
                            {item.location_name && (
                              <div className="mt-0.5 truncate text-xs text-neutral-500">
                                📍 {item.location_name}
                              </div>
                            )}
                            {item.notes && (
                              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
