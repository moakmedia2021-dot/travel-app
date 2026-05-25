import { createClient } from "@/lib/supabase/server";
import BudgetView from "@/components/budget/BudgetView";
import type { Expense, TripMember } from "@/lib/types";

type TripMemberRow = {
  user_id: string;
  role: TripMember["role"];
  joined_at: string;
  profile: TripMember["profile"] | TripMember["profile"][] | null;
};

export default async function BudgetTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tripRes, membersRes, expensesRes] = await Promise.all([
    supabase
      .from("trips")
      .select("budget_total, currency")
      .eq("id", id)
      .single(),
    supabase
      .from("trip_members")
      .select("user_id, role, joined_at, profile:profiles!user_id(id, username, full_name, avatar_url)")
      .eq("trip_id", id),
    supabase
      .from("expenses")
      .select("*, expense_splits(*)")
      .eq("trip_id", id)
      .order("date", { ascending: false }),
  ]);

  const trip = tripRes.data ?? { budget_total: null, currency: "USD" };

  // Supabase's typegen returns the embedded relation as an array even when it's 1:1.
  // Normalize to a single profile object.
  const members: TripMember[] = ((membersRes.data ?? []) as TripMemberRow[]).map(
    (m) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: Array.isArray(m.profile) ? m.profile[0] : m.profile!,
    })
  );

  const expenses = (expensesRes.data ?? []) as Expense[];

  return (
    <BudgetView
      tripId={id}
      tripCurrency={trip.currency ?? "USD"}
      tripBudget={trip.budget_total != null ? Number(trip.budget_total) : null}
      members={members}
      currentUserId={user?.id ?? ""}
      initialExpenses={expenses}
    />
  );
}
