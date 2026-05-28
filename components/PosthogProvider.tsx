"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { identifySentryUser } from "@/lib/errorContext";

export default function PosthogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init once on mount
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) return;
    if (typeof window === "undefined") return;
    if ((window as unknown as { __posthog_initialized?: boolean }).__posthog_initialized) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // we handle it ourselves below
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
    (window as unknown as { posthog?: typeof posthog }).posthog = posthog;
    (window as unknown as { __posthog_initialized?: boolean }).__posthog_initialized = true;

    // Identify the signed-in user (best effort)
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, subscription_status, created_at")
        .eq("id", user.id)
        .maybeSingle();
      const { count: tripsCount } = await supabase
        .from("trip_members")
        .select("trip_id", { count: "exact", head: true })
        .eq("user_id", user.id);

      posthog.identify(user.id, {
        email: user.email,
        name: profile?.full_name ?? profile?.username ?? null,
        plan: profile?.subscription_status ?? "free",
        created_at: profile?.created_at ?? user.created_at,
        trips_count: tripsCount ?? 0,
      });
      identifySentryUser({
        id: user.id,
        email: user.email,
        plan: profile?.subscription_status ?? "free",
      });
    });
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!pathname) return;
    if (typeof window === "undefined") return;
    if (!(window as unknown as { posthog?: typeof posthog }).posthog) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
