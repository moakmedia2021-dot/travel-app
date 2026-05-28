"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type DayCount = { date: string; count: number };

type Props = {
  signups: DayCount[];
  trips: DayCount[];
};

export default function AnalyticsCharts({ signups, trips }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Signups last 30 days" data={signups} color="#2563eb" />
      <ChartCard title="Trips created last 30 days" data={trips} color="#16a34a" />
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: DayCount[]; color: string }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <span className="text-xs text-neutral-500 tabular-nums">{total} total</span>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={shortDate} stroke="#a3a3a3" fontSize={11} />
            <YAxis stroke="#a3a3a3" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e5e5" }}
              labelFormatter={(v) => shortDate(String(v))}
            />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
