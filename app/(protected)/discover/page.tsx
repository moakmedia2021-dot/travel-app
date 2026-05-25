import { createClient } from "@/lib/supabase/server";
import DiscoverView from "@/components/discover/DiscoverView";
import type { DiscoverTraveler } from "@/lib/types";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("discover_travelers");
  const travelers = (error ? [] : (data ?? [])) as DiscoverTraveler[];
  return <DiscoverView travelers={travelers} />;
}
