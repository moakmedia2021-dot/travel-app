// Centralized analytics wrapper. Safe to import from both client and
// server components — calls are no-ops when window or posthog isn't ready
// or when NEXT_PUBLIC_POSTHOG_KEY isn't set.

import type { PostHog } from "posthog-js";

type AnyProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

function ph(): PostHog | null {
  if (typeof window === "undefined") return null;
  return window.posthog ?? null;
}

export function track(event: string, props?: AnyProps): void {
  try {
    const client = ph();
    if (!client) return;
    client.capture(event, props);
  } catch (e) {
    // Never let analytics break user flows
    console.warn("[analytics] capture failed", e);
  }
}

export function identify(
  userId: string,
  traits?: Record<string, unknown>
): void {
  try {
    const client = ph();
    if (!client) return;
    client.identify(userId, traits);
  } catch (e) {
    console.warn("[analytics] identify failed", e);
  }
}

export function resetUser(): void {
  try {
    const client = ph();
    if (!client) return;
    client.reset();
  } catch (e) {
    console.warn("[analytics] reset failed", e);
  }
}
