import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/profile/ProfileEditor";
import { isAdmin } from "@/lib/admin";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, home_city, avatar_url, instagram_handle, travel_tags, countries_visited")
    .eq("id", user.id)
    .single();

  return (
    <ProfileEditor
      isAdmin={isAdmin(user.id)}
      initial={{
        id: user.id,
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
        bio: profile?.bio ?? null,
        home_city: profile?.home_city ?? null,
        avatar_url: profile?.avatar_url ?? null,
        instagram_handle: profile?.instagram_handle ?? null,
        travel_tags: profile?.travel_tags ?? null,
        countries_visited: profile?.countries_visited ?? null,
      }}
    />
  );
}
