import type { Metadata } from "next";
import OfflineTrips from "@/components/offline/OfflineTrips";

export const metadata: Metadata = {
  title: "Offline trips",
  description: "View your downloaded trips without internet.",
};

// Fully client-rendered from IndexedDB, so it works when the service worker
// serves this page with no network.
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <OfflineTrips />
    </main>
  );
}
