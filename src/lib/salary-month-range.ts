export type YearMonth = { month: number; year: number };

export function monthKey(item: YearMonth): string {
  return `${item.year}-${String(item.month).padStart(2, "0")}`;
}

/**
 * Current financial year: first month through today.
 * A finished year stays complete. A future year starts at its first month.
 */
export function defaultMonthRange(months: YearMonth[], now = new Date()): { from: string; to: string } {
  if (!months.length) return { from: "", to: "" };
  const keys = months.map(monthKey);
  const current = monthKey({ month: now.getMonth() + 1, year: now.getFullYear() });
  const idx = keys.indexOf(current);
  if (idx >= 0) return { from: keys[0], to: keys[idx] };
  const first = months[0].year * 12 + months[0].month;
  const today = now.getFullYear() * 12 + (now.getMonth() + 1);
  if (today > first) return { from: keys[0], to: keys[keys.length - 1] };
  return { from: keys[0], to: keys[0] };
}

export function sliceMonthRange<T extends YearMonth>(
  months: T[],
  from: string | null | undefined,
  to: string | null | undefined,
): T[] {
  if (!months.length) return months;
  if (!from && !to) return months;
  const keys = months.map(monthKey);
  let start = from ? keys.indexOf(from) : 0;
  let end = to ? keys.indexOf(to) : keys.length - 1;
  if (start < 0) start = 0;
  if (end < 0) end = keys.length - 1;
  if (start > end) [start, end] = [end, start];
  return months.slice(start, end + 1);
}

export function rangeSearch(months: YearMonth[]): string {
  if (!months.length) return "";
  return `from=${monthKey(months[0])}&to=${monthKey(months[months.length - 1])}`;
}
