import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";
import AnalyticsCharts, { type DayCount } from "@/components/admin/AnalyticsCharts";

export const dynamic = "force-dynamic";

// Prices match the BillingPanel (kept in sync manually for now)
const MONTHLY_PRICE = 19.99;
const ANNUAL_MONTHLY_EQUIV = 190 / 12;

function emptySeries(days: number): DayCount[] {
  const out: DayCount[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

function bucketByDay(rows: { created_at: string }[], days = 30): DayCount[] {
  const series = emptySeries(days);
  const map = new Map(series.map((s) => [s.date, s]));
  for (const r of rows) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const slot = map.get(key);
    if (slot) slot.count++;
  }
  return series;
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.id)) notFound();

  // Use service client to bypass RLS for admin queries
  const service = (() => {
    try {
      return createServiceClient();
    } catch {
      return null;
    }
  })();
  if (!service) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in env to view analytics.
      </div>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const sinceISO = since.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const [profilesRecent, tripsRecent, totalUsers, activeUsers, premiumStats, tripOwners] =
    await Promise.all([
      service
        .from("profiles")
        .select("created_at")
        .gte("created_at", sinceISO)
        .is("deleted_at", null),
      service
        .from("trips")
        .select("created_at, owner_id")
        .gte("created_at", sinceISO),
      service
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      // Active users: anyone whose profile was created OR who has a trip created in last 7 days
      // We don't track last_seen, so approximate with recent trip activity.
      service
        .from("trips")
        .select("owner_id")
        .gte("created_at", sevenDaysAgoISO),
      service
        .from("profiles")
        .select("subscription_status, subscription_period_end, subscription_id"),
      // For conversion rate: distinct owner_ids of any trips
      service.from("trip_members").select("user_id").eq("role", "owner"),
    ]);

  const signups = bucketByDay(profilesRecent.data ?? []);
  const trips = bucketByDay(tripsRecent.data ?? []);

  const totalUserCount = totalUsers.count ?? 0;
  const activeUserSet = new Set((activeUsers.data ?? []).map((r) => r.owner_id));
  const activeUserCount = activeUserSet.size;

  // Conversion: users who have created at least one trip / total users
  const ownersWithTrips = new Set(
    (tripOwners.data ?? []).map((r) => r.user_id as string)
  );
  const conversionRate =
    totalUserCount > 0 ? (ownersWithTrips.size / totalUserCount) * 100 : 0;

  // Premium MRR
  const now = new Date();
  let premiumCount = 0;
  for (const p of premiumStats.data ?? []) {
    const periodEnd = p.subscription_period_end ? new Date(p.subscription_period_end) : null;
    const active = !!periodEnd && periodEnd > now;
    if (active) premiumCount++;
  }
  // Without distinguishing monthly vs annual cleanly, conservatively
  // estimate MRR as if everyone is monthly. Refine when we store plan type.
  const mrr = premiumCount * MONTHLY_PRICE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Internal admin view. Page views & event funnels live in PostHog.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total users" value={totalUserCount.toString()} />
        <Stat label="Active (7d)" value={activeUserCount.toString()} />
        <Stat
          label="Signup → trip"
          value={`${conversionRate.toFixed(1)}%`}
          hint={`${ownersWithTrips.size}/${totalUserCount}`}
        />
        <Stat
          label="Premium MRR (est.)"
          value={`$${mrr.toFixed(0)}`}
          hint={`${premiumCount} subscribers`}
        />
      </div>

      <AnalyticsCharts signups={signups} trips={trips} />

      <p className="text-xs text-neutral-400">
        MRR estimate uses ${MONTHLY_PRICE}/mo as the price for every premium subscriber.
        Annual subscribers count as 1/12 of ${(ANNUAL_MONTHLY_EQUIV * 12).toFixed(0)}/yr but we
        don&apos;t yet store plan type, so this is a rough lower-bound.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</div>
      {hint && <div className="text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}
