"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to itinerary_items INSERT/UPDATE/DELETE for the current trip.
 * On any remote change (not initiated by current user), triggers a
 * router.refresh() so the server-rendered ItineraryView re-fetches and
 * the new state appears. We debounce slightly to coalesce bursts.
 *
 * Lighter than a full optimistic-merge into local state, but gets us
 * Notion-like "edits appear instantly" feel without conflict overhead.
 */
export default function ItineraryRealtimeSync({
  tripId,
  currentUserId,
}: {
  tripId: string;
  currentUserId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase
      .channel(`trip-itinerary:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_items",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // Skip self-originated changes (best-effort: we don't get user from
          // postgres_changes, so we use created_by/paid_by where available).
          const row = (payload.new ?? payload.old) as { created_by?: string } | null;
          if (row && row.created_by === currentUserId) return;
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUserId, router]);

  return null;
}
