"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { followUser, unfollowUser } from "@/app/actions/social";
import { track } from "@/lib/analytics";

type Props = {
  targetId: string;
  initialFollowing: boolean;
};

export default function FollowButton({ targetId, initialFollowing }: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    const result = next ? await followUser(targetId) : await unfollowUser(targetId);
    if (!result.ok) {
      setFollowing(!next); // revert
      alert(result.error);
    } else {
      track(next ? "user_followed" : "user_unfollowed", { target_id: targetId });
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        following
          ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          : "bg-neutral-900 text-white hover:bg-neutral-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
