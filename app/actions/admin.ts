"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAdmin, isEnvAdmin } from "@/lib/admin";

// Default password kept in code per request. Override with
// ADMIN_PORTAL_PASSWORD env var if you want to rotate without redeploying.
const ADMIN_PORTAL_PASSWORD = process.env.ADMIN_PORTAL_PASSWORD || "moakmedia21";

const COOKIE_NAME = "admin_unlocked";
const COOKIE_TTL_HOURS = 24;

/**
 * Server action used from the PasswordGate form.
 * - Returns `{ error }` on wrong password / no admin.
 * - On success, sets the cookie then redirects so the page re-renders
 *   with the cookie attached (more reliable than client-side refresh).
 */
export async function unlockAdminPortal(
  password: string
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await checkAdmin(user?.id))) {
    return { error: "Not found" };
  }

  if (password !== ADMIN_PORTAL_PASSWORD) {
    return { error: "Incorrect password" };
  }

  const store = await cookies();
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * COOKIE_TTL_HOURS,
    path: "/",
  });

  redirect("/admin/analytics");
}

export async function lockAdminPortal() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/admin/analytics");
}

export async function isAdminUnlocked(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

// --- Grantable admin access -------------------------------------------------

type AdminResult = { ok: true } | { ok: false; error: string };

async function currentAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (await checkAdmin(user.id)) ? user.id : null;
}

/**
 * Grant admin access to another user. Requires:
 *  - the caller to already be an admin, AND
 *  - the admin portal password (so it can't be triggered without an explicit
 *    password confirmation).
 */
export async function grantAdmin(targetUserId: string, password: string): Promise<AdminResult> {
  const callerId = await currentAdminId();
  if (!callerId) return { ok: false, error: "Not authorized" };
  if (password !== ADMIN_PORTAL_PASSWORD) return { ok: false, error: "Incorrect password" };
  if (!targetUserId) return { ok: false, error: "No user selected" };
  if (isEnvAdmin(targetUserId)) return { ok: true }; // already a root admin

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { ok: false, error: "Service role key not configured" };
  }

  const { error } = await service
    .from("admin_users")
    .upsert({ user_id: targetUserId, granted_by: callerId }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

/** Revoke a runtime-granted admin. Root (env) admins cannot be revoked. */
export async function revokeAdmin(targetUserId: string): Promise<AdminResult> {
  const callerId = await currentAdminId();
  if (!callerId) return { ok: false, error: "Not authorized" };
  if (isEnvAdmin(targetUserId)) {
    return { ok: false, error: "This is a root admin and can't be revoked here." };
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return { ok: false, error: "Service role key not configured" };
  }

  const { error } = await service.from("admin_users").delete().eq("user_id", targetUserId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}
