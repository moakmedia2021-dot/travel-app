"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DiscoverTraveler, Profile, ConnectionStatus } from "@/lib/types";

type R<T = void> = (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export type FindUserResult = {
  profile: Profile;
  isMe: boolean;
  isFollowing: boolean;
  connectionStatus: ConnectionStatus | null;
};

/**
 * Look up a user by an EXACT username match (case-insensitive).
 * Returns null if no exact hit — no fuzzy results on purpose.
 */
export async function findUserByExactUsername(
  rawUsername: string
): Promise<FindUserResult | null> {
  const username = rawUsername.trim().toLowerCase().replace(/^@/, "");
  if (!username || !/^[a-z0-9_]{3,32}$/.test(username)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, home_city")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;

  const isMe = profile.id === user.id;

  if (isMe) {
    return { profile: profile as Profile, isMe, isFollowing: false, connectionStatus: null };
  }

  const [followRes, connRes] = await Promise.all([
    supabase
      .from("social_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle(),
    supabase
      .from("social_connections")
      .select("status, requester_id, addressee_id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: profile as Profile,
    isMe,
    isFollowing: !!followRes.data,
    connectionStatus: (connRes.data?.status ?? null) as ConnectionStatus | null,
  };
}

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
