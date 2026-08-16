import { standardToCourseName } from "@/lib/constants";
import { MANAGE_STANDARDS } from "@/lib/class-structure";

type PlacementClass = {
  id: string;
  standard: string;
  section: string;
  academicYear: string;
  institutionName?: string | null;
  institutionDistrict?: string | null;
};

export function normalizeStandard(value: unknown): string {
  return String(value || "").trim();
}

export function isManageStandard(standard: string) {
  return (MANAGE_STANDARDS as readonly string[]).includes(standard);
}

/** Copy class fields onto the student, or keep standard-only (no division yet). */
export function applyStudentPlacement(
  data: Record<string, unknown>,
  assignedClass: PlacementClass | null,
): { error?: string } {
  if (assignedClass) {
    data.classId = assignedClass.id;
    data.standard = assignedClass.standard;
    data.section = assignedClass.section;
    data.institutionName = assignedClass.institutionName || data.institutionName;
    data.institutionDistrict = assignedClass.institutionDistrict || data.institutionDistrict;
    data.financialYear = assignedClass.academicYear || data.financialYear;
    data.courseName = data.courseName || standardToCourseName(assignedClass.standard);
    return {};
  }

  const standard = normalizeStandard(data.standard);
  if (!standard) {
    return { error: "Standard is required. Pick Std 9, 10, 11 or 12 — division can wait." };
  }
  data.classId = null;
  data.standard = standard;
  const section = String(data.section || "").trim();
  data.section = section || null;
  data.courseName = data.courseName || standardToCourseName(standard);
  return {};
}

export function isPendingDivision(student: {
  classId?: string | null;
  standard?: string | null;
  section?: string | null;
}) {
  return Boolean(student.standard) && !student.classId && !String(student.section || "").trim();
}
