import type { Prisma } from "@/generated/prisma/client";
import { genderDbMatchValues } from "@/lib/gender-utils";

export interface DashboardFilters {
  academicYear?: string;
  standard?: string;
  section?: string;
  status?: string;
  category?: string;
  gender?: string;
}

/** Students linked to a school year via class assignment and/or financialYear field */
export function academicYearStudentClause(
  year: string,
): Prisma.StudentWhereInput {
  return {
    OR: [
      { financialYear: year },
      { schoolClass: { is: { academicYear: year } } },
    ],
  };
}

export function buildStudentWhere(
  schoolId: string,
  filters: DashboardFilters,
): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = { schoolId };
  const and: Prisma.StudentWhereInput[] = [];

  if (filters.academicYear) {
    and.push(academicYearStudentClause(filters.academicYear));
  }
  if (filters.standard) where.standard = filters.standard;
  if (filters.section) where.section = filters.section;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.gender && filters.gender !== "all") {
    where.gender = { in: genderDbMatchValues(filters.gender) };
  }

  if (and.length) where.AND = and;
  return where;
}

export function buildClassWhere(
  schoolId: string,
  academicYear?: string,
): Prisma.SchoolClassWhereInput {
  const where: Prisma.SchoolClassWhereInput = { schoolId };
  if (academicYear) where.academicYear = academicYear;
  return where;
}

export const CATEGORY_CHART_COLORS: Record<string, string> = {
  SC: "#7c3aed",
  ST: "#4f46e5",
  OBC: "#ea580c",
  SEBC: "#d97706",
  EWS: "#0d9488",
  Open: "#64748b",
  Minority: "#059669",
  NTDNT: "#e11d48",
  Unknown: "#94a3b8",
};

export const STATUS_CHART_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  ready: "#3b82f6",
  pending: "#f59e0b",
  submitted: "#10b981",
  approved: "#16a34a",
  rejected: "#ef4444",
};

export const GENDER_CHART_COLORS = {
  male: "#2563eb",
  female: "#db2777",
  other: "#6b7280",
};
