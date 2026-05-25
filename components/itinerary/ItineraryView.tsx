"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import type { ItineraryItem } from "@/lib/types";
import DaySection from "./DaySection";
import ItemSlideOver from "./ItemSlideOver";
import AIGeneratorModal from "./AIGeneratorModal";
import {
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  type ItineraryInput,
} from "@/app/actions/itinerary";

type Props = {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
  initialItems: ItineraryItem[];
};

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function dateForDay(startDate: string | null, dayNumber: number): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

export default function ItineraryView({
  tripId,
  startDate,
  endDate,
  initialItems,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItineraryItem[]>(initialItems);
  const [slideOver, setSlideOver] = useState<{
    mode: "add" | "edit";
    item: ItineraryItem | null;
    day: number;
  } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Decide how many days to render.
  const tripDayCount = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const maxItemDay = items.reduce((m, i) => Math.max(m, i.day_number), 0);
  const dayCount = Math.max(tripDayCount, maxItemDay, 1);

  const days = useMemo(() => {
    const grouped = new Map<number, ItineraryItem[]>();
    for (let d = 1; d <= dayCount; d++) grouped.set(d, []);
    for (const item of items) {
      const arr = grouped.get(item.day_number) ?? [];
      arr.push(item);
      grouped.set(item.day_number, arr);
    }
    const entries = Array.from(grouped.entries());
    entries.forEach(([, arr]) => arr.sort((a, b) => a.position - b.position));
    entries.sort(([a], [b]) => a - b);
    return entries.map(([dayNumber, dayItems]) => ({
      dayNumber,
      date: dateForDay(startDate, dayNumber),
      items: dayItems,
    }));
  }, [items, dayCount, startDate]);

  function handleAdd(dayNumber: number) {
    setSlideOver({ mode: "add", item: null, day: dayNumber });
  }

  function handleEdit(item: ItineraryItem) {
    setSlideOver({ mode: "edit", item, day: item.day_number });
  }

  async function handleSave(input: ItineraryInput) {
    setError(null);
    if (!slideOver) return;

    if (slideOver.mode === "add") {
      const dayItems = items.filter((i) => i.day_number === input.day_number);
      const nextPosition = dayItems.length + 1;
      const result = await createItineraryItem(tripId, nextPosition, input);
      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }
      router.refresh();
    } else if (slideOver.item) {
      const itemId = slideOver.item.id;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                ...input,
                location_name: input.location_name,
                booking_ref: input.booking_ref,
                notes: input.notes,
                price: input.price,
                currency: input.currency,
              }
            : i
        )
      );

      const result = await updateItineraryItem(tripId, itemId, input);
      if (!result.ok) {
        // revert by refreshing
        router.refresh();
        setError(result.error);
        throw new Error(result.error);
      }
    }

    setSlideOver(null);
  }

  async function handleDelete() {
    if (!slideOver?.item) return;
    const itemId = slideOver.item.id;

    // Optimistic remove
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSlideOver(null);

    const result = await deleteItineraryItem(tripId, itemId);
    if (!result.ok) {
      setItems(snapshot);
      setError(result.error);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;
    if (activeItem.day_number !== overItem.day_number) return; // cross-day not supported here

    const dayItems = items
      .filter((i) => i.day_number === activeItem.day_number)
      .sort((a, b) => a.position - b.position);

    const oldIdx = dayItems.findIndex((i) => i.id === active.id);
    const newIdx = dayItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(dayItems, oldIdx, newIdx);

    // Optimistic position update
    const newPositions = new Map(reordered.map((i, idx) => [i.id, idx + 1]));
    setItems((prev) =>
      prev.map((i) =>
        newPositions.has(i.id) ? { ...i, position: newPositions.get(i.id)! } : i
      )
    );

    const result = await reorderItineraryItems(
      tripId,
      activeItem.day_number,
      reordered.map((i) => i.id)
    );
    if (!result.ok) {
      router.refresh();
      setError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-300 hover:text-neutral-900"
        >
          <span>✨</span> Generate with AI
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {days.map(({ dayNumber, date, items: dayItems }) => (
          <DaySection
            key={dayNumber}
            dayNumber={dayNumber}
            date={date}
            items={dayItems}
            onAddItem={handleAdd}
            onItemClick={handleEdit}
          />
        ))}
      </DndContext>

      <AIGeneratorModal open={aiOpen} tripId={tripId} onClose={() => setAiOpen(false)} />

      <ItemSlideOver
        open={slideOver !== null}
        mode={slideOver?.mode ?? "add"}
        item={slideOver?.item ?? null}
        defaultDay={slideOver?.day ?? 1}
        maxDay={dayCount}
        tripStartDate={startDate}
        onClose={() => setSlideOver(null)}
        onSave={handleSave}
        onDelete={slideOver?.mode === "edit" ? handleDelete : undefined}
      />
    </div>
  );
}
