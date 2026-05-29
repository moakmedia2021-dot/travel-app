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

  const [{ data: trips }, { data: profile }] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    user
      ? supabase.from("profiles").select("full_name, username").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const recentTrips = (trips ?? []) as Trip[];

  const firstName =
    (profile?.full_name?.trim().split(/\s+/)[0]) ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "traveler";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {recentTrips.length === 0
              ? "Time to plan something. Where are we headed?"
              : "Here's what's on the horizon."}
          </p>
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
            <p className="text-sm text-neutral-500">No trips yet — let&apos;s fix that.</p>
            <p className="mt-1 text-sm text-neutral-400">
              Start a trip, invite your people, and get goin&apos;.
            </p>
            <div className="mt-4">
              <NewTripButton label="Plan your first trip" />
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
