import type { Trip, TripStatus } from "@/lib/types";
import { formatDateRange } from "@/lib/format";
import CoverPhotoButton from "@/components/photos/CoverPhotoButton";

const statusStyles: Record<TripStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  planned: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-neutral-200 text-neutral-600",
};

export default function TripHeader({
  trip,
  compact = false,
}: {
  trip: Trip;
  compact?: boolean;
}) {
  const Wrapper = compact ? "div" : "div";
  const wrapperClass = compact
    ? ""
    : "overflow-hidden rounded-xl border border-neutral-200 bg-white";

  return (
    <Wrapper className={wrapperClass}>
      <div className="group relative aspect-[16/9] w-full bg-gradient-to-br from-neutral-200 to-neutral-300 sm:aspect-[3/1]">
        {trip.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_image_url}
            alt={trip.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            <svg className="h-14 w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
        <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
          <CoverPhotoButton
            tripId={trip.id}
            destination={trip.destination ?? ""}
            hasCover={!!trip.cover_image_url}
          />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">{trip.title}</h1>
            {trip.destination && (
              <p className="mt-0.5 text-sm text-neutral-500">{trip.destination}</p>
            )}
            <p className="mt-1.5 text-sm text-neutral-600">
              {formatDateRange(trip.start_date, trip.end_date)}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[trip.status]}`}
          >
            {trip.status}
          </span>
        </div>
      </div>
    </Wrapper>
  );
}
