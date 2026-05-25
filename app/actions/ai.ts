"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateItinerary, hasOpenAIKey, type GeneratedItem } from "@/lib/openai";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function openAIConfigured(): Promise<boolean> {
  return hasOpenAIKey();
}

export async function generateTripItinerary(
  tripId: string,
  freeText: string,
  interests: string[]
): Promise<Result<GeneratedItem[]>> {
  if (!hasOpenAIKey()) return { ok: false, error: "OpenAI not configured" };

  const supabase = await createClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("destination, start_date, end_date, currency, budget_total, travelers")
    .eq("id", tripId)
    .single();
  if (error || !trip) return { ok: false, error: "Trip not found" };

  if (!trip.destination) return { ok: false, error: "Add a destination first" };

  // Day count from trip dates, default 3 days
  let dayCount = 3;
  if (trip.start_date && trip.end_date) {
    const s = new Date(trip.start_date + "T00:00:00").getTime();
    const e = new Date(trip.end_date + "T00:00:00").getTime();
    dayCount = Math.max(1, Math.round((e - s) / 86_400_000) + 1);
  }
  // Cap so we don't burn tokens on month-long trips in one call
  dayCount = Math.min(dayCount, 14);

  try {
    const result = await generateItinerary({
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      dayCount,
      travelers: Math.max(1, trip.travelers ?? 1),
      budgetTotal: trip.budget_total != null ? Number(trip.budget_total) : null,
      currency: trip.currency ?? "USD",
      interests,
      freeText,
    });
    return { ok: true, data: result.items };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed" };
  }
}

// Bulk-insert via existing create_itinerary_item RPC.
// Times are HH:MM strings; combine with trip start_date + day offset.
export async function bulkAddItineraryItems(
  tripId: string,
  items: GeneratedItem[]
): Promise<Result<{ added: number }>> {
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("start_date")
    .eq("id", tripId)
    .single();

  function combineToISO(dayNumber: number, time: string | null): string | null {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const base = trip?.start_date
      ? new Date(trip.start_date + "T00:00:00")
      : new Date();
    base.setDate(base.getDate() + (dayNumber - 1));
    base.setHours(h, m, 0, 0);
    return base.toISOString();
  }

  let added = 0;
  let position = Date.now();
  for (const item of items) {
    const { error } = await supabase.rpc("create_itinerary_item", {
      p_trip_id: tripId,
      p_day_number: item.day_number,
      p_position: position++,
      p_title: item.title,
      p_type: item.type,
      p_start_time: combineToISO(item.day_number, item.start_time),
      p_end_time: combineToISO(item.day_number, item.end_time),
      p_location_name: item.location_name,
      p_price: item.price,
      p_currency: null,
      p_booking_ref: null,
      p_notes: item.notes,
    });
    if (!error) added++;
  }

  if (added === 0) return { ok: false, error: "Couldn't add any items" };
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true, data: { added } };
}
