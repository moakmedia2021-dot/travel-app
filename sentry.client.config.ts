// Sentry config loaded in the browser. No-ops gracefully when
// NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

    // Performance monitoring — 20% of transactions
    tracesSampleRate: 0.2,

    // Session replays — 5% sampled, 100% on errors
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Ignore noisy, non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
      // Browser extensions / external scripts
      /^Script error\.?$/,
      "ChunkLoadError",
      "Loading chunk",
      "Loading CSS chunk",
    ],

    // Demote transient network failures to warnings instead of errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error) {
        if (/network request failed/i.test(error.message) ||
            /failed to fetch/i.test(error.message) ||
            /load failed/i.test(error.message)) {
          event.level = "warning";
          event.fingerprint = ["network-request-failed"];
        }
      }
      return event;
    },
  });
}
