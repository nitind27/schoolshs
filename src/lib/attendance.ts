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

export function buildAttendanceRows(
  students: {
    id: string;
    grNumber?: string | null;
    caste?: string | null;
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
  return students.map((s, i) => {
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
