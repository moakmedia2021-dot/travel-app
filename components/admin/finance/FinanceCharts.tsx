"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAmount, formatCompact, shortMonthLabel } from "@/lib/finance/format";
import type { MonthlyTotal } from "@/lib/finance/types";

type Props = {
  data: MonthlyTotal[];
  currency: string;
};

export default function FinanceTrendChart({ data, currency }: Props) {
  const chartData = data.map((d) => ({
    month: d.month,
    Income: d.income,
    Expenses: d.expense,
    net: d.income - d.expense,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickFormatter={shortMonthLabel} stroke="#a3a3a3" fontSize={11} />
          <YAxis
            stroke="#a3a3a3"
            fontSize={11}
            tickFormatter={(v) => formatCompact(Number(v), currency)}
            width={56}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
            formatter={(value, name) => [formatAmount(Number(value), currency), name]}
            labelFormatter={(m) => shortMonthLabel(String(m))}
          />
          <Bar dataKey="Income" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Expenses" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {chartData.map((_, i) => (
              <Cell key={i} fill="#ef4444" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
