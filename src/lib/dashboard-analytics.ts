import type { Prisma } from "@/generated/prisma/client";

export interface DashboardFilters {
  standard?: string;
  section?: string;
  status?: string;
  category?: string;
  gender?: string;
}

export function buildStudentWhere(
  schoolId: string,
  filters: DashboardFilters
): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = { schoolId };

  if (filters.standard) where.standard = filters.standard;
  if (filters.section) where.section = filters.section;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.gender && filters.gender !== "all") {
    where.gender = filters.gender;
  }

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
