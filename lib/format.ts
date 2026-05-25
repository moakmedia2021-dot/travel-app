export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";

  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", opts);

  if (start && end) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();

    if (sameMonth) {
      return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { day: "numeric", year: "numeric" })}`;
    }
    if (sameYear) {
      return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `${fmt(start, { month: "short", day: "numeric", year: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  return fmt((start || end) as string, { month: "short", day: "numeric", year: "numeric" });
}
