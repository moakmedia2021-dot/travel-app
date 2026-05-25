"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

export type ProfileUpdate = {
  full_name: string | null;
  username: string | null;
  bio: string | null;
  home_city: string | null;
  avatar_url: string | null;
};

export async function updateProfile(input: ProfileUpdate): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const username = input.username?.trim().toLowerCase() || null;
  if (username) {
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return { ok: false, error: "Username must be 3-32 chars, lowercase letters / numbers / underscore only" };
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (existing) return { ok: false, error: "That username is taken" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name?.trim() || null,
      username,
      bio: input.bio?.trim() || null,
      home_city: input.home_city?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateHomeAirport(iata: string): Promise<Result> {
  const code = iata.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return { ok: false, error: "Must be a 3-letter IATA code" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ home_airport: code })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
