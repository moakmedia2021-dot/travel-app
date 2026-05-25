"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TripVisibility } from "@/lib/types";

export type CreateTripInput = {
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  travelers: number | null;
  visibility: TripVisibility;
  budgetTotal: number | null;
  currency: string | null;
};

export type CreateTripResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Trip name is required" };

  const { data: tripId, error } = await supabase.rpc("create_trip", {
    p_title: title,
    p_destination: input.destination?.trim() || null,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_travelers: input.travelers,
    p_visibility: input.visibility,
    p_budget_total: input.budgetTotal,
    p_currency: input.currency,
  });

  if (error) return { ok: false, error: error.message };

  // The on_trip_created trigger auto-adds the owner to trip_members.
  revalidatePath("/trips");
  revalidatePath("/dashboard");

  return { ok: true, id: tripId as string };
}
