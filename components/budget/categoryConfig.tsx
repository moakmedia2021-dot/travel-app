import type { ExpenseCategory } from "@/lib/types";

type Config = {
  label: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
};

const svg = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CATEGORY_CONFIG: Record<ExpenseCategory, Config> = {
  food: {
    label: "Food",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    icon: (
      <svg {...svg}>
        <path d="M4 2v20M4 12c4 0 4-4 0-4M16 4v8a4 4 0 008 0V4M20 12v10" />
      </svg>
    ),
  },
  transport: {
    label: "Transport",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: (
      <svg {...svg}>
        <path d="M3 13l1.5-6a2 2 0 012-1.5h11a2 2 0 012 1.5L21 13M3 13h18M3 13v3a1 1 0 001 1h1m15-4v3a1 1 0 01-1 1h-1M7 17a2 2 0 11-4 0 2 2 0 014 0zm14 0a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  accommodation: {
    label: "Stay",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    icon: (
      <svg {...svg}>
        <path d="M2 4v16M2 8h18a2 2 0 012 2v10M2 17h20M6 8v0a2 2 0 014 0v4H6V8z" />
      </svg>
    ),
  },
  activities: {
    label: "Activities",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    icon: (
      <svg {...svg}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  misc: {
    label: "Misc",
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-600",
    icon: (
      <svg {...svg}>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  "food",
  "transport",
  "accommodation",
  "activities",
  "misc",
];

export function categoryConfig(cat: string | null) {
  return CATEGORY_CONFIG[(cat ?? "misc") as ExpenseCategory] ?? CATEGORY_CONFIG.misc;
}
