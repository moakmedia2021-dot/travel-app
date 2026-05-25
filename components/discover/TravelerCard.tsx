"use client";

import Link from "next/link";
import type { DiscoverTraveler } from "@/lib/types";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import { formatDateRange } from "@/lib/format";

export default function TravelerCard({ traveler }: { traveler: DiscoverTraveler }) {
  const profile = {
    id: traveler.user_id,
    full_name: traveler.full_name,
    username: traveler.username,
    avatar_url: traveler.avatar_url,
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col items-center text-center">
        <MemberAvatar profile={profile} size={96} />
        <h3 className="mt-3 text-xl font-semibold text-neutral-900">
          {memberDisplayName(profile)}
        </h3>
        {traveler.username && (
          <Link
            href={`/profile/${traveler.username}`}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            @{traveler.username}
          </Link>
        )}
      </div>

      <div className="mt-5 space-y-2 rounded-lg bg-neutral-50 p-4 text-sm">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <circle cx="12" cy="11" r="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-medium text-neutral-800">{traveler.destination ?? "—"}</span>
        </div>
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="text-neutral-700">
            {formatDateRange(traveler.start_date, traveler.end_date)}
          </span>
        </div>
      </div>

      {traveler.travel_tags && traveler.travel_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {traveler.travel_tags.slice(0, 6).map((t) => (
            <span key={t} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {traveler.mutual_followers > 0
            ? `${traveler.mutual_followers} mutual follower${traveler.mutual_followers === 1 ? "" : "s"}`
            : "No mutuals"}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
          ★ {traveler.score}
        </span>
      </div>
    </div>
  );
}
