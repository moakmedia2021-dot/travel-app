import Link from "next/link";
import type { Profile, Trip, TripPost } from "@/lib/types";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import TripCard from "@/components/TripCard";
import WorldMap from "./WorldMap";
import FollowButton from "./FollowButton";
import ConnectButton from "./ConnectButton";
import InviteToTripButton from "./InviteToTripButton";
import { COUNTRY_BY_CODE } from "@/lib/countries";

type Props = {
  profile: Profile;
  isMe: boolean;
  currentUserId: string;
  upcomingTrips: Trip[];
  pastTrips: Trip[];
  posts: TripPost[];
  followers: number;
  following: number;
  isFollowing: boolean;
  connection: {
    id: string;
    status: string;
    requester_id: string;
    addressee_id: string;
  } | null;
  myActiveTrips: { id: string; title: string }[];
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PublicProfile({
  profile,
  isMe,
  currentUserId,
  upcomingTrips,
  pastTrips,
  posts,
  followers,
  following,
  isFollowing,
  connection,
  myActiveTrips,
}: Props) {
  const visited = profile.countries_visited ?? [];
  const tags = profile.travel_tags ?? [];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <MemberAvatar profile={profile} size={80} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-neutral-900">
                {memberDisplayName(profile)}
              </h1>
              {profile.username && (
                <p className="text-sm text-neutral-500">@{profile.username}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                {profile.home_city && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <circle cx="12" cy="11" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {profile.home_city}
                  </span>
                )}
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-neutral-900"
                  >
                    @{profile.instagram_handle}
                  </a>
                )}
              </div>
            </div>
          </div>

          {!isMe && (
            <div className="flex flex-wrap items-center gap-2">
              <FollowButton targetId={profile.id} initialFollowing={isFollowing} />
              <ConnectButton
                targetId={profile.id}
                currentUserId={currentUserId}
                connection={connection}
              />
              <InviteToTripButton
                targetEmail={null}
                targetUsername={profile.username}
                myActiveTrips={myActiveTrips}
              />
            </div>
          )}
          {isMe && (
            <Link
              href="/profile"
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Edit profile
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mt-5 flex gap-6 border-t border-neutral-100 pt-4 text-sm">
          <Stat label="Followers" value={followers} />
          <Stat label="Following" value={following} />
          <Stat label="Countries" value={visited.length} />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 whitespace-pre-line text-sm text-neutral-700">{profile.bio}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* World map */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Travel map
          </h2>
          <span className="text-xs text-neutral-400">{visited.length} countries</span>
        </div>
        <WorldMap visited={visited} height={300} />
        {visited.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visited.map((code) => {
              const c = COUNTRY_BY_CODE[code];
              if (!c) return null;
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-xs"
                >
                  <span>{c.flag}</span>
                  <span className="text-neutral-700">{c.name}</span>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming trips */}
      {upcomingTrips.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Upcoming
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingTrips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}

      {/* Past trips */}
      {pastTrips.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Past trips
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastTrips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        </section>
      )}

      {/* Posts feed */}
      {posts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Posts
          </h2>
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{timeAgo(p.created_at)}</span>
                  {p.location_name && (
                    <>
                      <span>·</span>
                      <span>{p.location_name}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">{p.content}</p>
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="mt-3 max-h-80 w-full rounded-lg object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {upcomingTrips.length === 0 && pastTrips.length === 0 && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          {isMe
            ? "You haven't shared anything yet. Create a public trip or share a post."
            : `${memberDisplayName(profile)} hasn't shared anything yet.`}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold text-neutral-900 tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
