import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

// Allow-list of "root" admin user IDs from env (ADMIN_USER_IDS, comma list).
// These admins can never be revoked from the UI — they're the bootstrap owners.
export function isEnvAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}

// Back-compat alias: existing sync callers that only care about env admins.
export const isAdmin = isEnvAdmin;

// Full admin check: env "root" admins OR runtime-granted admins (admin_users).
// Cached per render so repeated calls in one request don't re-hit the DB.
// Fails safe to env-only if the service client/key is unavailable, so the
// owner is never locked out.
export const checkAdmin = cache(async (userId: string | undefined | null): Promise<boolean> => {
  if (!userId) return false;
  if (isEnvAdmin(userId)) return true;
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
});

// User IDs of runtime-granted admins (not env admins).
export async function listGrantedAdminIds(): Promise<string[]> {
  try {
    const service = createServiceClient();
    const { data } = await service.from("admin_users").select("user_id");
    return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  } catch {
    return [];
  }
}
