import type { AttendanceRow } from "@/lib/attendance";
import {
  countMarkedDays,
  countMonthAbsent,
  countMonthHalf,
  countMonthPresent,
} from "@/lib/attendance";

export type AttendanceStatusFilter = "" | "P" | "A" | "H" | "unmarked" | "marked";

export interface AttendanceViewFilters {
  search: string;
  status: AttendanceStatusFilter;
  /** 1–31 inclusive column range (empty = full month) */
  dayFrom: string;
  dayTo: string;
}

export const EMPTY_ATTENDANCE_VIEW_FILTERS: AttendanceViewFilters = {
  search: "",
  status: "",
  dayFrom: "",
  dayTo: "",
};

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function parseDayRange(
  filters: AttendanceViewFilters,
  month: number,
  year: number
): { from: number; to: number; isCustom: boolean } {
  const maxDay = daysInMonth(month, year);
  let from = parseInt(filters.dayFrom, 10);
  let to = parseInt(filters.dayTo, 10);
  const hasFrom = Number.isFinite(from) && from >= 1;
  const hasTo = Number.isFinite(to) && to >= 1;
  const isCustom = hasFrom || hasTo;
  if (!hasFrom) from = 1;
  if (!hasTo) to = maxDay;
  from = Math.min(Math.max(1, from), maxDay);
  to = Math.min(Math.max(1, to), maxDay);
  if (from > to) [from, to] = [to, from];
  return { from, to, isCustom };
}

/** 0-based day indices to show as columns (defaults to full month). */
export function resolveVisibleDayIndices(
  filters: AttendanceViewFilters,
  month: number,
  year: number
): number[] {
  const { from, to } = parseDayRange(filters, month, year);
  return Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
}

export function filterAttendanceRows(
  rows: AttendanceRow[],
  filters: AttendanceViewFilters,
  month: number,
  year: number
): AttendanceRow[] {
  const q = filters.search.trim().toLowerCase();
  const check = resolveVisibleDayIndices(filters, month, year);

  return rows.filter((row) => {
    if (q) {
      const hay = `${row.name} ${row.rollNumber} ${row.grNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (filters.status) {
      const hit = check.some((di) => {
        const mark = row.attendance[di] ?? null;
        if (filters.status === "unmarked") return !mark;
        if (filters.status === "marked") return mark === "P" || mark === "A" || mark === "H";
        return mark === filters.status;
      });
      if (!hit) return false;
    }

    return true;
  });
}

export function mergeAttendanceRows(
  all: AttendanceRow[],
  updatedSubset: AttendanceRow[]
): AttendanceRow[] {
  const byId = new Map(updatedSubset.map((r) => [r.studentId, r]));
  return all.map((r) => byId.get(r.studentId) ?? r);
}

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Download currently filtered/visible attendance as CSV. */
export function downloadAttendanceCsv(opts: {
  rows: AttendanceRow[];
  dayIndices: number[];
  month: number;
  year: number;
  classLabel: string;
  filename?: string;
}): void {
  const { rows, dayIndices, month, year, classLabel } = opts;
  const dayHeaders = dayIndices.map((di) => String(di + 1));
  const headers = [
    "#",
    "Roll",
    "GR",
    "Name",
    ...dayHeaders,
    "Present",
    "Absent",
    "Half",
    "Marked",
    "%",
    "Note",
  ];

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row, i) => {
      const slice = dayIndices.map((di) => row.attendance[di] ?? null);
      const present = countMonthPresent(slice);
      const absent = countMonthAbsent(slice);
      const half = countMonthHalf(slice);
      const marked = countMarkedDays(slice);
      const pct = marked ? Math.round((present / marked) * 100) : 0;
      return [
        i + 1,
        row.rollNumber,
        row.grNumber,
        row.name,
        ...slice.map((d) => d || ""),
        present,
        absent,
        half,
        marked,
        pct,
        row.note || "",
      ]
        .map(csvEscape)
        .join(",");
    }),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeClass = classLabel.replace(/[^\w\-]+/g, "_").slice(0, 40) || "class";
  a.href = url;
  a.download =
    opts.filename ||
    `attendance_${safeClass}_${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function hasActiveViewFilters(f: AttendanceViewFilters): boolean {
  return Boolean(f.search.trim() || f.status || f.dayFrom || f.dayTo);
}

export function formatDayRangeLabel(
  filters: AttendanceViewFilters,
  month: number,
  year: number,
  allLabel: string
): string {
  const { from, to, isCustom } = parseDayRange(filters, month, year);
  if (!isCustom) return allLabel;
  if (from === to) return String(from);
  return `${from} – ${to}`;
}
