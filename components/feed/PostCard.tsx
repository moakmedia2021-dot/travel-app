import Link from "next/link";
import type { FeedItem } from "@/lib/types";
import { MemberAvatar, memberDisplayName } from "@/components/budget/MemberAvatar";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PostCard({
  item,
  canDelete = false,
  onDelete,
}: {
  item: FeedItem;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const profile = {
    id: item.user_id,
    full_name: item.full_name,
    username: item.username,
    avatar_url: item.avatar_url,
  };

  const isTip = item.kind === "tip";

  return (
    <div className="group rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <MemberAvatar profile={profile} size={36} />
        <div className="min-w-0 flex-1">
          {item.username ? (
            <Link
              href={`/profile/${item.username}`}
              className="block truncate text-sm font-semibold text-neutral-900 hover:underline"
            >
              {memberDisplayName(profile)}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold text-neutral-900">
              {memberDisplayName(profile)}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{timeAgo(item.created_at)}</span>
            {item.location_name && (
              <>
                <span>·</span>
                <span>📍 {item.location_name}</span>
              </>
            )}
            {isTip && (
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700">
                Tip{item.category ? ` · ${item.category}` : ""}
              </span>
            )}
          </div>
        </div>
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            aria-label={`Delete ${item.kind}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 opacity-60 transition-opacity hover:bg-neutral-100 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-neutral-800">{item.content}</p>
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          className="mt-3 max-h-96 w-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}
