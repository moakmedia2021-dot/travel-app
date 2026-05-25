import type { Profile, TripMember } from "@/lib/types";

export function memberDisplayName(profile: Profile | null | undefined): string {
  if (!profile) return "Unknown";
  return profile.full_name || profile.username || `User ${profile.id.slice(0, 4)}`;
}

export function memberInitials(profile: Profile | null | undefined): string {
  const name = memberDisplayName(profile);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const PALETTE = [
  "bg-rose-200 text-rose-800",
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-amber-200 text-amber-800",
  "bg-purple-200 text-purple-800",
  "bg-teal-200 text-teal-800",
];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function MemberAvatar({
  profile,
  size = 24,
}: {
  profile: Profile | null | undefined;
  size?: number;
}) {
  if (!profile) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={memberDisplayName(profile)}
        title={memberDisplayName(profile)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const color = colorFor(profile.id);
  return (
    <div
      className={`flex items-center justify-center rounded-full text-xs font-semibold ${color}`}
      style={{ width: size, height: size }}
      title={memberDisplayName(profile)}
    >
      {memberInitials(profile)}
    </div>
  );
}

export function findMember(
  members: TripMember[],
  userId: string
): TripMember | undefined {
  return members.find((m) => m.user_id === userId);
}
