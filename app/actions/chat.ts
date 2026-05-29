"use server";

import { createClient } from "@/lib/supabase/server";

export type TripMessage = {
  id: string;
  trip_id: string;
  user_id: string | null;
  content: string;
  type: "text" | "system";
  created_at: string;
};

type R<T = void> = (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export async function sendTripMessage(
  tripId: string,
  content: string
): Promise<R<string>> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Message can't be empty" };
  if (text.length > 4000) return { ok: false, error: "Message too long" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_trip_message", {
    p_trip_id: tripId,
    p_content: text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as string };
}

export async function listTripMessages(
  tripId: string,
  limit = 100
): Promise<TripMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_messages")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as TripMessage[]).reverse();
}
