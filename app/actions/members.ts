"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

export async function updateMemberRole(
  tripId: string,
  userId: string,
  role: "editor" | "viewer"
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_trip_id: tripId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}

export async function removeMember(
  tripId: string,
  userId: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_trip_id: tripId,
    p_user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}
