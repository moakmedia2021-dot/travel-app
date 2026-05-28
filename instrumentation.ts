// Next.js 14's recommended hook to bootstrap server-side instrumentation.
// Loads the appropriate Sentry config based on the active runtime.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Optional hook that's called when Next encounters a request error.
// Older SDK versions don't export this; guard for safety.
export const onRequestError = (Sentry as unknown as {
  captureRequestError?: (err: unknown, request: unknown, ctx: unknown) => void;
}).captureRequestError;
