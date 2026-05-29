"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/currencies";

type Props = {
  tripId: string;
  currentUserId: string;
  memberNames: Record<string, string>;
};

export default function ExpenseRealtimeSync({
  tripId,
  currentUserId,
  memberNames,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`trip-expenses:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expenses",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as {
            paid_by: string;
            title: string;
            amount: number;
            currency: string;
          };
          if (row.paid_by === currentUserId) return; // own additions handled locally
          const payer = memberNames[row.paid_by] ?? "Someone";
          toast.success(
            `${payer} added ${formatMoney(Number(row.amount), row.currency)} — ${row.title}`
          );
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 300);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tripId, currentUserId, memberNames, router]);

  return null;
}
