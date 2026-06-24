export type UgcStatus = "lead" | "active" | "paused" | "ended";
export type Platform = "tiktok" | "instagram" | "facebook" | "youtube_shorts";
export type RatePeriod = "per_video" | "monthly" | "flat" | "hourly";
export type VideoStatus = "idea" | "scripted" | "filmed" | "scheduled" | "posted";

export const UGC_STATUSES: UgcStatus[] = ["lead", "active", "paused", "ended"];
export const PLATFORMS: Platform[] = ["tiktok", "instagram", "facebook", "youtube_shorts"];
export const RATE_PERIODS: RatePeriod[] = ["per_video", "monthly", "flat", "hourly"];
export const VIDEO_STATUSES: VideoStatus[] = ["idea", "scripted", "filmed", "scheduled", "posted"];

export const STATUS_LABELS: Record<UgcStatus, string> = {
  lead: "Lead",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

export const STATUS_COLORS: Record<UgcStatus, string> = {
  lead: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-800",
  ended: "bg-neutral-100 text-neutral-500",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube_shorts: "YouTube Shorts",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: "#000000",
  instagram: "#e1306c",
  facebook: "#1877f2",
  youtube_shorts: "#ff0000",
};

export const PLATFORM_EMOJI: Record<Platform, string> = {
  tiktok: "🎵",
  instagram: "📸",
  facebook: "👥",
  youtube_shorts: "▶️",
};

export const RATE_PERIOD_LABELS: Record<RatePeriod, string> = {
  per_video: "/ video",
  monthly: "/ month",
  flat: "flat",
  hourly: "/ hour",
};

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  filmed: "Filmed",
  scheduled: "Scheduled",
  posted: "Posted",
};

export const VIDEO_STATUS_COLORS: Record<VideoStatus, string> = {
  idea: "bg-neutral-100 text-neutral-600",
  scripted: "bg-blue-100 text-blue-700",
  filmed: "bg-violet-100 text-violet-700",
  scheduled: "bg-amber-100 text-amber-800",
  posted: "bg-green-100 text-green-700",
};

export type UgcClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: UgcStatus;
  rate: number | null;
  rate_period: RatePeriod;
  currency: string;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UgcAccount = {
  id: string;
  client_id: string;
  platform: Platform;
  handle: string | null;
  url: string | null;
  login_email: string | null;
  login_password: string | null;
  notes: string | null;
  created_at: string;
};

export type UgcVideo = {
  id: string;
  client_id: string;
  account_id: string | null;
  title: string;
  platform: Platform | null;
  status: VideoStatus;
  scheduled_for: string | null;
  posted_on: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInput = {
  id?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: UgcStatus;
  rate: number | null;
  rate_period: RatePeriod;
  currency: string;
  color: string | null;
  notes: string | null;
};

export type AccountInput = {
  id?: string | null;
  client_id: string;
  platform: Platform;
  handle: string | null;
  url: string | null;
  login_email: string | null;
  login_password: string | null;
  notes: string | null;
};

export type VideoInput = {
  id?: string | null;
  client_id: string;
  account_id: string | null;
  title: string;
  platform: Platform | null;
  status: VideoStatus;
  scheduled_for: string | null;
  posted_on: string | null;
  url: string | null;
  notes: string | null;
};

export const CLIENT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#e11d48",
  "#f59e0b",
];

export function monthlyValue(c: UgcClient, videosThisMonth: number): number {
  if (c.rate == null) return 0;
  if (c.rate_period === "monthly" || c.rate_period === "flat") return c.rate;
  if (c.rate_period === "per_video") return c.rate * videosThisMonth;
  return c.rate; // hourly — unknown hours, treat as base
}
