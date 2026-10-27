export type DayColumnKind = "sunday" | "holiday";

export type DayColumn = {
  day: number;
  date: string;
  kind: DayColumnKind;
  /** Default label shown in the editor (Sunday or the holiday name). */
  title: string;
  /** Text that prints in the column. Empty means no banner. */
  message: string;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function cleanAttendanceDayNotes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DATE_KEY.test(key)) continue;
    if (typeof value !== "string") continue;
    out[key] = value.replace(/\s+/g, " ").trim().slice(0, 40);
  }
  return out;
}

export function monthDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isSunday(year: number, month: number, day: number): boolean {
  return new Date(year, month - 1, day).getDay() === 0;
}

export function buildMonthDayColumns(opts: {
  year: number;
  month: number;
  holidays: { date: string; name: string; nameGu?: string | null }[];
  saved: Record<string, string>;
}): DayColumn[] {
  const holidayByDate = new Map<string, string>();
  for (const holiday of opts.holidays) {
    const label = (holiday.nameGu || holiday.name || "").trim();
    if (label) holidayByDate.set(holiday.date, label);
  }

  const last = daysInMonth(opts.year, opts.month);
  const columns: DayColumn[] = [];
  for (let day = 1; day <= last; day++) {
    const date = monthDateKey(opts.year, opts.month, day);
    const holidayName = holidayByDate.get(date) || "";
    const sunday = isSunday(opts.year, opts.month, day);
    if (!holidayName && !sunday) continue;
    const kind: DayColumnKind = holidayName ? "holiday" : "sunday";
    const title = holidayName || "રવિવાર";
    const message = Object.prototype.hasOwnProperty.call(opts.saved, date) ? opts.saved[date] : title;
    columns.push({ day, date, kind, title, message });
  }
  return columns;
}
