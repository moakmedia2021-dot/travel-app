import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import type { Profile } from "@/lib/types";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data as Profile | null;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Navbar user={user} profile={profile} />
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <BottomTabBar profile={profile} />
    </div>
  );
}
