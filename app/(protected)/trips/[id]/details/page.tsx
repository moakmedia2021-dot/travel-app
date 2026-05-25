import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TripDetailsForm from "@/components/details/TripDetailsForm";
import type { Trip } from "@/lib/types";

export default async function DetailsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tripRes, memberRes] = await Promise.all([
    supabase.from("trips").select("*").eq("id", id).single(),
    user
      ? supabase
          .from("trip_members")
          .select("role")
          .eq("trip_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!tripRes.data) notFound();
  const trip = tripRes.data as Trip;
  const role = (memberRes.data as { role: string } | null)?.role ?? null;
  const isOwner = role === "owner";
  const canEdit = role === "owner" || role === "editor";

  return <TripDetailsForm trip={trip} canEdit={canEdit} isOwner={isOwner} />;
}
