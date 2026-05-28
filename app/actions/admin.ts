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

export async function unlockAdminPortal(
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.id)) {
    // Don't even hint that the page exists for non-admins
    return { ok: false, error: "Not found" };
  }

  if (password !== ADMIN_PORTAL_PASSWORD) {
    return { ok: false, error: "Incorrect password" };
  }

  const store = await cookies();
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * COOKIE_TTL_HOURS,
    path: "/admin",
  });

  return { ok: true };
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
