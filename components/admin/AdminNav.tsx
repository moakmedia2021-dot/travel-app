"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/finance", label: "Finances" },
  { href: "/admin/waitlist", label: "Waitlist" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-neutral-200 px-4 sm:mx-0 sm:px-0">
      <div className="-mb-px flex gap-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex h-11 items-center border-b-2 px-1 text-sm font-medium transition-colors ${
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
