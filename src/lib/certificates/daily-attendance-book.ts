/** Daily Attendance Book — school-wide register (portrait A4) */

import { parseDaysJson } from "@/lib/attendance";
import { parseImportDate } from "@/lib/import/import-formats";

export const DAILY_ATTENDANCE_ROWS = 28;

export type GenderCounts = { boys: number; girls: number };

export type DailyAttendanceBookRow = {
  id?: string;
  serial: number;
  classId: string | null;
  standard: string;
  section: string;
  stream: string;
  isEmpty: boolean;
  present: GenderCounts;
  absent: GenderCounts;
  total: GenderCounts;
  newAdmission: GenderCounts;
  leftSchool: GenderCounts;
  rowTotal: number;
  teacherSign: string;
};

export type DailyAttendanceBookMeta = {
  bookId?: string;
  dateIso: string;
  dateDisplay: string;
  dayOfWeek: string;
  dayOfWeekGu: string;
  academicYear: string;
  schoolName: string;
  workingDay: number | null;
  shift: string;
  avgPercent: number | null;
  principalSign: string;
  saved: boolean;
  grandTotals: {
    present: GenderCounts;
    absent: GenderCounts;
    total: GenderCounts;
    newAdmission: GenderCounts;
    leftSchool: GenderCounts;
    rowTotal: number;
  };
};

export type DailyAttendanceBookPayload = {
  meta: DailyAttendanceBookMeta;
  rows: DailyAttendanceBookRow[];
};

const GUJ_DAYS = ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"];
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function displayToIso(display: string): string {
  const parsed = parseImportDate(display);
  if (!parsed) return "";
  const [d, m, y] = parsed.split("/");
  return `${y}-${m}-${d}`;
}

export function dayLabels(iso: string): { en: string; gu: string } {
  const dt = new Date(`${iso}T12:00:00`);
  const idx = dt.getDay();
  return { en: EN_DAYS[idx] || "", gu: GUJ_DAYS[idx] || "" };
}

function isBoy(gender: string) {
  const g = gender.toLowerCase();
  return g === "male" || g === "m" || g === "boy" || g === "કુમાર";
}

function emptyCounts(): GenderCounts {
  return { boys: 0, girls: 0 };
}

function addCounts(a: GenderCounts, b: GenderCounts): GenderCounts {
  return { boys: a.boys + b.boys, girls: a.girls + b.girls };
}

export function rowTotalCount(row: Pick<DailyAttendanceBookRow, "present" | "absent" | "newAdmission" | "leftSchool">) {
  const enrolled = addCounts(row.present, row.absent);
  const afterAdm = addCounts(enrolled, row.newAdmission);
  return {
    boys: Math.max(0, afterAdm.boys - row.leftSchool.boys),
    girls: Math.max(0, afterAdm.girls - row.leftSchool.girls),
  };
}

export function computeRowTotal(row: Pick<DailyAttendanceBookRow, "present" | "absent" | "newAdmission" | "leftSchool">) {
  const t = rowTotalCount(row);
  return t.boys + t.girls;
}

export function computeAvgPercent(totals: { present: GenderCounts; total: GenderCounts }) {
  const p = totals.present.boys + totals.present.girls;
  const t = totals.total.boys + totals.total.girls;
  if (!t) return null;
  return Math.round((p / t) * 1000) / 10;
}

function datesEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const pa = parseImportDate(a);
  const pb = parseImportDate(b);
  return pa === pb;
}

function studentAdmissionDate(s: { startDate?: string | null; verifiedAt?: Date | null }): string {
  if (s.startDate?.trim()) return parseImportDate(s.startDate);
  if (s.verifiedAt) return parseImportDate(s.verifiedAt.toISOString().slice(0, 10));
  return "";
}

export function countWorkingDaysInMonth(iso: string): number {
  const dt = new Date(`${iso}T12:00:00`);
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const day = dt.getDate();
  let count = 0;
  for (let d = 1; d <= day; d++) {
    const w = new Date(y, m, d).getDay();
    if (w !== 0) count++;
  }
  return count;
}

type ClassInfo = {
  id: string;
  standard: string;
  section: string;
  stream: string;
  classTeacher?: { firstName: string; lastName: string } | null;
};

type StudentLite = {
  id: string;
  gender: string;
  classId: string | null;
  startDate?: string | null;
  verifiedAt?: Date | null;
  status: string;
};

type AttendanceLite = { studentId: string; daysJson: string };

