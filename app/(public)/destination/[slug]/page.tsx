import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import TripCard from "@/components/TripCard";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";
import JoinCTA from "@/components/public/JoinCTA";
import type { Trip } from "@/lib/types";
import { formatDateRange } from "@/lib/format";

// SSG the top 50, ISR the rest (fallback on-demand).
export const revalidate = 3600;
export const dynamicParams = true;

type Params = { slug: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://travel-app-xfgp.vercel.app").replace(/\/$/, "");
}

function titleCase(s: string): string {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type TopDestRow = { destination: string; slug: string; trip_count: number };
type DestRow = { destination: string; country_code: string | null; trip_count: number };

export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("top_destinations", { p_limit: 50 });
    const rows = (data ?? []) as TopDestRow[];
    return rows.filter((r) => r.slug && r.slug.length > 0).map((r) => ({ slug: r.slug }));
  } catch {
    return [];
  }
}

async function loadDestination(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("destination_by_slug", { p_slug: slug });
  return ((data ?? [])[0] as DestRow | undefined) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dest = await loadDestination(slug);
  const name = dest?.destination ?? titleCase(slug);
  const description = `Discover ${name}: real trip itineraries, travel tips, and travelers planning trips here on GetGoin.`;
  const url = `${siteUrl()}/destination/${slug}`;
  return {
    title: `${name} — Travel guide & itineraries`,
    description,
    openGraph: {
      title: `${name} on GetGoin`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${name} on GetGoin`,
      description,
    },
    alternates: { canonical: url },
  };
}

type TravelerRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  start_date: string | null;
  end_date: string | null;
};

type TipRow = {
  id: string;
  user_id: string;
  location_name: string;
  content: string;
  category: string | null;
  created_at: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default async function DestinationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const dest = await loadDestination(slug);

  // If no trips exist for this slug, still render a stub page so SEO bots see something.
  // But if slug is malformed, 404.
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) notFound();

  const supabase = await createClient();
  const [tripsRes, travelersRes, tipsRes] = await Promise.all([
    dest
      ? supabase
          .from("trips")
          .select("*")
          .eq("destination", dest.destination)
          .eq("visibility", "public")
          .order("start_date", { ascending: true, nullsFirst: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    supabase.rpc("travelers_for_destination", { p_slug: slug, p_limit: 8 }),
    supabase.rpc("tips_for_destination", { p_slug: slug, p_limit: 20 }),
  ]);

  const trips = (tripsRes.data ?? []) as Trip[];
  const travelers = (travelersRes.data ?? []) as TravelerRow[];
  const tips = (tipsRes.data ?? []) as TipRow[];

  const displayName = dest?.destination ?? titleCase(slug);
  const url = `${siteUrl()}/destination/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: displayName,
    description: `Discover ${displayName} — itineraries, tips, and fellow travelers.`,
    url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Destination
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-neutral-900 sm:text-4xl">
            {displayName}
          </h1>
          {dest && (
            <p className="mt-2 text-sm text-neutral-600">
              {dest.trip_count} public trip{dest.trip_count === 1 ? "" : "s"} planned
            </p>
          )}
        </header>

        {/* Public trips */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Trips to {displayName}
          </h2>
          {trips.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
              No public trips here yet. Be the first to plan one.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((t) => (
                <Link key={t.id} href={`/trips/${t.id}/public`} className="block">
                  <TripCard trip={t} />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Travelers */}
        {travelers.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Travelers heading to {displayName}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {travelers.map((t) => {
                const profile = {
                  id: t.user_id,
                  full_name: t.full_name,
                  username: t.username,
                  avatar_url: t.avatar_url,
                };
                const inner = (
                  <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 hover:shadow-md">
                    <MemberAvatar profile={profile} size={44} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-900">
                        {memberDisplayName(profile)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDateRange(t.start_date, t.end_date)}
                      </div>
                    </div>
                  </div>
                );
                return t.username ? (
                  <Link key={t.user_id} href={`/profile/${t.username}`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={t.user_id}>{inner}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Travel tips
            </h2>
            <div className="space-y-3">
              {tips.map((tip) => {
                const profile = {
                  id: tip.user_id,
                  full_name: tip.full_name,
                  username: tip.username,
                  avatar_url: tip.avatar_url,
                };
                return (
                  <div key={tip.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
                      <MemberAvatar profile={profile} size={20} />
                      <span>{memberDisplayName(profile)}</span>
                      <span>·</span>
                      <span>{tip.location_name}</span>
                      {tip.category && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                          {tip.category}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-line text-sm text-neutral-800">{tip.content}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <JoinCTA message={`Planning a trip to ${displayName}?`} />
      </div>
    </>
  );
}
