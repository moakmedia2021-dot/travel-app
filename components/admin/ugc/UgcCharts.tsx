"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  type Platform,
} from "@/lib/ugc/types";

function shortMonth(mk: string) {
  const d = new Date(mk + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" });
}

export function PlatformDonut({ counts }: { counts: Record<Platform, number> }) {
  const data = (Object.keys(counts) as Platform[])
    .map((p) => ({ name: PLATFORM_LABELS[p], value: counts[p], color: PLATFORM_COLORS[p] }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-neutral-400">No videos yet</div>;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color === "#000000" ? "#111827" : d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
            formatter={(v, n) => [`${Number(v)} videos`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PostedTrend({ data }: { data: { month: string; posted: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="month" tickFormatter={shortMonth} stroke="#a3a3a3" fontSize={11} />
          <Tooltip
            cursor={{ fill: "#f5f5f5" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
            formatter={(v) => [`${Number(v)} posted`, ""]}
            labelFormatter={(m) => shortMonth(String(m))}
          />
          <Bar dataKey="posted" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
