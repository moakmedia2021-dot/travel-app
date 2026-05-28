// Allow-list of user IDs that can hit /admin pages.
// Set ADMIN_USER_IDS in env as a comma-separated list of UUIDs.
export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}