export function buildDailyAttendanceRows(
  classes: ClassInfo[],
  students: StudentLite[],
  attendance: AttendanceLite[],
  leavingByStudent: Map<string, string>,
  targetIso: string
): DailyAttendanceBookRow[] {
  const dt = new Date(`${targetIso}T12:00:00`);
  const month = dt.getMonth() + 1;
  const year = dt.getFullYear();
  const dayIndex = dt.getDate() - 1;
  const targetDisplay = isoToDisplay(targetIso);

  const attMap = new Map(attendance.map((a) => [a.studentId, parseDaysJson(a.daysJson)]));

  const sortedClasses = [...classes].sort((a, b) => {
    const sa = parseInt(a.standard, 10);
    const sb = parseInt(b.standard, 10);
    if (!Number.isNaN(sa) && !Number.isNaN(sb) && sa !== sb) return sa - sb;
    if (a.standard !== b.standard) return a.standard.localeCompare(b.standard, undefined, { numeric: true });
    return a.section.localeCompare(b.section);
  });

  const rows: DailyAttendanceBookRow[] = sortedClasses.map((cls, i) => {
    const classStudents = students.filter((s) => s.classId === cls.id && s.status !== "archived");
    const present = emptyCounts();
    const absent = emptyCounts();
    const newAdmission = emptyCounts();
    const leftSchool = emptyCounts();

    for (const s of classStudents) {
      const boy = isBoy(s.gender);
      const mark = attMap.get(s.id)?.[dayIndex] ?? null;
      if (mark === "P" || mark === "H") {
        if (boy) present.boys++;
        else present.girls++;
      } else if (mark === "A") {
        if (boy) absent.boys++;
        else absent.girls++;
      }

      const admDate = studentAdmissionDate(s);
      if (admDate && datesEqual(admDate, targetDisplay)) {
        if (boy) newAdmission.boys++;
        else newAdmission.girls++;
      }

      const leaveDate = leavingByStudent.get(s.id) || "";
      if (leaveDate && datesEqual(leaveDate, targetDisplay)) {
        if (boy) leftSchool.boys++;
        else leftSchool.girls++;
      }
    }

    const total = addCounts(present, absent);
    const row: DailyAttendanceBookRow = {
      serial: i + 1,
      classId: cls.id,
      standard: cls.standard,
      section: cls.section,
      stream: cls.stream || "",
      isEmpty: false,
      present,
      absent,
      total,
      newAdmission,
      leftSchool,
      rowTotal: 0,
      teacherSign: "",
    };
    row.rowTotal = computeRowTotal(row);
    return row;
  });

  return padDailyAttendanceRows(rows);
}

export function padDailyAttendanceRows(rows: DailyAttendanceBookRow[]): DailyAttendanceBookRow[] {
  const out = [...rows];
  while (out.length < DAILY_ATTENDANCE_ROWS) {
    out.push({
      serial: out.length + 1,
      classId: null,
      standard: "",
      section: "",
      stream: "",
      isEmpty: true,
      present: emptyCounts(),
      absent: emptyCounts(),
      total: emptyCounts(),
      newAdmission: emptyCounts(),
      leftSchool: emptyCounts(),
      rowTotal: 0,
      teacherSign: "",
    });
  }
  return out.slice(0, DAILY_ATTENDANCE_ROWS);
}

export function sumGrandTotals(rows: DailyAttendanceBookRow[]) {
  const dataRows = rows.filter((r) => !r.isEmpty);
  const grand = {
    present: emptyCounts(),
    absent: emptyCounts(),
    total: emptyCounts(),
    newAdmission: emptyCounts(),
    leftSchool: emptyCounts(),
    rowTotal: 0,
  };
  for (const r of dataRows) {
    grand.present = addCounts(grand.present, r.present);
    grand.absent = addCounts(grand.absent, r.absent);
    grand.total = addCounts(grand.total, r.total);
    grand.newAdmission = addCounts(grand.newAdmission, r.newAdmission);
    grand.leftSchool = addCounts(grand.leftSchool, r.leftSchool);
    grand.rowTotal += r.rowTotal;
  }
  return grand;
}

export function storedRowToBookRow(
  stored: {
    id: string;
    serial: number;
    classId: string | null;
    standard: string;
    section: string;
    stream: string;
    presentBoys: number;
    presentGirls: number;
    absentBoys: number;
    absentGirls: number;
    newAdmBoys: number;
    newAdmGirls: number;
    leftBoys: number;
    leftGirls: number;
    teacherSign: string;
  }
): DailyAttendanceBookRow {
  const present = { boys: stored.presentBoys, girls: stored.presentGirls };
  const absent = { boys: stored.absentBoys, girls: stored.absentGirls };
  const newAdmission = { boys: stored.newAdmBoys, girls: stored.newAdmGirls };
  const leftSchool = { boys: stored.leftBoys, girls: stored.leftGirls };
  const total = addCounts(present, absent);
  const row: DailyAttendanceBookRow = {
    id: stored.id,
    serial: stored.serial,
    classId: stored.classId,
    standard: stored.standard,
    section: stored.section,
    stream: stored.stream,
    isEmpty: !stored.standard && !stored.section,
    present,
    absent,
    total,
    newAdmission,
    leftSchool,
    rowTotal: 0,
    teacherSign: stored.teacherSign,
  };
  row.rowTotal = computeRowTotal(row);
  return row;
}

export function mergeStoredRows(
  computed: DailyAttendanceBookRow[],
  stored: DailyAttendanceBookRow[]
): DailyAttendanceBookRow[] {
  const storedByClass = new Map(stored.filter((r) => r.classId).map((r) => [r.classId!, r]));
  const merged = computed.map((r) => {
    if (!r.classId) return r;
    const s = storedByClass.get(r.classId);
    return s ? { ...s, serial: r.serial, standard: r.standard, section: r.section, stream: r.stream, isEmpty: false } : r;
  });
  return padDailyAttendanceRows(merged);
}