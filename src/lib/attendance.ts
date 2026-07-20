import type { ClassRegisterRow } from "@/lib/certificates/types";
import { studentFullName } from "@/lib/certificates/date-to-words";

export type AttendanceMark = "P" | "A" | "H" | "";

export const ATTENDANCE_MARKS: AttendanceMark[] = ["P", "A", "H", ""];

export interface AttendanceRow extends ClassRegisterRow {
  studentId: string;
  rollNumber: string;
}

export function emptyDays(): (string | null)[] {
  return Array(31).fill(null);
}

export function parseDaysJson(json: string | null | undefined): (string | null)[] {
  if (!json) return emptyDays();
  try {
    const arr = JSON.parse(json) as unknown[];
    const days = emptyDays();
    for (let i = 0; i < 31; i++) {
      const v = arr[i];
      days[i] = v === "P" || v === "A" || v === "H" ? v : null;
    }
    return days;
  } catch {
    return emptyDays();
  }
}

export function serializeDays(days: (string | null)[]): string {
  return JSON.stringify(days.map((d) => (d === "P" || d === "A" || d === "H" ? d : null)));
}

/** P = 1, H = half day (0.5 rounded up in integer register as 1 for simplicity) */
export function countMonthPresent(days: (string | null)[]): number {
  return days.reduce((sum, d) => {
    if (d === "P") return sum + 1;
    if (d === "H") return sum + 1;
    return sum;
  }, 0);
}

export function countMonthAbsent(days: (string | null)[]): number {
  return days.filter((d) => d === "A").length;
}

export function countMonthHalf(days: (string | null)[]): number {
  return days.filter((d) => d === "H").length;
}

export function countMarkedDays(days: (string | null)[]): number {
  return days.filter((d) => d === "P" || d === "A" || d === "H").length;
}

export function attendancePercent(present: number, marked: number): number {
  if (!marked) return 0;
  return Math.round((present / marked) * 100);
}

export interface AttendanceStudentReport {
  studentId: string;
  serial: number;
  name: string;
  rollNumber: string;
  grNumber: string;
  present: number;
  absent: number;
  half: number;
  notMarked: number;
  markedDays: number;
  monthTotal: number;
  prevTotal: number;
  cumulative: number;
  percent: number;
  hasData: boolean;
  note: string;
  attendance: (string | null)[];
}

export function buildStudentReports(rows: AttendanceRow[]): AttendanceStudentReport[] {
  return rows.map((row) => {
    const present = countMonthPresent(row.attendance);
    const absent = countMonthAbsent(row.attendance);
    const half = countMonthHalf(row.attendance);
    const markedDays = countMarkedDays(row.attendance);
    const notMarked = 31 - markedDays;
    const hasData = markedDays > 0;

    return {
      studentId: row.studentId,
      serial: row.serial,
      name: row.name,
      rollNumber: row.rollNumber,
      grNumber: row.grNumber,
      present,
      absent,
      half,
      notMarked,
      markedDays,
      monthTotal: parseInt(row.monthTotal || "0", 10) || present,
      prevTotal: parseInt(row.prevTotal || "0", 10) || 0,
      cumulative: parseInt(row.cumulative || "0", 10) || 0,
      percent: attendancePercent(present, markedDays),
      hasData,
      note: row.note || "",
      attendance: row.attendance,
    };
  });
}

export function cycleMark(current: string | null): string | null {
  if (!current || current === "") return "P";
  if (current === "P") return "A";
  if (current === "A") return "H";
  return null;
}

export function prevCalendarMonth(month: number, year: number): { month: number; year: number } {
  if (month <= 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

/** Numeric roll ascending: 1, 2, 10 (not 1, 10, 2). Empty rolls go last. */
export function compareRollNumbers(a: string | null | undefined, b: string | null | undefined): number {
  const ra = String(a || "").trim();
  const rb = String(b || "").trim();
  if (!ra && !rb) return 0;
  if (!ra) return 1;
  if (!rb) return -1;

  const na = Number.parseInt(ra.replace(/\D/g, ""), 10);
  const nb = Number.parseInt(rb.replace(/\D/g, ""), 10);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum && na !== nb) return na - nb;
  if (aNum && !bNum) return -1;
  if (!aNum && bNum) return 1;
  return ra.localeCompare(rb, undefined, { numeric: true, sensitivity: "base" });
}

export function buildAttendanceRows(
  students: {
    id: string;
    grNumber?: string | null;
    caste?: string | null;
    category?: string | null;
    dateOfBirth: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    rollNumber?: string | null;
  }[],
  saved: Map<
    string,
    {
      daysJson: string;
      monthTotal: number;
      prevTotal: number;
      cumulative: number;
      schoolFee?: string | null;
      termFee?: string | null;
      admissionFee?: string | null;
      otherFee?: string | null;
      note?: string | null;
    }
  >
): AttendanceRow[] {
  const sorted = [...students].sort((a, b) => {
    const rollCmp = compareRollNumbers(a.rollNumber, b.rollNumber);
    if (rollCmp !== 0) return rollCmp;
    const grCmp = String(a.grNumber || "").localeCompare(String(b.grNumber || ""), undefined, {
      numeric: true,
    });
    if (grCmp !== 0) return grCmp;
    return studentFullName(a).localeCompare(studentFullName(b));
  });

  return sorted.map((s, i) => {
    const rec = saved.get(s.id);
    const days = rec ? parseDaysJson(rec.daysJson) : emptyDays();
    const schoolFee = rec?.schoolFee || "";
    const termFee = rec?.termFee || "";
    const admissionFee = rec?.admissionFee || "";
    const otherFee = rec?.otherFee || "";
    const totalFee =
      [schoolFee, termFee, admissionFee, otherFee]
        .map((x) => parseFloat(x || "0"))
        .filter((n) => !isNaN(n))
        .reduce((a, b) => a + b, 0) || "";
    const monthTotal = rec?.monthTotal ?? countMonthPresent(days);

    return {
      studentId: s.id,
      rollNumber: s.rollNumber || "",
      grNumber: s.grNumber || "",
      caste: s.caste || "",
      category: s.category || "",
      dob: s.dateOfBirth,
      schoolFee,
      termFee,
      admissionFee,
      otherFee,
      totalFee: totalFee ? String(totalFee) : "",
      serial: i + 1,
      name: studentFullName(s),
      attendance: days,
      monthTotal: String(monthTotal),
      prevTotal: String(rec?.prevTotal ?? ""),
      cumulative: String(rec?.cumulative ?? monthTotal + (rec?.prevTotal ?? 0)),
      note: rec?.note || "",
    };
  });
}

export function toClassRegisterRows(rows: AttendanceRow[]): ClassRegisterRow[] {
  return rows.map(({ studentId: _id, rollNumber: _r, ...rest }) => rest);
}
