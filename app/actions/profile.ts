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

export async function uploadAvatar(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file uploaded" };
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: "Image must be under 20MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only images are allowed" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/", "layout");
  return { ok: true, url: publicUrl };
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
