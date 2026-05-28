import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

// One-off debug endpoint to verify the Sentry server SDK is wired up
// correctly. Visit /api/debug/sentry → check Sentry within ~30 seconds.
// Returns whether the DSN env var is even visible to the runtime.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const dsnSet = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  const dsnPrefix = process.env.NEXT_PUBLIC_SENTRY_DSN?.slice(0, 24) ?? null;

  let captureResult: string | null = null;
  try {
    const eventId = Sentry.captureMessage(
      `[debug] Server-side Sentry test at ${new Date().toISOString()}`,
      "warning"
    );
    // Flush ensures the event is sent before the function returns
    await Sentry.flush(2000);
    captureResult = eventId || "no event id returned";
  } catch (err) {
    captureResult = err instanceof Error ? err.message : "unknown error";
  }

  return NextResponse.json({
    dsn_set: dsnSet,
    dsn_prefix: dsnPrefix,
    captured_event_id: captureResult,
    note: "If dsn_set=false, the env var isn't in the runtime. If dsn_set=true and you don't see an event in Sentry within a minute, check the Sentry project settings or your DSN spelling.",
  });
}
