"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAdmin } from "@/lib/admin";
import type {
  AccountInput,
  ClientInput,
  UgcAccount,
  UgcClient,
  UgcVideo,
  VideoInput,
} from "@/lib/ugc/types";

type R<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const PATH = "/admin/ugc";

async function adminCtx(): Promise<{ supabase: ReturnType<typeof createServiceClient>; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await checkAdmin(user.id))) return null;
  return { supabase: createServiceClient(), userId: user.id };
}

// ----- Clients ----------------------------------------------------------
export async function listClients(): Promise<UgcClient[]> {
  const ctx = await adminCtx();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("ugc_clients")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("status")
    .order("name");
  return (data ?? []) as UgcClient[];
}

export async function getClient(
  id: string
): Promise<{ client: UgcClient; accounts: UgcAccount[]; videos: UgcVideo[] } | null> {
  const ctx = await adminCtx();
  if (!ctx) return null;
  const [{ data: client }, { data: accounts }, { data: videos }] = await Promise.all([
    ctx.supabase.from("ugc_clients").select("*").eq("id", id).eq("user_id", ctx.userId).single(),
    ctx.supabase.from("ugc_accounts").select("*").eq("client_id", id).order("platform"),
    ctx.supabase
      .from("ugc_videos")
      .select("*")
      .eq("client_id", id)
      .order("scheduled_for", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!client) return null;
  return {
    client: client as UgcClient,
    accounts: (accounts ?? []) as UgcAccount[],
    videos: (videos ?? []) as UgcVideo[],
  };
}

export async function saveClient(input: ClientInput): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const row = {
    user_id: ctx.userId,
    name: input.name.trim(),
    email: input.email,
    phone: input.phone,
    status: input.status,
    rate: input.rate,
    rate_period: input.rate_period,
    currency: input.currency || "USD",
    color: input.color,
    notes: input.notes,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await ctx.supabase
      .from("ugc_clients")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true, data: input.id };
  }
  const { data, error } = await ctx.supabase.from("ugc_clients").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: (data as { id: string }).id };
}

export async function deleteClient(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase.from("ugc_clients").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Accounts ---------------------------------------------------------
export async function saveAccount(input: AccountInput): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const row = {
    user_id: ctx.userId,
    client_id: input.client_id,
    platform: input.platform,
    handle: input.handle,
    url: input.url,
    login_email: input.login_email,
    login_password: input.login_password,
    notes: input.notes,
  };

  if (input.id) {
    const { error } = await ctx.supabase
      .from("ugc_accounts")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true, data: input.id };
  }
  const { data, error } = await ctx.supabase.from("ugc_accounts").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: (data as { id: string }).id };
}

export async function deleteAccount(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase.from("ugc_accounts").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Videos -----------------------------------------------------------
export async function listVideos(): Promise<UgcVideo[]> {
  const ctx = await adminCtx();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("ugc_videos")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as UgcVideo[];
}

export async function saveVideo(input: VideoInput): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  const row = {
    user_id: ctx.userId,
    client_id: input.client_id,
    account_id: input.account_id,
    title: input.title.trim(),
    platform: input.platform,
    status: input.status,
    scheduled_for: input.scheduled_for,
    posted_on: input.posted_on,
    url: input.url,
    notes: input.notes,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await ctx.supabase
      .from("ugc_videos")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true, data: input.id };
  }
  const { data, error } = await ctx.supabase.from("ugc_videos").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: (data as { id: string }).id };
}

export async function deleteVideo(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase.from("ugc_videos").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}
