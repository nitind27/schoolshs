import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildStudentWhere,
  CATEGORY_CHART_COLORS,
  type DashboardFilters,
} from "@/lib/dashboard-analytics";
import { normalizeGender } from "@/lib/gender-utils";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import { studentToSummaryRow } from "@/lib/dashboard-student-export";

export function parseDashboardFilters(searchParams: URLSearchParams): DashboardFilters {
  return {
    standard: searchParams.get("standard") || undefined,
    section: searchParams.get("section") || undefined,
    status: searchParams.get("status") || undefined,
    category: searchParams.get("category") || undefined,
    gender: searchParams.get("gender") || undefined,
  };
}

export async function fetchDashboardExportPayload(
  schoolId: string,
  schoolName: string,
  filters: DashboardFilters,
  filterSummary: string
) {
  const where = buildStudentWhere(schoolId, filters);
  const schoolScope = { schoolId };

  const [
    total,
    draft,
    ready,
    pending,
    submitted,
    approved,
    rejected,
    byCategory,
    totalClasses,
    totalStaff,
    byStandard,
    bySection,
    studentsForGender,
    students,
  ] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count({ where: { ...where, status: "draft" } }),
    prisma.student.count({ where: { ...where, status: "ready" } }),
    prisma.student.count({ where: { ...where, status: "pending" } }),
    prisma.student.count({ where: { ...where, status: "submitted" } }),
    prisma.student.count({ where: { ...where, status: "approved" } }),
    prisma.student.count({ where: { ...where, status: "rejected" } }),
    prisma.student.groupBy({ by: ["category"], where, _count: { category: true } }),
    prisma.schoolClass.count({ where: schoolScope }),
    prisma.staff.count({ where: { ...schoolScope, isActive: true } }),
    prisma.student.groupBy({ by: ["standard"], where: { ...where, standard: { not: null } }, _count: { standard: true } }),
    prisma.student.groupBy({
      by: ["standard", "section"],
      where: { ...where, standard: { not: null }, section: { not: null } },
      _count: { standard: true },
    }),
    prisma.student.findMany({ where, select: { gender: true } }),
    prisma.student.findMany({
      where,
      orderBy: [{ standard: "asc" }, { section: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const byGender = { male: 0, female: 0, other: 0, total: studentsForGender.length };
  for (const s of studentsForGender) {
    const g = normalizeGender(s.gender);
    if (g === "Male") byGender.male++;
    else if (g === "Female") byGender.female++;
    else byGender.other++;
  }

  const byClass = bySection
    .filter((r) => r.standard && r.section)
    .map((r) => ({
      label: `${r.standard}-${r.section}`,
      standard: r.standard!,
      section: r.section!,
      count: r._count.standard,
    }))
    .sort((a, b) => {
      const n = Number(a.standard) - Number(b.standard);
      return isNaN(n) ? a.label.localeCompare(b.label) : n || a.section.localeCompare(b.section);
    });

  const categoryChart = byCategory
    .map((c) => ({
      category: c.category || "Unknown",
      count: c._count.category,
      color: CATEGORY_CHART_COLORS[c.category || "Unknown"] || CATEGORY_CHART_COLORS.Unknown,
    }))
    .sort((a, b) => b.count - a.count);

  const report: DashboardReportData = {
    schoolName,
    generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }),
    filterSummary,
    total,
    totalClasses,
    totalStaff,
    completionRate: total > 0 ? Math.round(((ready + submitted + approved) / total) * 100) : 0,
    byStatus: { draft, ready, pending, submitted, approved, rejected },
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
    byStandard: byStandard
      .filter((s) => s.standard)
      .map((s) => ({ standard: s.standard!, count: s._count.standard }))
      .sort((a, b) => Number(a.standard) - Number(b.standard)),
    byClass,
    byGender,
    categoryChart,
  };

  const studentRows: ExportStudentRow[] = students.map((s, i) => studentToSummaryRow(s, i + 1));

  return { report, students, studentRows };
}

export async function requireSchoolExportAuth() {
  try {
    return await requireSchoolAuth();
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError("Unauthorized", 401);
  }
}
