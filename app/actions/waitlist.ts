"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";
import { sendWaitlistWelcomeEmail, sendAccessGrantedEmail } from "@/lib/email/waitlist";
import { logger } from "@/lib/logger";

type R<T = void> = (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export async function joinWaitlist(formData: FormData): Promise<R<{ referralCode: string; position: number; alreadyOn: boolean }> | never> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const ref = String(formData.get("ref") ?? "").trim() || null;

  if (!email) return { ok: false, error: "Email is required" };

  // Public RPC — anon key is fine
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("waitlist_join", { p_email: email, p_name: name || null, p_referred_by: ref })
    .single();

  if (error) {
    logger.error("waitlist", "join failed", error, { email });
    return { ok: false, error: error.message };
  }

  const row = data as { referral_code: string; position: number; already_on: boolean };

  if (!row.already_on) {
    await sendWaitlistWelcomeEmail({
      to: email,
      name: name || null,
      position: row.position,
      referralCode: row.referral_code,
    });
  }

  // Always redirect to personal page after submit
  redirect(`/waitlist/${row.referral_code}`);
}

// --- Admin actions ----------------------------------------------------

type AdminCheck = { allowed: true } | { allowed: false; error: string };
async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) return { allowed: false, error: "Not authorized" };
  return { allowed: true };
}

export type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  referral_code: string;
  referred_by: string | null;
  position: number;
  granted_access: boolean;
  access_granted_at: string | null;
  created_at: string;
  referrals_count: number;
};

export async function listWaitlist(): Promise<WaitlistRow[]> {
  const check = await requireAdmin();
  if (!check.allowed) return [];

  const service = createServiceClient();
  const { data, error } = await service
    .from("waitlist")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    logger.error("waitlist", "listWaitlist failed", error);
    return [];
  }

  // Get referrals count per row
  const codes = (data ?? []).map((r) => r.referral_code as string);
  const { data: refRows } = await service
    .from("waitlist")
    .select("referred_by")
    .in("referred_by", codes);

  const counts = new Map<string, number>();
  for (const r of refRows ?? []) {
    if (r.referred_by) counts.set(r.referred_by, (counts.get(r.referred_by) ?? 0) + 1);
  }

  return (data ?? []).map((r) => ({
    ...(r as Omit<WaitlistRow, "referrals_count">),
    referrals_count: counts.get(r.referral_code as string) ?? 0,
  }));
}

export async function grantAccess(waitlistId: string): Promise<R> {
  const check = await requireAdmin();
  if (!check.allowed) return { ok: false, error: check.error };

  const service = createServiceClient();

  const { data: row, error: fetchError } = await service
    .from("waitlist")
    .select("email, name, granted_access")
    .eq("id", waitlistId)
    .single();
  if (fetchError || !row) return { ok: false, error: "Not found" };
  if (row.granted_access) return { ok: false, error: "Already granted" };

  // Generate a magic link via Supabase admin
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: row.email as string,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
  });
  if (linkError || !linkData?.properties?.action_link) {
    logger.error("waitlist", "magic link generate failed", linkError, { waitlistId });
    return { ok: false, error: linkError?.message ?? "Could not generate access link" };
  }

  await sendAccessGrantedEmail({
    to: row.email as string,
    name: (row.name as string | null) ?? null,
    magicLink: linkData.properties.action_link,
  });

  const { error: updateError } = await service
    .from("waitlist")
    .update({ granted_access: true, access_granted_at: new Date().toISOString() })
    .eq("id", waitlistId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/admin/waitlist");
  return { ok: true };
}

export async function grantTopN(n: number): Promise<R<{ granted: number }>> {
  const check = await requireAdmin();
  if (!check.allowed) return { ok: false, error: check.error };
  if (n <= 0 || n > 500) return { ok: false, error: "n must be 1-500" };

  const service = createServiceClient();
  const { data: rows } = await service
    .from("waitlist")
    .select("id")
    .eq("granted_access", false)
    .order("position", { ascending: true })
    .limit(n);

  let granted = 0;
  for (const r of rows ?? []) {
    const result = await grantAccess(r.id as string);
    if (result.ok) granted++;
  }
  revalidatePath("/admin/waitlist");
  return { ok: true, data: { granted } };
}
