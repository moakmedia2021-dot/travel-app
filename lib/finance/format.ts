// Money + date helpers for the finance hub. Amounts are precise to cents,
// so (unlike the trip formatMoney) we keep 2 decimal places.

export function formatAmount(amount: number, currency = "USD"): string {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

// Compact form for chart axes / tight spaces ($1.2k).
export function formatCompact(amount: number, currency = "USD"): string {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

// Signed amount with explicit + / − for income vs expense.
export function formatSigned(amount: number, kind: "income" | "expense", currency = "USD"): string {
  const sign = kind === "income" ? "+" : "−";
  return `${sign}${formatAmount(Math.abs(amount), currency)}`;
}

// First day of the month for a given date, as YYYY-MM-DD.
export function monthStartISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Parse a "YYYY-MM" or "YYYY-MM-DD" string into a Date at the first of that month.
export function parseMonth(value: string | undefined | null): Date {
  if (value) {
    const m = value.match(/^(\d{4})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// "YYYY-MM" key used in the URL.
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shortMonthLabel(iso: string): string {
  const d = new Date(iso + (iso.length === 7 ? "-01" : "") + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Group transactions by their occurred_on date, newest first, returning
// an ordered list of [dateISO, items].
export function groupByDate<T extends { occurred_on: string }>(rows: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const arr = map.get(r.occurred_on) ?? [];
    arr.push(r);
    map.set(r.occurred_on, arr);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
