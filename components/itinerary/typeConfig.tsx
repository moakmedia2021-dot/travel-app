import type { ItineraryType } from "@/lib/types";

type Config = {
  label: string;
  accent: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
};

const iconProps = {
  className: "h-4 w-4",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const TYPE_CONFIG: Record<ItineraryType, Config> = {
  flight: {
    label: "Flight",
    accent: "border-l-blue-400",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: (
      <svg {...iconProps}>
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  hotel: {
    label: "Hotel",
    accent: "border-l-green-400",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    icon: (
      <svg {...iconProps}>
        <path d="M2 4v16M2 8h18a2 2 0 012 2v10M2 17h20M6 8v0a2 2 0 014 0v4H6V8z" />
      </svg>
    ),
  },
  activity: {
    label: "Activity",
    accent: "border-l-amber-400",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    icon: (
      <svg {...iconProps}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  transport: {
    label: "Transport",
    accent: "border-l-neutral-400",
    iconBg: "bg-neutral-100",
    iconColor: "text-neutral-600",
    icon: (
      <svg {...iconProps}>
        <path d="M5 17h14M5 17a2 2 0 11-4 0 2 2 0 014 0zm14 0a2 2 0 11-4 0 2 2 0 014 0zM3 13l1.5-6a2 2 0 012-1.5h11a2 2 0 012 1.5L21 13M3 13h18M3 13v3a1 1 0 001 1h1m15-4v3a1 1 0 01-1 1h-1" />
      </svg>
    ),
  },
  note: {
    label: "Note",
    accent: "border-l-purple-400",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    icon: (
      <svg {...iconProps}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4" />
      </svg>
    ),
  },
};

export const TYPE_ORDER: ItineraryType[] = [
  "flight",
  "hotel",
  "activity",
  "transport",
  "note",
];
