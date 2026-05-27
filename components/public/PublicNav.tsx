import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { MemberAvatar } from "@/components/budget/MemberAvatar";

type Props = {
  user: User | null;
  profile: Profile | null;
};

export default function PublicNav({ user, profile }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href={user ? "/dashboard" : "/"}
          className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg"
        >
          Travel App
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-900 sm:inline"
            >
              Dashboard
            </Link>
            <Link href="/profile" className="rounded-full hover:opacity-80">
              <MemberAvatar profile={profile} size={32} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-neutral-600 hover:text-neutral-900 sm:inline-flex sm:h-9 sm:items-center sm:px-3"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex h-9 items-center rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Join free
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
