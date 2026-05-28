// Wrappers that add structured context to Sentry events.
// Safe to import from both client and server — no-ops when Sentry is unconfigured.
import * as Sentry from "@sentry/nextjs";

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  hint?: string | null;
  details?: string | null;
};

export function reportSupabaseError(
  err: SupabaseErrorLike,
  ctx: { table: string; operation: "select" | "insert" | "update" | "delete" | "rpc"; rpcName?: string }
) {
  if (!err) return;
  Sentry.withScope((scope) => {
    scope.setContext("supabase", {
      table: ctx.table,
      operation: ctx.operation,
      rpc_name: ctx.rpcName,
      error_code: err.code,
      hint: err.hint,
      details: err.details,
    });
    scope.setTag("supabase.table", ctx.table);
    scope.setTag("supabase.operation", ctx.operation);
    if (err.code) scope.setTag("supabase.code", err.code);
    Sentry.captureMessage(err.message ?? "Supabase error", "error");
  });
}

export function reportAmadeusError(
  err: unknown,
  ctx: { endpoint: string; statusCode?: number }
) {
  Sentry.withScope((scope) => {
    scope.setContext("amadeus", {
      endpoint: ctx.endpoint,
      status_code: ctx.statusCode,
    });
    scope.setTag("amadeus.endpoint", ctx.endpoint);
    if (ctx.statusCode) scope.setTag("amadeus.status", String(ctx.statusCode));
    Sentry.captureException(err);
  });
}

export function reportDuffelError(
  err: unknown,
  ctx: { endpoint: string; statusCode?: number }
) {
  Sentry.withScope((scope) => {
    scope.setContext("duffel", {
      endpoint: ctx.endpoint,
      status_code: ctx.statusCode,
    });
    scope.setTag("duffel.endpoint", ctx.endpoint);
    if (ctx.statusCode) scope.setTag("duffel.status", String(ctx.statusCode));
    Sentry.captureException(err);
  });
}

export function reportStripeError(
  err: unknown,
  ctx: { event_type?: string; error_code?: string }
) {
  Sentry.withScope((scope) => {
    scope.setContext("stripe", {
      event_type: ctx.event_type,
      error_code: ctx.error_code,
    });
    if (ctx.event_type) scope.setTag("stripe.event", ctx.event_type);
    if (ctx.error_code) scope.setTag("stripe.code", ctx.error_code);
    Sentry.captureException(err);
  });
}

/**
 * Associate the active user with subsequent events in this request/session.
 * Safe to call repeatedly — Sentry just overwrites.
 */
export function identifySentryUser(user: {
  id: string;
  email?: string | null;
  plan?: string | null;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    segment: user.plan ?? "free",
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
