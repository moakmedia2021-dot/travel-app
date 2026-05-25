"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ItineraryItem } from "@/lib/types";
import ItemCard from "./ItemCard";

type Props = {
  dayNumber: number;
  date: Date | null;
  items: ItineraryItem[];
  onAddItem: (dayNumber: number) => void;
  onItemClick: (item: ItineraryItem) => void;
};

function formatDayLabel(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DaySection({
  dayNumber,
  date,
  items,
  onAddItem,
  onItemClick,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const itemIds = items.map((i) => i.id);

  return (
    <section className="space-y-3">
      {/* Day header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex flex-1 items-baseline gap-3 text-left"
        >
          <svg
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-base font-semibold text-neutral-900">
            Day {dayNumber}
          </span>
          {date && (
            <span className="text-sm text-neutral-500">{formatDayLabel(date)}</span>
          )}
          <span className="text-xs text-neutral-400">
            {items.length === 0
              ? "Empty"
              : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAddItem(dayNumber)}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="ml-7 space-y-2 border-l-2 border-neutral-100 pl-4">
          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => onAddItem(dayNumber)}
              className="block w-full rounded-lg border border-dashed border-neutral-200 px-3 py-4 text-left text-xs text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-colors"
            >
              Nothing planned yet — add a flight, hotel, or activity.
            </button>
          ) : (
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick(item)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </section>
  );
}
