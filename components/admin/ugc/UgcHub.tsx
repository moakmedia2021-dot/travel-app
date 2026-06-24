"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import CountUp from "@/components/ui/CountUp";
import ClientsPanel from "./ClientsPanel";
import ContentCalendar from "./ContentCalendar";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  type UgcClient,
  type UgcVideo,
} from "@/lib/ugc/types";

const PlatformDonut = dynamic(() => import("./UgcCharts").then((m) => m.PlatformDonut), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-md bg-neutral-100" />,
});
const PostedTrend = dynamic(() => import("./UgcCharts").then((m) => m.PostedTrend), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-md bg-neutral-100" />,
});

type Summary = {
  totalClients: number;
  activeClients: number;
  totalVideos: number;
  postedThisMonth: number;
  scheduledUpcoming: number;
  monthlyRevenue: number;
  baseCurrency: string;
  platformCounts: Record<Platform, number>;
  trend: { month: string; posted: number }[];
};

type Tab = "dashboard" | "clients" | "calendar";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { id: "clients", label: "Clients", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" },
  { id: "calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

function money(v: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${Math.round(v)}`;
  }
}

export default function UgcHub({
  clients,
  videos,
  summary,
}: {
  clients: UgcClient[];
  videos: UgcVideo[];
  summary: Summary;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <Dashboard summary={summary} clients={clients} />}
      {tab === "clients" && <ClientsPanel initial={clients} />}
      {tab === "calendar" && <ContentCalendar clients={clients} initialVideos={videos} />}
    </div>
  );
}

function Dashboard({ summary, clients }: { summary: Summary; clients: UgcClient[] }) {
  const cur = summary.baseCurrency;
  return (
    <div className="space-y-5">
      {/* Animated stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Monthly revenue"
          tone="green"
          value={<CountUp value={summary.monthlyRevenue} prefix={cur === "USD" ? "$" : ""} />}
          sub={`${summary.activeClients} active client${summary.activeClients === 1 ? "" : "s"}`}
        />
        <StatCard label="Clients" value={<CountUp value={summary.totalClients} />} sub="total" />
        <StatCard
          label="Posted this month"
          tone="blue"
          value={<CountUp value={summary.postedThisMonth} />}
          sub={`${summary.totalVideos} all-time`}
        />
        <StatCard
          label="Scheduled"
          tone="amber"
          value={<CountUp value={summary.scheduledUpcoming} />}
          sub="upcoming"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Videos by platform">
          <PlatformDonut counts={summary.platformCounts} />
          <div className="mt-3 flex flex-wrap gap-3">
            {PLATFORMS.filter((p) => summary.platformCounts[p] > 0).map((p) => (
              <span key={p} className="flex items-center gap-1.5 text-xs text-neutral-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLORS[p] === "#000000" ? "#111827" : PLATFORM_COLORS[p] }}
                />
                {PLATFORM_LABELS[p]} · {summary.platformCounts[p]}
              </span>
            ))}
          </div>
        </Card>
        <Card title="Posted — last 6 months">
          <PostedTrend data={summary.trend} />
        </Card>
      </div>

      {/* Revenue per client */}
      <Card title="Top clients by rate">
        {clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">No clients yet.</p>
        ) : (
          <div className="space-y-2.5">
            {[...clients]
              .filter((c) => c.rate != null)
              .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
              .slice(0, 6)
              .map((c) => {
                const max = Math.max(...clients.map((x) => x.rate ?? 0), 1);
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-neutral-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? "#2563eb" }} />
                        {c.name}
                      </span>
                      <span className="font-medium text-neutral-900">{money(c.rate ?? 0, c.currency)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${((c.rate ?? 0) / max) * 100}%`, backgroundColor: c.color ?? "#2563eb" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "neutral" | "green" | "blue" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "blue"
      ? "text-blue-600"
      : tone === "amber"
      ? "text-amber-600"
      : "text-neutral-900";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      {children}
    </div>
  );
}
