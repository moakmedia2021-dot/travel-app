"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent scroll behind drawer
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [drawerOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = profile
    ? memberDisplayName(profile)
    : user?.email?.split("@")[0] ?? "?";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg"
          >
            Travel App
          </Link>

          {/* Desktop nav links */}
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
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop: avatar + sign out */}
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  href="/profile"
                  className="rounded-full transition-opacity hover:opacity-80"
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

              {/* Mobile: avatar shortcut + hamburger */}
              <Link
                href="/profile"
                className="rounded-full transition-opacity hover:opacity-80 md:hidden"
                title={displayName}
              >
                <MemberAvatar profile={profile} size={36} />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 md:hidden"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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

      {/* Mobile drawer */}
      {drawerOpen && user && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[85%] bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
              <span className="text-sm font-semibold text-neutral-900">Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <Link
              href="/profile"
              className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4 hover:bg-neutral-50"
            >
              <MemberAvatar profile={profile} size={44} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-neutral-900">
                  {displayName}
                </div>
                <div className="truncate text-xs text-neutral-500">View profile</div>
              </div>
            </Link>

            <nav className="flex flex-col py-2">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex h-12 items-center px-4 text-base font-medium transition-colors ${
                      active
                        ? "border-l-4 border-neutral-900 bg-neutral-50 pl-3 text-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute inset-x-0 bottom-0 border-t border-neutral-200 p-3">
              <button
                onClick={handleSignOut}
                className="flex h-12 w-full items-center justify-center rounded-md border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
