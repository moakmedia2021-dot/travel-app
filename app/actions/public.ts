"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function copyTrip(sourceTripId: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_trip", {
    p_source_trip_id: sourceTripId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true, data: data as string };
}
