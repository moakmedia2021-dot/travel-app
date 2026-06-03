"use server";

import { createClient } from "@/lib/supabase/server";

export type ReferralStats = {
  referral_code: string;
  referrals: number;
  bonus_trips: number;
  free_trip_limit: number;
};

export async function getReferralStats(): Promise<ReferralStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_referral_stats").single();
  if (error || !data) return null;
  return data as ReferralStats;
}
