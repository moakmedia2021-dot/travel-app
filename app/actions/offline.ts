"use server";

import { createClient } from "@/lib/supabase/server";
import type { ItineraryItem, Trip } from "@/lib/types";
import type { OfflineMember, TripBundle } from "@/lib/offline/types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

type MemberRow = {
  user_id: string;
  role: OfflineMember["role"];
  profile:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
};

// Gather everything needed to view a trip offline. RLS ensures only members
// (or public-trip viewers) get data back.
export async function getTripBundle(tripId: string): Promise<R<TripBundle>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to download a trip." };

  const [tripRes, itemsRes, membersRes] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).single(),
    supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("trip_members")
      .select("user_id, role, profile:profiles!user_id(full_name, username)")
      .eq("trip_id", tripId),
  ]);

  if (tripRes.error || !tripRes.data) {
    return { ok: false, error: "Couldn't load this trip." };
  }

  const members: OfflineMember[] = ((membersRes.data ?? []) as MemberRow[]).map((m) => {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return {
      user_id: m.user_id,
      role: m.role,
      name: p?.full_name || p?.username || "Someone",
      username: p?.username ?? null,
    };
  });

  return {
    ok: true,
    data: {
      trip: tripRes.data as Trip,
      items: (itemsRes.data ?? []) as ItineraryItem[],
      members,
      saved_at: new Date().toISOString(),
    },
  };
}
