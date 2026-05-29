// Reads the WAITLIST_MODE feature flag. When true, the landing page
// replaces /dashboard at "/" and /signup redirects back to /.
export function isWaitlistMode(): boolean {
  const v = process.env.WAITLIST_MODE;
  return v === "true" || v === "1";
}

// Early-access threshold for the progress bar on the personal waitlist page.
export const EARLY_ACCESS_THRESHOLD = Number(
  process.env.WAITLIST_EARLY_ACCESS_THRESHOLD ?? "100"
);
