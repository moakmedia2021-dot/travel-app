import { ItineraryDaySkeleton } from "@/components/ui/Skeleton";

export default function ItineraryTabLoading() {
  return (
    <div className="space-y-6">
      <ItineraryDaySkeleton />
      <ItineraryDaySkeleton />
    </div>
  );
}
