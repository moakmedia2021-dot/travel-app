import { createClient } from "@/lib/supabase/server";
import NewTripButton from "@/components/NewTripButton";
import TripCard from "@/components/TripCard";
import type { Trip } from "@/lib/types";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const recentTrips = (trips ?? []) as Trip[];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Welcome back, {user?.email}</p>
        </div>
        <NewTripButton />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Recent trips
          </h2>
          {recentTrips.length > 0 && (
            <Link
              href="/trips"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
            >
              View all →
            </Link>
          )}
        </div>

        {recentTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-500">No trips yet.</p>
            <p className="mt-1 text-sm text-neutral-400">
              Create your first trip to start planning.
            </p>
            <div className="mt-4">
              <NewTripButton label="Create your first trip" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
