"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DiscoverTraveler } from "@/lib/types";

type R<T = void> = (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export async function followUser(targetId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("follow_user", { p_target: targetId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unfollowUser(targetId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unfollow_user", { p_target: targetId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function sendConnectionRequest(
  targetId: string,
  message: string | null
): Promise<R<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_connection_request", {
    p_target: targetId,
    p_message: message,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: data as string };
}

export async function respondConnection(
  connectionId: string,
  accept: boolean
): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_connection_request", {
    p_connection_id: connectionId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelConnection(connectionId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_connection_request", {
    p_connection_id: connectionId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeConnection(otherId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_connection", { p_other: otherId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function discoverTravelers(): Promise<R<DiscoverTraveler[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("discover_travelers");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as DiscoverTraveler[] };
}
