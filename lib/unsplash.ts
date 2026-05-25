export type UnsplashPhoto = {
  id: string;
  description: string | null;
  regularUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
};

export function hasUnsplashKey(): boolean {
  return !!process.env.UNSPLASH_ACCESS_KEY;
}

type ApiPhoto = {
  id: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
};

export async function searchUnsplash(query: string, perPage = 12): Promise<UnsplashPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY not set");
  if (!query.trim()) return [];

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query.trim())}&per_page=${perPage}&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = (await res.json()) as { results: ApiPhoto[] };
  return data.results.map((p) => ({
    id: p.id,
    description: p.description ?? p.alt_description ?? null,
    regularUrl: p.urls.regular,
    thumbUrl: p.urls.small,
    width: p.width,
    height: p.height,
    photographer: p.user.name,
    photographerUrl: `${p.user.links.html}?utm_source=travel_app&utm_medium=referral`,
  }));
}
