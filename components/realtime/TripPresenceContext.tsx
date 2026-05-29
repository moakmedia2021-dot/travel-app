"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PresenceUser = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  focus: { kind: "day"; day_number: number } | { kind: "item"; item_id: string } | null;
  online_at: string;
};

type Ctx = {
  tripId: string;
  currentUserId: string;
  presentUsers: PresenceUser[];
  setFocus: (focus: PresenceUser["focus"]) => void;
};

const TripPresenceContext = createContext<Ctx | null>(null);

export function useTripPresence(): Ctx {
  const v = useContext(TripPresenceContext);
  if (!v) throw new Error("useTripPresence must be inside <TripPresenceProvider>");
  return v;
}

type Props = {
  tripId: string;
  currentUser: { id: string; name: string; avatar_url: string | null };
  children: React.ReactNode;
};

export default function TripPresenceProvider({ tripId, currentUser, children }: Props) {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const focusRef = useRef<PresenceUser["focus"]>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`trip-presence:${tripId}`, {
      config: {
        presence: { key: currentUser.id },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<PresenceUser>>;
        const flat: PresenceUser[] = [];
        for (const userId of Object.keys(state)) {
          const arr = state[userId];
          if (arr && arr.length > 0) flat.push(arr[arr.length - 1]);
        }
        setPresentUsers(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name,
            avatar_url: currentUser.avatar_url,
            focus: focusRef.current,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tripId, currentUser.id, currentUser.name, currentUser.avatar_url]);

  const setFocus = useCallback(
    (focus: PresenceUser["focus"]) => {
      focusRef.current = focus;
      const ch = channelRef.current;
      if (!ch) return;
      ch.track({
        user_id: currentUser.id,
        name: currentUser.name,
        avatar_url: currentUser.avatar_url,
        focus,
        online_at: new Date().toISOString(),
      });
    },
    [currentUser.id, currentUser.name, currentUser.avatar_url]
  );

  const value = useMemo<Ctx>(
    () => ({ tripId, currentUserId: currentUser.id, presentUsers, setFocus }),
    [tripId, currentUser.id, presentUsers, setFocus]
  );

  return (
    <TripPresenceContext.Provider value={value}>{children}</TripPresenceContext.Provider>
  );
}
