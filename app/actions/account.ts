"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NotificationPrefs } from "@/lib/notificationPrefs";

type R = { ok: true } | { ok: false; error: string };

export async function updateNotificationPrefs(prefs: NotificationPrefs): Promise<R> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: prefs })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteMyAccount(): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
