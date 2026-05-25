import { createClient } from "@/lib/supabase/server";
import DealsView from "@/components/deals/DealsView";
import { hasDuffelKey } from "@/lib/duffel";

export default async function DealsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tripRes, membersRes, expensesRes, profileRes, itemsRes] = await Promise.all([
    supabase
      .from("trips")
      .select("destination, start_date, end_date, currency, budget_total, travelers")
      .eq("id", id)
      .single(),
    supabase.from("trip_members").select("user_id", { count: "exact" }).eq("trip_id", id),
    supabase.from("expenses").select("amount").eq("trip_id", id),
    user
      ? supabase.from("profiles").select("home_airport").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("itinerary_items").select("day_number").eq("trip_id", id),
  ]);

  const trip = tripRes.data;
  const spent = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const memberCount = membersRes.data?.length ?? 1;
  const adults = Math.max(1, trip?.travelers ?? memberCount);
  const maxDay = (itemsRes.data ?? []).reduce(
    (m, i) => Math.max(m, i.day_number as number),
    0
  );
  const homeAirport = (profileRes.data as { home_airport: string | null } | null)?.home_airport ?? null;

  return (
    <DealsView
      tripId={id}
      destination={trip?.destination ?? ""}
      startDate={trip?.start_date ?? null}
      endDate={trip?.end_date ?? null}
      adults={adults}
      currency={trip?.currency ?? "USD"}
      budget={trip?.budget_total != null ? Number(trip.budget_total) : null}
      spent={spent}
      maxDay={maxDay}
      dealsConfigured={hasDuffelKey()}
      homeAirport={homeAirport}
    />
  );
}
