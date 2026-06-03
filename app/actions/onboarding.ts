"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(u)) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("username_available", { p_username: u });
  return data === true;
}

export type OnboardingPayload = {
  full_name: string;
  username: string;
  home_city: string;
  avatar_url: string | null;
  travel_tags: string[];
  countries_visited: string[];
  trip?: {
    title: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    visibility: "private" | "group" | "public";
  } | null;
};

export async function completeOnboarding(
  payload: OnboardingPayload
): Promise<Result<{ tripId: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_full_name: payload.full_name.trim(),
    p_username: payload.username.trim().toLowerCase(),
    p_home_city: payload.home_city.trim(),
    p_avatar_url: payload.avatar_url,
    p_travel_tags: payload.travel_tags,
    p_countries_visited: payload.countries_visited,
    p_trip_title: payload.trip?.title ?? null,
    p_trip_destination: payload.trip?.destination ?? null,
    p_trip_start_date: payload.trip?.start_date ?? null,
    p_trip_end_date: payload.trip?.end_date ?? null,
    p_trip_visibility: payload.trip?.visibility ?? "private",
  });
  if (error) return { ok: false, error: error.message };

  // Attribute the referral (set once) if this user arrived via a referral link.
  const store = await cookies();
  const ref = store.get("gg_uref")?.value;
  if (ref) {
    await supabase.rpc("attribute_referral", { p_code: ref });
    store.delete("gg_uref");
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { tripId: (data as string | null) ?? null } };
}
