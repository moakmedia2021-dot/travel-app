"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItineraryItem } from "@/lib/types";
import { TYPE_CONFIG } from "./typeConfig";
import { formatMoney } from "@/lib/currencies";

type Props = {
  item: ItineraryItem;
  onClick: () => void;
};

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeRange(start: string | null, end: string | null): string | null {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return `until ${e}`;
  return null;
}

export default function ItemCard({ item, onClick }: Props) {
  const config = TYPE_CONFIG[item.type];
  const time = timeRange(item.start_time, item.end_time);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex gap-3 rounded-lg border border-l-4 border-neutral-200 ${config.accent} bg-white p-3 shadow-sm transition-shadow hover:shadow-md`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        className="flex shrink-0 cursor-grab items-center text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}
      >
        {config.icon}
      </div>

      {/* Body — clickable */}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <div className="flex w-full items-baseline justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-neutral-900">
            {item.title}
          </h4>
          {time && (
            <span className="shrink-0 text-xs font-medium text-neutral-500">
              {time}
            </span>
          )}
        </div>

        {(item.location_name || item.price != null) && (
          <div className="mt-0.5 flex w-full items-center gap-2 text-xs text-neutral-500">
            {item.location_name && (
              <span className="flex items-center gap-1 truncate">
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <circle cx="12" cy="11" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="truncate">{item.location_name}</span>
              </span>
            )}
            {item.price != null && item.currency && (
              <>
                {item.location_name && <span className="text-neutral-300">·</span>}
                <span className="font-medium text-neutral-700">
                  {formatMoney(Number(item.price), item.currency)}
                </span>
              </>
            )}
          </div>
        )}

        {item.booking_ref && (
          <div className="mt-1 text-xs text-neutral-400">
            Ref: <span className="font-mono">{item.booking_ref}</span>
          </div>
        )}

        {item.notes && (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.notes}</p>
        )}
      </button>
    </div>
  );
}
