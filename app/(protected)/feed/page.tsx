import { createClient } from "@/lib/supabase/server";
import FeedView from "@/components/feed/FeedView";
import type { FeedItem } from "@/lib/types";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [feedRes, tripsRes] = await Promise.all([
    supabase.rpc("get_feed", { p_limit: 50 }),
    user
      ? supabase
          .from("trips")
          .select("id, title")
          .eq("owner_id", user.id)
          .order("start_date", { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: [] }),
  ]);

  const items = (feedRes.data ?? []) as FeedItem[];
  const trips = (tripsRes.data ?? []) as { id: string; title: string }[];

  return <FeedView initialItems={items} trips={trips} currentUserId={user?.id ?? ""} />;
}
