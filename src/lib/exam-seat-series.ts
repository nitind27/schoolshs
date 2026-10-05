import { compareRollNumbers } from "@/lib/attendance";

export type ExamSeatSeries = {
  /** Division letter, e.g. "A". */
  section: string;
  /** Students already counted in earlier divisions of this standard. */
  offset: number;
  priorStudents: number;
};

export type SeatRollStudent = {
  id: string;
  rollNumber?: string | null;
};

export function normStandard(standard: string): string {
  const value = standard.trim();
  if (/^\d+$/.test(value)) return String(Number.parseInt(value, 10));
  return value.toLowerCase();
}

type DivisionClass = {
  standard: string;
  section: string;
  stream?: string | null;
  name?: string | null;
};

/** True when `other` is an earlier division of the same standard, year-group and stream. */
export function isEarlierDivision(current: DivisionClass, other: DivisionClass): boolean {
  if (normStandard(current.standard) !== normStandard(other.standard)) return false;
  const streamA = String(current.stream || "").trim().toLowerCase();
  const streamB = String(other.stream || "").trim().toLowerCase();
  if (streamA !== streamB) return false;
  const currentSection = sectionCode(current.section, current.name);
  const otherSection = sectionCode(other.section, other.name);
  return (
    otherSection.localeCompare(currentSection, undefined, {
      numeric: true,
      sensitivity: "base",
    }) < 0
  );
}

/** "A" from the class section, or the trailing division in a name like "Class 6-A". */
export function sectionCode(section?: string | null, className?: string | null): string {
  const direct = String(section || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (direct) return direct.slice(0, 6);
  const match = String(className || "").match(/-([A-Z0-9]+)\s*$/i);
  return match ? match[1].toUpperCase().slice(0, 6) : "";
}

export function formatExamSeat(n: number, section: string): string {
  const sec = section.trim().toUpperCase();
  return sec ? `${n}-${sec}` : String(n);
}

/** Positive whole roll. "01" is 1. Blank or mixed text is not a roll. */
export function positiveRoll(roll: string | null | undefined): number | null {
  const raw = String(roll || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * Seat numbers run across divisions of one standard, in section order, by roll.
 * 6-A with rolls 1–40 → 1-A … 40-A.
 * 6-B roll 1 → 41-B when 40 students sit in earlier divisions.
 * A missing or duplicate roll takes the next free number so every student still gets a seat.
 */
export function assignSectionSeatNumbers(
  students: SeatRollStudent[],
  series: Pick<ExamSeatSeries, "offset" | "section">,
): Record<string, string> {
  const offset = Math.max(0, Math.floor(series.offset) || 0);
  const ordered = [...students].sort((a, b) =>
    compareRollNumbers(a.rollNumber, b.rollNumber),
  );
  const used = new Set<number>();
  const seats: Record<string, string> = {};
  let cursor = offset + 1;

  for (const student of ordered) {
    const roll = positiveRoll(student.rollNumber);
    let n = roll != null ? offset + roll : null;
    if (n == null || n < 1 || used.has(n)) {
      while (used.has(cursor)) cursor += 1;
      n = cursor;
      cursor += 1;
    } else if (n >= cursor) {
      cursor = n + 1;
    }
    used.add(n);
    seats[student.id] = formatExamSeat(n, series.section);
  }

  return seats;
}
