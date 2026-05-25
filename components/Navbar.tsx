"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import type { Profile } from "@/lib/types";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "Trips" },
];

type Props = {
  user: User | null;
  profile: Profile | null;
};

export default function Navbar({ user, profile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = profile
    ? memberDisplayName(profile)
    : user?.email?.split("@")[0] ?? "?";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-neutral-900">
          Travel App
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User avatar / sign-out */}
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
              title={`Edit profile (${displayName})`}
            >
              <MemberAvatar profile={profile} size={32} />
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              Sign out
            </button>
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
