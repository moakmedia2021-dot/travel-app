// 8 distinct ring colors cycled per user_id for presence indicators.
export const PRESENCE_RING_COLORS = [
  "ring-rose-500",
  "ring-blue-500",
  "ring-green-500",
  "ring-amber-500",
  "ring-purple-500",
  "ring-teal-500",
  "ring-pink-500",
  "ring-indigo-500",
] as const;

export const PRESENCE_DOT_BG = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
] as const;

export function colorForUser(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % PRESENCE_RING_COLORS.length;
}

export function ringForUser(userId: string): string {
  return PRESENCE_RING_COLORS[colorForUser(userId)];
}

export function dotForUser(userId: string): string {
  return PRESENCE_DOT_BG[colorForUser(userId)];
}
