// Centralized toast wrapper so the rest of the app doesn't import sonner directly.
// Also normalizes error messages — we never want to surface raw API objects.

import { toast } from "sonner";

const GENERIC_NETWORK = "Network hiccup. Try again in a moment.";

export function notifySuccess(message: string) {
  toast.success(message);
}

export function notifyInfo(message: string) {
  toast.info(message);
}

export function notifyError(message: string) {
  toast.error(message);
}

// For unknown errors (network failures, API blow-ups, etc.).
// Strips out anything that looks like a stack trace or object dump
// and shows a clean user-facing message instead.
export function notifyUnexpected(error: unknown, fallback?: string) {
  const msg = humanize(error) ?? fallback ?? GENERIC_NETWORK;
  toast.error(msg);
  console.error("[toast error]", error);
}

function humanize(error: unknown): string | null {
  if (typeof error === "string") return cleanMessage(error);
  if (error instanceof Error) return cleanMessage(error.message);
  if (typeof error === "object" && error !== null && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return cleanMessage(m);
  }
  return null;
}

function cleanMessage(raw: string): string {
  const trimmed = raw.trim();
  // Hide stack-traceish / JSON-blob-looking messages
  if (trimmed.length > 140 || /[{}[\]]/.test(trimmed)) return GENERIC_NETWORK;
  return trimmed;
}
