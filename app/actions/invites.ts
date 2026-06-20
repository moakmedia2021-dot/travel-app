"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendInviteEmail } from "@/lib/email";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://getgoin.app").replace(/\/$/, "");
}

export type InvitableConnection = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export async function listInvitableConnections(
  tripId: string
): Promise<InvitableConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invitable_connections", {
    p_trip_id: tripId,
  });
  if (error) {
    console.error("[listInvitableConnections]", error);
    return [];
  }
  return (data ?? []) as InvitableConnection[];
}

export async function inviteConnectionToTrip(
  tripId: string,
  userId: string,
  role: "editor" | "viewer"
): Promise<Result<{ id: string; token: string; url: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("invite_connection_to_trip", {
      p_trip_id: tripId,
      p_user_id: userId,
      p_role: role,
    })
    .single();
  if (error) return { ok: false, error: error.message };
  const row = data as { id: string; token: string };
  const url = `${siteUrl()}/invite/${row.token}`;

  // Best-effort email (the email is invisible to the inviter — only used
  // by the email service if configured).
  try {
    const [{ data: inviter }, { data: trip }] = await Promise.all([
      supabase.auth.getUser().then((r) => ({ data: r.data.user })),
      supabase.from("trips").select("title").eq("id", tripId).single(),
    ]);
    const { data: emailRow } = await supabase
      .from("trip_invites")
      .select("email")
      .eq("id", row.id)
      .single();
    const inviterName =
      inviter?.user_metadata?.full_name || inviter?.email || "A friend";
    if (emailRow?.email) {
      await sendInviteEmail({
        to: emailRow.email,
        inviterName,
        tripTitle: trip?.title ?? "a trip",
        inviteUrl: url,
      });
    }
  } catch (e) {
    console.error("[inviteConnectionToTrip] email send failed", e);
  }

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: { id: row.id, token: row.token, url } };
}

export type MyPendingInvite = {
  invite_id: string;
  token: string;
  role: "editor" | "viewer";
  created_at: string;
  trip_id: string;
  trip_title: string;
  trip_destination: string | null;
  trip_start_date: string | null;
  trip_end_date: string | null;
  inviter_name: string;
  inviter_username: string | null;
  inviter_avatar_url: string | null;
};

export async function listMyPendingInvites(): Promise<MyPendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_pending_invites");
  if (error) {
    console.error("[listMyPendingInvites]", error);
    return [];
  }
  return (data ?? []) as MyPendingInvite[];
}

export async function acceptInviteById(
  inviteId: string
): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite_by_id", {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/connections");
  revalidatePath("/trips");
  return { ok: true, data: data as string };
}

export async function declineInviteById(inviteId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invite_by_id", {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/connections");
  return { ok: true };
}

/** @deprecated kept for /invite/[token] backward compat — UI uses inviteConnectionToTrip */
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
