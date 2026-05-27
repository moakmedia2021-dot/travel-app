import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://travel-app-xfgp.vercel.app").replace(/\/$/, "");

export const revalidate = 3600;

type TopDestRow = { destination: string; slug: string; trip_count: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = await createClient();

  // Static-ish entries
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Public profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username")
    .not("username", "is", null)
    .limit(1000);
  const profileEntries: MetadataRoute.Sitemap = (profiles ?? [])
    .filter((p): p is { username: string } => !!p.username)
    .map((p) => ({
      url: `${SITE}/profile/${p.username}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  // Public trips
  const { data: trips } = await supabase
    .from("trips")
    .select("id, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(1000);
  const tripEntries: MetadataRoute.Sitemap = (trips ?? []).map((t) => ({
    url: `${SITE}/trips/${t.id}/public`,
    lastModified: t.created_at ? new Date(t.created_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Destination pages
  const { data: dests } = await supabase.rpc("top_destinations", { p_limit: 200 });
  const destEntries: MetadataRoute.Sitemap = ((dests ?? []) as TopDestRow[])
    .filter((d) => d.slug && d.slug.length > 0)
    .map((d) => ({
      url: `${SITE}/destination/${d.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  return [...base, ...destEntries, ...profileEntries, ...tripEntries];
}
