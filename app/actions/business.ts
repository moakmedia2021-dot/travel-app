"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAdmin } from "@/lib/admin";
import { generateVideoContent, generateContractBody } from "@/lib/business/ai";
import type {
  Activity,
  ActivityKind,
  BusinessDocument,
  Collaboration,
  CollaborationInput,
  DocType,
  DocumentContent,
  VideoContent,
  VideoPlatform,
} from "@/lib/business/types";

type R<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const PATH = "/admin/business";

async function adminCtx(): Promise<{ supabase: ReturnType<typeof createServiceClient>; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await checkAdmin(user.id))) return null;
  return { supabase: createServiceClient(), userId: user.id };
}

// ----- Collaborations ---------------------------------------------------
export async function listCollaborations(
  search?: string,
  status?: string
): Promise<Collaboration[]> {
  const ctx = await adminCtx();
  if (!ctx) return [];
  let q = ctx.supabase
    .from("crm_collaborations")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(
      `name.ilike.${s},property_name.ilike.${s},location.ilike.${s},email.ilike.${s},instagram.ilike.${s}`
    );
  }
  const { data } = await q;
  return (data ?? []) as Collaboration[];
}

export async function getCollaboration(
  id: string
): Promise<{ collab: Collaboration; activities: Activity[]; documents: BusinessDocument[] } | null> {
  const ctx = await adminCtx();
  if (!ctx) return null;
  const [{ data: collab }, { data: activities }, { data: documents }] = await Promise.all([
    ctx.supabase.from("crm_collaborations").select("*").eq("id", id).eq("user_id", ctx.userId).single(),
    ctx.supabase
      .from("crm_activities")
      .select("*")
      .eq("collaboration_id", id)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("crm_documents")
      .select("*")
      .eq("collaboration_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!collab) return null;
  return {
    collab: collab as Collaboration,
    activities: (activities ?? []) as Activity[],
    documents: (documents ?? []) as BusinessDocument[],
  };
}

export async function saveCollaboration(input: CollaborationInput): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const row = {
    user_id: ctx.userId,
    name: input.name.trim(),
    property_name: input.property_name,
    property_url: input.property_url,
    location: input.location,
    email: input.email,
    phone: input.phone,
    instagram: input.instagram,
    status: input.status,
    deal_value: input.deal_value,
    currency: input.currency || "USD",
    rate_type: input.rate_type,
    start_date: input.start_date,
    end_date: input.end_date,
    notes: input.notes,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await ctx.supabase
      .from("crm_collaborations")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true, data: input.id };
  }

  const { data, error } = await ctx.supabase
    .from("crm_collaborations")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: (data as { id: string }).id };
}

export async function deleteCollaboration(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase
    .from("crm_collaborations")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- Activities -------------------------------------------------------
export async function addActivity(
  collaborationId: string,
  kind: ActivityKind,
  body: string
): Promise<R<Activity>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { data, error } = await ctx.supabase
    .from("crm_activities")
    .insert({ user_id: ctx.userId, collaboration_id: collaborationId, kind, body: body.trim() || null })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: data as Activity };
}

export async function deleteActivity(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase.from("crm_activities").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

// ----- AI content studio ------------------------------------------------
export async function generateContent(args: {
  property: string;
  location: string;
  platform: VideoPlatform;
  vibe: string;
  notes: string;
}): Promise<R<VideoContent>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  try {
    const data = await generateVideoContent(args);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed" };
  }
}

// ----- Documents (contracts / invoices) --------------------------------
export async function listDocuments(): Promise<BusinessDocument[]> {
  const ctx = await adminCtx();
  if (!ctx) return [];
  const { data } = await ctx.supabase
    .from("crm_documents")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as BusinessDocument[];
}

async function nextInvoiceNumber(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("crm_documents")
    .select("number")
    .eq("user_id", userId)
    .eq("type", "invoice")
    .not("number", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  let max = 0;
  for (const r of (data ?? []) as { number: string | null }[]) {
    const m = r.number?.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const year = new Date().getFullYear();
  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}

export async function saveDocument(input: {
  id?: string | null;
  collaboration_id: string | null;
  type: DocType;
  title: string;
  content: DocumentContent;
  total: number | null;
  status?: BusinessDocument["status"];
}): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };

  const base = {
    user_id: ctx.userId,
    collaboration_id: input.collaboration_id,
    type: input.type,
    title: input.title.trim() || (input.type === "invoice" ? "Invoice" : "Contract"),
    content: input.content,
    total: input.total,
    status: input.status ?? "draft",
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await ctx.supabase
      .from("crm_documents")
      .update(base)
      .eq("id", input.id)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(PATH);
    return { ok: true, data: input.id };
  }

  const number = input.type === "invoice" ? await nextInvoiceNumber(ctx.supabase, ctx.userId) : null;
  const { data, error } = await ctx.supabase
    .from("crm_documents")
    .insert({ ...base, number })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, data: (data as { id: string }).id };
}

export async function deleteDocument(id: string): Promise<R> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  const { error } = await ctx.supabase.from("crm_documents").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

export async function draftContract(args: {
  creatorName: string;
  businessName: string;
  hostName: string;
  property: string;
  location: string;
  deliverables: string;
  compensation: string;
  timeline: string;
}): Promise<R<string>> {
  const ctx = await adminCtx();
  if (!ctx) return { ok: false, error: "forbidden" };
  try {
    const body = await generateContractBody(args);
    return { ok: true, data: body };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Draft failed" };
  }
}
