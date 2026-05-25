"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ItineraryType } from "@/lib/types";

export type ItineraryInput = {
  title: string;
  type: ItineraryType;
  day_number: number;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  price: number | null;
  currency: string | null;
  booking_ref: string | null;
  notes: string | null;
};

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function createItineraryItem(
  tripId: string,
  position: number,
  input: ItineraryInput
): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_itinerary_item", {
    p_trip_id: tripId,
    p_day_number: input.day_number,
    p_position: position,
    p_title: input.title.trim(),
    p_type: input.type,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_location_name: input.location_name?.trim() || null,
    p_price: input.price,
    p_currency: input.currency,
    p_booking_ref: input.booking_ref?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: data as string };
}

export async function updateItineraryItem(
  tripId: string,
  itemId: string,
  input: ItineraryInput
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_itinerary_item", {
    p_id: itemId,
    p_day_number: input.day_number,
    p_title: input.title.trim(),
    p_type: input.type,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_location_name: input.location_name?.trim() || null,
    p_price: input.price,
    p_currency: input.currency,
    p_booking_ref: input.booking_ref?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function deleteItineraryItem(
  tripId: string,
  itemId: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_itinerary_item", {
    p_id: itemId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function reorderItineraryItems(
  tripId: string,
  dayNumber: number,
  orderedIds: string[]
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_itinerary_items", {
    p_trip_id: tripId,
    p_day_number: dayNumber,
    p_ordered_ids: orderedIds,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}
