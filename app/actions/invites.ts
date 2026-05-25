"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendInviteEmail } from "@/lib/email";
import type { InvitableUser } from "@/lib/types";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function searchInvitableUsers(
  tripId: string,
  query: string
): Promise<InvitableUser[]> {
  if (query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_invitable_users", {
    p_trip_id: tripId,
    p_query: query.trim(),
  });
  if (error) {
    console.error("[searchInvitableUsers]", error);
    return [];
  }
  return (data ?? []) as InvitableUser[];
}

export async function createInvite(
  tripId: string,
  email: string,
  role: "editor" | "viewer"
): Promise<Result<{ id: string; token: string; url: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("create_invite", {
      p_trip_id: tripId,
      p_email: email,
      p_role: role,
    })
    .single();

  if (error) return { ok: false, error: error.message };
  const row = data as { id: string; token: string };
  const url = `${siteUrl()}/invite/${row.token}`;

  // Best-effort email send. We need inviter + trip title for the body.
  const [{ data: inviter }, { data: trip }] = await Promise.all([
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
    supabase.from("trips").select("title").eq("id", tripId).single(),
  ]);
  const inviterName =
    inviter?.user_metadata?.full_name || inviter?.email || "A friend";

  await sendInviteEmail({
    to: email,
    inviterName,
    tripTitle: trip?.title ?? "a trip",
    inviteUrl: url,
  });

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: { id: row.id, token: row.token, url } };
}

export async function cancelInvite(
  tripId: string,
  inviteId: string
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_invite", { p_invite_id: inviteId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}

export async function acceptInvite(token: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trips");
  return { ok: true, data: data as string };
}

export async function declineInvite(token: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invite", { p_token: token });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
