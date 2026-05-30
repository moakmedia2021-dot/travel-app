"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type RealAnalyticsCharts from "./AnalyticsCharts";

export type { DayCount } from "./AnalyticsCharts";

// Recharts is heavy; defer it to a client-only chunk so the analytics route's
// initial JS stays small and the page paints fast (loading.tsx covers the gap).
const Lazy = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl bg-neutral-100" />,
});

export default function AnalyticsChartsLazy(props: ComponentProps<typeof RealAnalyticsCharts>) {
  return <Lazy {...props} />;
}
