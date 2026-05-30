import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

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
