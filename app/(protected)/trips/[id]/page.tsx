import { createClient } from "@/lib/supabase/server";
import ItineraryView from "@/components/itinerary/ItineraryView";
import type { ItineraryItem, Trip } from "@/lib/types";

export default async function ItineraryTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [tripRes, itemsRes] = await Promise.all([
    supabase.from("trips").select("start_date, end_date").eq("id", id).single(),
    supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", id)
      .order("day_number", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const trip = (tripRes.data ?? { start_date: null, end_date: null }) as Pick<
    Trip,
    "start_date" | "end_date"
  >;
  const items = (itemsRes.data ?? []) as ItineraryItem[];

  return (
    <ItineraryView
      tripId={id}
      startDate={trip.start_date}
      endDate={trip.end_date}
      initialItems={items}
    />
  );
}
