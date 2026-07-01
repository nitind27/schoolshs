import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const scope = { schoolId: session.schoolId };

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
    ] = await Promise.all([
      prisma.student.count({ where: scope }),
      prisma.student.count({ where: { ...scope, status: "draft" } }),
      prisma.student.count({ where: { ...scope, status: "ready" } }),
      prisma.student.count({ where: { ...scope, status: "pending" } }),
      prisma.student.count({ where: { ...scope, status: "submitted" } }),
      prisma.student.count({ where: { ...scope, status: "approved" } }),
      prisma.student.count({ where: { ...scope, status: "rejected" } }),
      prisma.student.groupBy({ by: ["category"], where: scope, _count: { category: true } }),
      prisma.bulkSubmission.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.schoolClass.count({ where: scope }),
      prisma.staff.count({ where: { ...scope, isActive: true } }),
      prisma.student.groupBy({ by: ["standard"], where: { ...scope, standard: { not: null } }, _count: { standard: true } }),
    ]);

    return NextResponse.json({
      total,
      byStatus: { draft, ready, pending, submitted, approved, rejected },
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
      byStandard: byStandard.filter((s) => s.standard).map((s) => ({ standard: s.standard, count: s._count.standard })),
      totalClasses,
      totalStaff,
      recentSubmissions,
      completionRate: total > 0 ? Math.round(((ready + submitted + approved) / total) * 100) : 0,
      schoolName: session.schoolName,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
