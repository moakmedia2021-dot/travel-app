import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkAdmin } from "@/lib/admin";
import { isAdminUnlocked, lockAdminPortal } from "@/app/actions/admin";
import PasswordGate from "@/components/admin/PasswordGate";
import AdminNav from "@/components/admin/AdminNav";
import UgcHub from "@/components/admin/ugc/UgcHub";
import { listClients, listVideos } from "@/app/actions/ugc";
import { monthlyValue, type Platform, type UgcVideo } from "@/lib/ugc/types";

export const dynamic = "force-dynamic";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminUgcPage() {
  const user = await getCurrentUser();
  if (!(await checkAdmin(user?.id))) notFound();
  if (!(await isAdminUnlocked())) return <PasswordGate />;

  const [clients, videos] = await Promise.all([listClients(), listVideos()]);

  const now = new Date();
  const thisMonth = monthKey(now);
  const todayISO = now.toISOString().slice(0, 10);

  // videos posted this month, per client
  const postedThisMonthByClient = new Map<string, number>();
  let postedThisMonth = 0;
  let scheduledUpcoming = 0;
  const platformCounts: Record<Platform, number> = {
    tiktok: 0,
    instagram: 0,
    facebook: 0,
    youtube_shorts: 0,
  };

  // last 6 months posted counts
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  const postedByMonth = new Map<string, number>(months.map((m) => [m, 0]));

  for (const v of videos as UgcVideo[]) {
    if (v.platform) platformCounts[v.platform] = (platformCounts[v.platform] ?? 0) + 1;
    if (v.status === "posted" && v.posted_on) {
      const mk = v.posted_on.slice(0, 7);
      if (postedByMonth.has(mk)) postedByMonth.set(mk, (postedByMonth.get(mk) ?? 0) + 1);
      if (mk === thisMonth) {
        postedThisMonth++;
        postedThisMonthByClient.set(v.client_id, (postedThisMonthByClient.get(v.client_id) ?? 0) + 1);
      }
    }
    if (v.status === "scheduled" && v.scheduled_for && v.scheduled_for >= todayISO) {
      scheduledUpcoming++;
    }
  }

  const activeClients = clients.filter((c) => c.status === "active");
  const monthlyRevenue = activeClients.reduce(
    (s, c) => s + monthlyValue(c, postedThisMonthByClient.get(c.id) ?? 0),
    0
  );

  const baseCurrency = clients[0]?.currency || "USD";

  const trend = months.map((m) => ({ month: m, posted: postedByMonth.get(m) ?? 0 }));

  const summary = {
    totalClients: clients.length,
    activeClients: activeClients.length,
    totalVideos: videos.length,
    postedThisMonth,
    scheduledUpcoming,
    monthlyRevenue,
    baseCurrency,
    platformCounts,
    trend,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Internal admin tools.</p>
        </div>
        <form action={lockAdminPortal}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🔒 Lock
          </button>
        </form>
      </div>

      <AdminNav />

      <div>
        <h2 className="text-lg font-semibold text-neutral-900">UGC</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Track clients, payments, accounts, and your content calendar.
        </p>
      </div>

      <UgcHub clients={clients} videos={videos} summary={summary} />
    </div>
  );
}
