"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile | null;
};

type Tab = {
  href: string;
  label: string;
  // Returns true if this pathname should mark the tab active
  active: (pathname: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
};

const baseStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

const TABS: Omit<Tab, "icon">[] = [
  {
    href: "/dashboard",
    label: "Home",
    active: (p) => p === "/dashboard" || p === "/",
  },
  {
    href: "/trips",
    label: "Trips",
    active: (p) => p === "/trips" || p.startsWith("/trips/"),
  },
  {
    href: "/discover",
    label: "Discover",
    active: (p) => p.startsWith("/discover"),
  },
  {
    href: "/feed",
    label: "Feed",
    active: (p) => p.startsWith("/feed"),
  },
  {
    href: "/profile",
    label: "Profile",
    active: (p) => p === "/profile" || p.startsWith("/profile/"),
  },
];

function iconFor(label: string, active: boolean): React.ReactNode {
  const cls = `h-6 w-6 ${active ? "text-neutral-900" : "text-neutral-400"}`;
  switch (label) {
    case "Home":
      return (
        <svg className={cls} {...baseStroke}>
          <path d="M3 11l9-8 9 8M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
        </svg>
      );
    case "Trips":
      return (
        <svg className={cls} {...baseStroke}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" />
        </svg>
      );
    case "Discover":
      return (
        <svg className={cls} {...baseStroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M16 8l-3 5-5 3 3-5 5-3z" strokeLinejoin="round" />
        </svg>
      );
    case "Feed":
      return (
        <svg className={cls} {...baseStroke}>
          <rect x="4" y="5" width="16" height="4" rx="1" />
          <rect x="4" y="11" width="10" height="2" rx="1" />
          <rect x="4" y="15" width="16" height="5" rx="1" />
        </svg>
      );
    case "Profile":
      return (
        <svg className={cls} {...baseStroke}>
          <circle cx="12" cy="9" r="4" />
          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function BottomTabBar({ profile }: Props) {
  const pathname = usePathname();

  // Profile tab destination: public profile if username set, else editor
  const profileHref =
    profile?.username ? `/profile/${profile.username}` : "/profile";

  const tabs: Tab[] = TABS.map((t) => ({
    ...t,
    icon: (active) => iconFor(t.label, active),
    href: t.label === "Profile" ? profileHref : t.href,
  }));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((t) => {
          const isActive = t.active(pathname);
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`flex h-16 min-w-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                isActive ? "text-neutral-900" : "text-neutral-400"
              }`}
            >
              {t.icon(isActive)}
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
