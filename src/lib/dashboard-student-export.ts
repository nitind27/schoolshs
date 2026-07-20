import { CSV_HEADERS, CSV_HEADER_LABELS } from "./constants";
import type { Student } from "@/generated/prisma/client";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft (Incomplete)",
  ready: "Ready to Submit",
  pending: "Pending Review",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export const STUDENT_EXPORT_KEYS = [...CSV_HEADERS, "status"] as const;

export const STUDENT_EXPORT_HEADERS = [
  ...CSV_HEADERS.map((h) => CSV_HEADER_LABELS[h] || h),
  "Application Status",
];

export interface ExportStudentRow {
  sr: number;
  fullName: string;
  standard: string;
  section: string;
  rollNumber: string;
  grNumber: string;
  category: string;
  gender: string;
  status: string;
  statusKey: string;
  mobileNumber: string;
  aadhaarNumber: string;
  cells: (string | number)[];
}

function cellValue(val: unknown): string | number {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return val as string | number;
}

export function studentToExportCells(student: Student): (string | number)[] {
  const base = CSV_HEADERS.map((h) => cellValue(student[h as keyof Student]));
  return [...base, STATUS_LABELS[student.status] || student.status];
}

export function studentToSummaryRow(student: Student, sr: number): ExportStudentRow {
  const fullName = [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");
  return {
    sr,
    fullName,
    standard: student.standard || "",
    section: student.section || "",
    rollNumber: student.rollNumber || "",
    grNumber: student.grNumber || "",
    category: student.category || "",
    gender: student.gender || "",
    status: STATUS_LABELS[student.status] || student.status,
    statusKey: student.status,
    mobileNumber: student.mobileNumber || "",
    aadhaarNumber: student.aadhaarNumber || "",
    cells: studentToExportCells(student),
  };
}

function groupStudentsByField(
  students: Student[],
  field: "standard" | "section" | "status" | "category"
): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  for (const s of students) {
    const raw = s[field];
    const key =
      field === "status"
        ? STATUS_LABELS[raw as string] || String(raw || "Unknown")
        : String(raw || "Unknown");
    const list = map.get(key) || [];
    list.push(s);
    map.set(key, list);
  }
  const entries = [...map.entries()];
  if (field === "standard") {
    entries.sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0]));
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return new Map(entries);
}

export function groupStudentsByStandard(students: Student[]): Map<string, Student[]> {
  return groupStudentsByField(students, "standard");
}

export function groupStudentsBySection(students: Student[]): Map<string, Student[]> {
  return groupStudentsByField(students, "section");
}

export function groupStudentsByStatus(students: Student[]): Map<string, Student[]> {
  return groupStudentsByField(students, "status");
}

export function groupStudentsByCategory(students: Student[]): Map<string, Student[]> {
  return groupStudentsByField(students, "category");
}

export interface ClassStudentGroup {
  standard: string;
  section: string;
  label: string;
  sheetName: string;
  students: Student[];
}

export function sortStudentsForExport(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const stdCmp = Number(a.standard) - Number(b.standard);
    if (!isNaN(stdCmp) && stdCmp !== 0) return stdCmp;
    const secCmp = (a.section || "").localeCompare(b.section || "");
    if (secCmp !== 0) return secCmp;
    const rollA = Number(a.rollNumber);
    const rollB = Number(b.rollNumber);
    if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
    const sur = (a.surname || "").localeCompare(b.surname || "");
    if (sur !== 0) return sur;
    return (a.firstName || "").localeCompare(b.firstName || "");
  });
}

export function classSheetLabel(standard: string, section: string): string {
  return `Std ${standard}-${section}`;
}

export function groupStudentsByClass(students: Student[]): ClassStudentGroup[] {
  const map = new Map<string, ClassStudentGroup>();
  const usedSheetNames = new Set<string>();

  for (const s of students) {
    const standard = s.standard || "Unknown";
    const section = s.section || "Unknown";
    const key = `${standard}::${section}`;
    let group = map.get(key);
    if (!group) {
      let baseName = classSheetLabel(standard, section);
      let sheetName = safeSheetName(baseName);
      let n = 2;
      while (usedSheetNames.has(sheetName)) {
        sheetName = safeSheetName(`${baseName} (${n})`);
        n++;
      }
      usedSheetNames.add(sheetName);
      group = {
        standard,
        section,
        label: `${standard}-${section}`,
        sheetName,
        students: [],
      };
      map.set(key, group);
    }
    group.students.push(s);
  }

  return [...map.values()]
    .map((g) => ({ ...g, students: sortStudentsForExport(g.students) }))
    .sort((a, b) => {
      const std = Number(a.standard) - Number(b.standard);
      if (!isNaN(std) && std !== 0) return std;
      return a.section.localeCompare(b.section);
    });
}

/** Column widths for full student export (Sr. + all CSV columns + status). */
export function studentExportColumnWidth(header: string, index: number): number {
  if (header === "Sr.") return 5;
  if (header.includes("Address")) return 28;
  if (header.includes("Aadhaar") || header === "SSG Child UID (18 digit)") return 18;
  if (header.includes("Account") || header === "IFSC Code") return 16;
  if (header.includes("Name") || header === "Institution Name" || header === "Hostel Name") return 16;
  if (header === "Email") return 22;
  if (header === "Application Status") return 18;
  if (index <= 8) return 14;
  return 12;
}

export function safeSheetName(name: string, max = 31): string {
  return name.replace(/[\\/*?:[\]]/g, "-").slice(0, max);
}
