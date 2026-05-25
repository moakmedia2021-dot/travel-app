"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  const tabs = [
    { href: base, label: "Itinerary" },
    { href: `${base}/deals`, label: "Find Deals" },
    { href: `${base}/budget`, label: "Budget" },
    { href: `${base}/members`, label: "Members" },
    { href: `${base}/details`, label: "Details" },
  ];

  return (
    <nav className="border-b border-neutral-200">
      <div className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex h-11 items-center whitespace-nowrap border-b-2 px-2 text-sm font-medium transition-colors sm:px-1 ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
