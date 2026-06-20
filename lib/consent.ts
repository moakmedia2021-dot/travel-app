"use client";

// Cookie/analytics consent. Stored in localStorage; a window event lets the
// PostHog provider react the moment the user makes a choice.
export type ConsentValue = "granted" | "denied";

const KEY = "gg_cookie_consent";
export const CONSENT_EVENT = "gg-consent-change";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode — ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

export function analyticsAllowed(): boolean {
  return getConsent() === "granted";
}
