"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "Trips" },
];

export default function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
              {initials}
            </div>
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
