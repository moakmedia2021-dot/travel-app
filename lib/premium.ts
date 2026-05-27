import { createClient } from "@/lib/supabase/server";

export type PlanInfo = {
  isPremium: boolean;
  status: "free" | "premium" | "cancelled";
  periodEnd: string | null;
};

export async function getPlan(userId: string): Promise<PlanInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_period_end")
    .eq("id", userId)
    .maybeSingle();

  const status = (data?.subscription_status ?? "free") as PlanInfo["status"];
  const periodEnd = (data?.subscription_period_end as string | null) ?? null;
  const isPremium = !!periodEnd && new Date(periodEnd) > new Date();
  return { isPremium, status, periodEnd };
}

export async function isPremium(userId: string): Promise<boolean> {
  return (await getPlan(userId)).isPremium;
}
