import type { ReactNode } from "react";

type Props = {
  illustration?: "compass" | "list" | "wallet" | "users" | "feed" | "search";
  title: string;
  description: string;
  cta?: ReactNode;
};

// Inline SVGs (keeps deploy small, no font load needed).
function Illustration({ name }: { name: NonNullable<Props["illustration"]> }) {
  const baseProps = {
    className: "h-24 w-24 text-neutral-300",
    viewBox: "0 0 96 96",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "compass":
      return (
        <svg {...baseProps}>
          <circle cx="48" cy="48" r="32" />
          <path d="M48 48l-12-24 24 12-24 24z" strokeWidth={2} />
          <circle cx="48" cy="48" r="2" fill="currentColor" />
        </svg>
      );
    case "list":
      return (
        <svg {...baseProps}>
          <rect x="20" y="20" width="56" height="56" rx="6" />
          <path d="M30 36h20M30 48h36M30 60h28" />
          <circle cx="60" cy="36" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...baseProps}>
          <path d="M16 32h56a6 6 0 016 6v34a6 6 0 01-6 6H22a6 6 0 01-6-6V32z" />
          <path d="M16 32V26a6 6 0 016-6h44v12" />
          <circle cx="64" cy="54" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
      return (
        <svg {...baseProps}>
          <circle cx="36" cy="38" r="10" />
          <circle cx="64" cy="34" r="8" />
          <path d="M18 76c0-10 8-18 18-18s18 8 18 18M58 70c1-7 7-14 16-14s14 6 14 14" />
        </svg>
      );
    case "feed":
      return (
        <svg {...baseProps}>
          <rect x="20" y="22" width="56" height="14" rx="3" />
          <rect x="20" y="42" width="40" height="6" rx="2" />
          <rect x="20" y="54" width="56" height="20" rx="3" />
        </svg>
      );
    case "search":
      return (
        <svg {...baseProps}>
          <circle cx="42" cy="42" r="22" />
          <path d="M58 58l16 16" strokeWidth={2} />
        </svg>
      );
  }
}

export default function EmptyState({
  illustration = "list",
  title,
  description,
  cta,
}: Props) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex justify-center">
        <Illustration name={illustration} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      {cta && <div className="mt-5 flex justify-center">{cta}</div>}
    </div>
  );
}
