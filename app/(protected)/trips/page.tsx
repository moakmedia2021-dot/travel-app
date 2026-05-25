import { createClient } from "@/lib/supabase/server";
import NewTripButton from "@/components/NewTripButton";
import TripCard from "@/components/TripCard";
import type { Trip } from "@/lib/types";

export default async function TripsPage() {
  const supabase = await createClient();

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  const allTrips = (trips ?? []) as Trip[];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Trips</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {allTrips.length === 0
              ? "Start planning your next adventure"
              : `${allTrips.length} trip${allTrips.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <NewTripButton />
      </div>

      {allTrips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <h2 className="text-base font-medium text-neutral-900">No trips yet</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Plan your first one in under a minute.
          </p>
          <div className="mt-5">
            <NewTripButton label="Create your first trip" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
