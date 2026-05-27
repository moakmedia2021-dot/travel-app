"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import type { Profile } from "@/lib/types";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "Trips" },
  { href: "/feed", label: "Feed" },
  { href: "/discover", label: "Discover" },
  { href: "/connections", label: "Connections" },
];

type Props = {
  user: User | null;
  profile: Profile | null;
};

export default function Navbar({ user, profile }: Props) {
  const pathname = usePathname();

  const displayName = profile
    ? memberDisplayName(profile)
    : user?.email?.split("@")[0] ?? "?";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg"
        >
          Travel App
        </Link>

        {/* Desktop nav links (hidden on mobile — bottom tab bar takes over) */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Desktop: avatar only — Sign out lives on /profile */}
            <Link
              href="/profile"
              className="rounded-full transition-opacity hover:opacity-80"
              title={`Edit profile (${displayName})`}
            >
              <MemberAvatar profile={profile} size={32} />
            </Link>

          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
