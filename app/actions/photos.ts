"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { searchUnsplash, hasUnsplashKey, type UnsplashPhoto } from "@/lib/unsplash";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function unsplashConfigured(): Promise<boolean> {
  return hasUnsplashKey();
}

export async function searchCoverPhotos(query: string): Promise<Result<UnsplashPhoto[]>> {
  if (!hasUnsplashKey()) return { ok: false, error: "Unsplash not configured" };
  try {
    const photos = await searchUnsplash(query);
    return { ok: true, data: photos };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Search failed" };
  }
}

export async function setTripCover(tripId: string, url: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ cover_image_url: url })
    .eq("id", tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`, "layout");
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true };
}
