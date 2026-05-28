"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

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

  if (!isAdmin(user?.id)) {
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
