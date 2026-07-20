import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildStudentWhere,
  CATEGORY_CHART_COLORS,
  type DashboardFilters,
} from "@/lib/dashboard-analytics";
import { normalizeGender } from "@/lib/gender-utils";

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  return {
    standard: searchParams.get("standard") || undefined,
    section: searchParams.get("section") || undefined,
    status: searchParams.get("status") || undefined,
    category: searchParams.get("category") || undefined,
    gender: searchParams.get("gender") || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const filters = parseFilters(new URL(request.url).searchParams);
    const where = buildStudentWhere(session.schoolId, filters);
    const schoolScope = { schoolId: session.schoolId };

    const [
      total,
      draft,
      ready,
      pending,
      submitted,
      approved,
      rejected,
      byCategory,
      recentSubmissions,
      totalClasses,
      totalStaff,
      byStandard,
      bySection,
      studentsForGender,
      filterStudents,
    ] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({ where: { ...where, status: "draft" } }),
      prisma.student.count({ where: { ...where, status: "ready" } }),
      prisma.student.count({ where: { ...where, status: "pending" } }),
      prisma.student.count({ where: { ...where, status: "submitted" } }),
      prisma.student.count({ where: { ...where, status: "approved" } }),
      prisma.student.count({ where: { ...where, status: "rejected" } }),
      prisma.student.groupBy({ by: ["category"], where, _count: { category: true } }),
      prisma.bulkSubmission.findMany({ where: schoolScope, orderBy: { createdAt: "desc" }, take: 5 }),
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
        where: schoolScope,
        select: { standard: true, section: true, status: true, category: true, gender: true },
      }),
    ]);

    const byGender = { male: 0, female: 0, other: 0, total: studentsForGender.length };
    for (const s of studentsForGender) {
      const g = normalizeGender(s.gender);
      if (g === "Male") byGender.male++;
      else if (g === "Female") byGender.female++;
      else byGender.other++;
    }

    const standards = [...new Set(filterStudents.map((s) => s.standard).filter(Boolean) as string[])].sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b)
    );
    const sections = [...new Set(filterStudents.map((s) => s.section).filter(Boolean) as string[])].sort();
    const statuses = [...new Set(filterStudents.map((s) => s.status).filter(Boolean) as string[])];
    const categories = [...new Set(filterStudents.map((s) => s.category).filter(Boolean) as string[])].sort();
    const genders = [...new Set(filterStudents.map((s) => normalizeGender(s.gender)))];

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

    return NextResponse.json({
      total,
      byStatus: { draft, ready, pending, submitted, approved, rejected },
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
      categoryChart,
      byStandard: byStandard
        .filter((s) => s.standard)
        .map((s) => ({ standard: s.standard, count: s._count.standard }))
        .sort((a, b) => Number(a.standard) - Number(b.standard)),
      byClass,
      byGender,
      totalClasses,
      totalStaff,
      recentSubmissions,
      completionRate: total > 0 ? Math.round(((ready + submitted + approved) / total) * 100) : 0,
      schoolName: session.schoolName,
      filterMeta: {
        standards,
        sections,
        statuses,
        categories,
        genders,
      },
      activeFilters: filters,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
