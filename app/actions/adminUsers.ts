"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAdmin, isEnvAdmin, listGrantedAdminIds } from "@/lib/admin";
import { logger } from "@/lib/logger";

type R<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const PATH = "/admin/users";

export type PremiumPlan = "month" | "year" | "lifetime" | "revoke";

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_verified: boolean;
  banned: boolean;
  is_premium: boolean;
  subscription_status: "free" | "premium" | "cancelled";
  subscription_period_end: string | null;
  onboarding_complete: boolean;
  deleted: boolean;
  is_admin: boolean;
  is_env_admin: boolean; // root admin from env — can't be revoked in the UI
};

// Admin gate + the current admin's own id (so we can block self-destructive ops).
async function requireAdmin(): Promise<{ ok: true; adminId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await checkAdmin(user.id))) return { ok: false, error: "Not authorized" };
  return { ok: true, adminId: user.id };
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  subscription_status: AdminUser["subscription_status"] | null;
  subscription_period_end: string | null;
  onboarding_complete: boolean | null;
  deleted_at: string | null;
};

export type ListUsersResult =
  | { ok: true; users: AdminUser[] }
  | { ok: false; error: string };

export async function listUsers(): Promise<ListUsersResult> {
  const check = await requireAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment to load user accounts.",
    };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Service client unavailable" };
  }

  // Pull every auth user (paginated). 200/page, hard stop at 50 pages (10k users).
  const authUsers: {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
  }[] = [];
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      logger.error("adminUsers", "listUsers auth failed", error);
      if (page === 1) return { ok: false, error: error.message };
      break;
    }
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: (u.email_confirmed_at ?? (u as { confirmed_at?: string }).confirmed_at) ?? null,
        banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
      });
    }
    if (data.users.length < perPage) break;
  }

  // Profiles for plan + display info.
  const { data: profileData } = await service
    .from("profiles")
    .select(
      "id, full_name, username, avatar_url, subscription_status, subscription_period_end, onboarding_complete, deleted_at"
    );
  const profiles = new Map<string, ProfileRow>(
    ((profileData ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  const grantedAdmins = new Set(await listGrantedAdminIds());

  const now = Date.now();
  const users = authUsers
    .map((u): AdminUser => {
      const p = profiles.get(u.id);
      const periodEnd = p?.subscription_period_end ?? null;
      const isPremium = !!periodEnd && new Date(periodEnd).getTime() > now;
      const banned = !!u.banned_until && new Date(u.banned_until).getTime() > now;
      return {
        id: u.id,
        email: u.email,
        full_name: p?.full_name ?? null,
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_verified: !!u.email_confirmed_at,
        banned,
        is_premium: isPremium,
        subscription_status: p?.subscription_status ?? "free",
        subscription_period_end: periodEnd,
        onboarding_complete: !!p?.onboarding_complete,
        deleted: !!p?.deleted_at,
        is_admin: isEnvAdmin(u.id) || grantedAdmins.has(u.id),
        is_env_admin: isEnvAdmin(u.id),
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return { ok: true, users };
}

export async function verifyUserEmail(userId: string): Promise<R> {
  const check = await requireAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

export async function setUserPremium(userId: string, plan: PremiumPlan): Promise<R> {
  const check = await requireAdmin();
  if (!check.ok) return { ok: false, error: check.error };

  const service = createServiceClient();

  let status: AdminUser["subscription_status"] = "premium";
  let periodEnd: string | null = null;
  const now = new Date();

  if (plan === "revoke") {
    status = "free";
    periodEnd = null;
  } else {
    const d = new Date(now);
    if (plan === "month") d.setMonth(d.getMonth() + 1);
    else if (plan === "year") d.setFullYear(d.getFullYear() + 1);
    else if (plan === "lifetime") d.setFullYear(d.getFullYear() + 100);
    periodEnd = d.toISOString();
  }

  const { error } = await service
    .from("profiles")
    .update({ subscription_status: status, subscription_period_end: periodEnd })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}

export async function setUserBanned(userId: string, banned: boolean): Promise<R> {
  const check = await requireAdmin();
  if (!check.ok) return { ok: false, error: check.error };
  if (banned && userId === check.adminId) {
    return { ok: false, error: "You can't ban your own admin account" };
  }

  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876600h" : "none", // ~100 years / lifted
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true };
}
