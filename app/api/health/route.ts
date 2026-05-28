import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, standardLimit } from "@/lib/ratelimit";
import packageJson from "../../../package.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthStatus = {
  status: "ok" | "degraded";
  supabase: "connected" | "error";
  supabase_error?: string;
  timestamp: string;
  version: string;
  uptime_seconds?: number;
};

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, standardLimit);
  if (limited) return limited;

  const timestamp = new Date().toISOString();
  let supabaseStatus: HealthStatus["supabase"] = "connected";
  let supabaseError: string | undefined;

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) {
      supabaseStatus = "error";
      supabaseError = error.message;
    }
  } catch (e) {
    supabaseStatus = "error";
    supabaseError = e instanceof Error ? e.message : "unknown";
  }

  const body: HealthStatus = {
    status: supabaseStatus === "connected" ? "ok" : "degraded",
    supabase: supabaseStatus,
    supabase_error: supabaseError,
    timestamp,
    version: packageJson.version,
    uptime_seconds:
      typeof process !== "undefined" && process.uptime
        ? Math.floor(process.uptime())
        : undefined,
  };

  return NextResponse.json(body, {
    status: supabaseStatus === "connected" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
