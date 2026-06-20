"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { moderateText, moderateImageUrl } from "@/lib/moderation";
import { rateLimitOk, postLimit } from "@/lib/ratelimit";
import type { FeedItem } from "@/lib/types";

const RATE_LIMIT_MSG = "You're doing that too fast. Take a breather and try again in a minute.";

type R<T = void> = (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

export async function uploadPostImage(formData: FormData): Promise<R<string>> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file" };
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: "Image must be under 20MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Image only" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("post-images").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);

  // NSFW / nudity check — remove the file if it's flagged so it never persists.
  const imgMod = await moderateImageUrl(pub.publicUrl);
  if (!imgMod.allowed) {
    await supabase.storage.from("post-images").remove([path]);
    return { ok: false, error: imgMod.reason };
  }

  return { ok: true, data: pub.publicUrl };
}

export async function createPost(input: {
  content: string;
  trip_id?: string | null;
  location_name?: string | null;
  image_url?: string | null;
}): Promise<R<string>> {
  if (!(await rateLimitOk(postLimit))) return { ok: false, error: RATE_LIMIT_MSG };

  const textMod = await moderateText(input.content);
  if (!textMod.allowed) return { ok: false, error: textMod.reason };
  if (input.image_url) {
    const imgMod = await moderateImageUrl(input.image_url);
    if (!imgMod.allowed) return { ok: false, error: imgMod.reason };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_post", {
    p_content: input.content.trim(),
    p_trip_id: input.trip_id ?? null,
    p_location_name: input.location_name ?? null,
    p_image_url: input.image_url ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  revalidatePath("/profile", "layout");
  return { ok: true, data: data as string };
}

export async function deletePost(id: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_post", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  revalidatePath("/profile", "layout");
  return { ok: true };
}

export async function createTip(input: {
  location_name: string;
  content: string;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<R<string>> {
  if (!(await rateLimitOk(postLimit))) return { ok: false, error: RATE_LIMIT_MSG };

  const textMod = await moderateText(`${input.location_name} ${input.content}`);
  if (!textMod.allowed) return { ok: false, error: textMod.reason };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tip", {
    p_location_name: input.location_name,
    p_content: input.content.trim(),
    p_category: input.category ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  return { ok: true, data: data as string };
}

export async function deleteTip(id: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_tip", { p_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/feed");
  return { ok: true };
}

export async function getFeed(limit = 50): Promise<R<FeedItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_feed", { p_limit: limit });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as FeedItem[] };
}
