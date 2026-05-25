"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  searchFlights as duffelSearchFlights,
  searchHotels as duffelSearchHotels,
  searchLocations as duffelSearchLocations,
  hasDuffelKey,
  DuffelError,
  type FlightOffer,
  type HotelOffer,
  type DuffelPlace,
} from "@/lib/duffel";
import { searchActivities as searchMockActivities, type Activity } from "@/lib/mockActivities";
import { searchMockHotels } from "@/lib/mockHotels";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function mapError(e: unknown): string {
  if (e instanceof DuffelError) {
    if (e.status === 429) return "Hit Duffel rate limit. Wait a minute and try again.";
    if (e.status === 401) return "Duffel token invalid. Check your DUFFEL_TOKEN.";
    return `Search failed (${e.status || "network"}).`;
  }
  return e instanceof Error ? e.message : "Unknown error";
}

export async function checkDealsConfigured(): Promise<boolean> {
  return hasDuffelKey();
}

export async function searchLocationSuggestions(query: string): Promise<DuffelPlace[]> {
  if (!hasDuffelKey()) return [];
  try {
    return await duffelSearchLocations(query);
  } catch (e) {
    console.error("[searchLocationSuggestions]", e);
    return [];
  }
}

export async function searchFlightsAction(args: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currencyCode?: string;
}): Promise<Result<FlightOffer[]>> {
  if (!hasDuffelKey()) return { ok: false, error: "Duffel not configured" };
  try {
    const offers = await duffelSearchFlights(args);
    return { ok: true, data: offers };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}

export async function searchHotelsAction(args: {
  latitude: number;
  longitude: number;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  cityLabel?: string;
  currency?: string;
}): Promise<Result<HotelOffer[]>> {
  // Try real Duffel Stays. If the account doesn't have Stays enabled (403),
  // fall back to mock so the UI still works.
  if (hasDuffelKey()) {
    try {
      const offers = await duffelSearchHotels(args);
      return { ok: true, data: offers };
    } catch (e) {
      if (!(e instanceof DuffelError) || (e.status !== 403 && e.status !== 404)) {
        return { ok: false, error: mapError(e) };
      }
      // 403/404 → Stays not enabled. Fall through to mock.
    }
  }
  const data = searchMockHotels({
    city: args.cityLabel ?? "",
    checkInDate: args.checkInDate,
    checkOutDate: args.checkOutDate,
    currency: args.currency ?? "USD",
  });
  return { ok: true, data };
}

export async function searchActivitiesAction(destination: string): Promise<Result<Activity[]>> {
  return { ok: true, data: searchMockActivities(destination) };
}

// ------- Add-to-trip actions --------

async function getTripContext(tripId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [tripRes, membersRes, itemsRes] = await Promise.all([
    supabase.from("trips").select("start_date, currency").eq("id", tripId).single(),
    supabase.from("trip_members").select("user_id").eq("trip_id", tripId),
    supabase.from("itinerary_items").select("day_number").eq("trip_id", tripId),
  ]);

  const trip = tripRes.data;
  const memberIds = (membersRes.data ?? []).map((m) => m.user_id);
  const maxDay = (itemsRes.data ?? []).reduce(
    (m, i) => Math.max(m, i.day_number as number),
    0
  );

  return { supabase, userId: user.id, trip, memberIds, maxDay };
}

function dayFromTripStart(startDate: string | null | undefined, date: string): number {
  if (!startDate) return 1;
  const s = new Date(startDate + "T00:00:00").getTime();
  const d = new Date(date + "T00:00:00").getTime();
  return Math.max(1, Math.round((d - s) / 86_400_000) + 1);
}

function splitEqual(amount: number, memberIds: string[]): { user_id: string; amount_owed: number }[] {
  if (memberIds.length === 0) return [];
  const per = Math.round((amount / memberIds.length) * 100) / 100;
  const rem = Math.round((amount - per * memberIds.length) * 100) / 100;
  return memberIds.map((id, i) => ({
    user_id: id,
    amount_owed: i === 0 ? Math.round((per + rem) * 100) / 100 : per,
  }));
}

export async function addFlightToTrip(
  tripId: string,
  offer: FlightOffer,
  args: { origin: string; destination: string; departureDate: string }
): Promise<Result<{ itineraryId: string }>> {
  try {
    const { supabase, userId, trip, memberIds } = await getTripContext(tripId);
    const day = dayFromTripStart(trip?.start_date ?? null, args.departureDate);

    const title = `Flight ${args.origin} → ${args.destination}`;
    const firstSeg = offer.outbound[0];
    const lastSeg = offer.outbound[offer.outbound.length - 1];

    const itin = await supabase.rpc("create_itinerary_item", {
      p_trip_id: tripId,
      p_day_number: day,
      p_position: Date.now(),
      p_title: title,
      p_type: "flight",
      p_start_time: firstSeg?.departure?.at ?? null,
      p_end_time: lastSeg?.arrival?.at ?? null,
      p_location_name: `${args.origin} → ${args.destination}`,
      p_price: offer.totalPrice,
      p_currency: offer.currency,
      p_booking_ref: null,
      p_notes: `Airlines: ${offer.airlineCodes.join(", ")} • ${offer.stops} stop(s)`,
    });
    if (itin.error) return { ok: false, error: itin.error.message };

    const exp = await supabase.rpc("create_expense", {
      p_trip_id: tripId,
      p_title: title,
      p_amount: offer.totalPrice,
      p_currency: offer.currency,
      p_category: "transport",
      p_date: args.departureDate,
      p_paid_by: userId,
      p_split_type: "equal",
      p_split_user_ids: memberIds,
      p_split_amounts: splitEqual(offer.totalPrice, memberIds).map((s) => s.amount_owed),
    });
    if (exp.error) return { ok: false, error: exp.error.message };

    revalidatePath(`/trips/${tripId}`, "layout");
    return { ok: true, data: { itineraryId: itin.data as string } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add" };
  }
}

export async function addHotelToTrip(
  tripId: string,
  offer: HotelOffer,
  args: { checkInDate: string; checkOutDate: string }
): Promise<Result<{ itineraryId: string }>> {
  try {
    const { supabase, userId, trip, memberIds } = await getTripContext(tripId);
    const day = dayFromTripStart(trip?.start_date ?? null, args.checkInDate);

    const itin = await supabase.rpc("create_itinerary_item", {
      p_trip_id: tripId,
      p_day_number: day,
      p_position: Date.now(),
      p_title: offer.name,
      p_type: "hotel",
      p_start_time: new Date(args.checkInDate + "T15:00:00").toISOString(),
      p_end_time: new Date(args.checkOutDate + "T11:00:00").toISOString(),
      p_location_name: offer.cityCode || null,
      p_price: offer.totalPrice,
      p_currency: offer.currency,
      p_booking_ref: null,
      p_notes: `${offer.nights} nights · ${offer.rating ?? "—"}★`,
    });
    if (itin.error) return { ok: false, error: itin.error.message };

    const exp = await supabase.rpc("create_expense", {
      p_trip_id: tripId,
      p_title: offer.name,
      p_amount: offer.totalPrice,
      p_currency: offer.currency,
      p_category: "accommodation",
      p_date: args.checkInDate,
      p_paid_by: userId,
      p_split_type: "equal",
      p_split_user_ids: memberIds,
      p_split_amounts: splitEqual(offer.totalPrice, memberIds).map((s) => s.amount_owed),
    });
    if (exp.error) return { ok: false, error: exp.error.message };

    revalidatePath(`/trips/${tripId}`, "layout");
    return { ok: true, data: { itineraryId: itin.data as string } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add" };
  }
}

export async function addActivityToTrip(
  tripId: string,
  activity: Activity,
  dayNumber: number
): Promise<Result<{ itineraryId: string }>> {
  try {
    const { supabase, userId, memberIds } = await getTripContext(tripId);

    const itin = await supabase.rpc("create_itinerary_item", {
      p_trip_id: tripId,
      p_day_number: dayNumber,
      p_position: Date.now(),
      p_title: activity.title,
      p_type: "activity",
      p_start_time: null,
      p_end_time: null,
      p_location_name: null,
      p_price: activity.price,
      p_currency: activity.currency,
      p_booking_ref: null,
      p_notes: `${activity.durationHours}h · ${activity.rating}★`,
    });
    if (itin.error) return { ok: false, error: itin.error.message };

    const exp = await supabase.rpc("create_expense", {
      p_trip_id: tripId,
      p_title: activity.title,
      p_amount: activity.price,
      p_currency: activity.currency,
      p_category: "activities",
      p_date: new Date().toISOString().slice(0, 10),
      p_paid_by: userId,
      p_split_type: "equal",
      p_split_user_ids: memberIds,
      p_split_amounts: splitEqual(activity.price, memberIds).map((s) => s.amount_owed),
    });
    if (exp.error) return { ok: false, error: exp.error.message };

    revalidatePath(`/trips/${tripId}`, "layout");
    return { ok: true, data: { itineraryId: itin.data as string } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add" };
  }
}
