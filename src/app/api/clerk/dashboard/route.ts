import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { normalizeGender } from "@/lib/gender-utils";

/** Aggregated counts for clerk operations dashboard */
export async function GET() {
  try {
    const session = await requireSchoolAuth(["clerk", "school_admin"]);
    const schoolId = session.schoolId;
    const scope = { schoolId };
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalStudents,
      draft,
      ready,
      pending,
      submitted,
      approved,
      rejected,
      admissionPending,
      admissionVerified,
      admissionRejected,
      totalClasses,
      totalStaff,
      activeStaff,
      vouchersPending,
      vouchersVerified,
      vouchersTotal,
      withoutPhoto,
      withIdPhoto,
      recentSubmissions,
      attendanceMonths,
      studentsGender,
      byCategory,
      school,
    ] = await Promise.all([
      prisma.student.count({ where: scope }),
      prisma.student.count({ where: { ...scope, status: "draft" } }),
      prisma.student.count({ where: { ...scope, status: "ready" } }),
      prisma.student.count({ where: { ...scope, status: "pending" } }),
      prisma.student.count({ where: { ...scope, status: "submitted" } }),
      prisma.student.count({ where: { ...scope, status: "approved" } }),
      prisma.student.count({ where: { ...scope, status: "rejected" } }),
      prisma.student.count({ where: { ...scope, admissionStatus: "pending" } }),
      prisma.student.count({ where: { ...scope, admissionStatus: "verified" } }),
      prisma.student.count({
        where: { ...scope, admissionStatus: { in: ["rejected", "cancelled"] } },
      }),
      prisma.schoolClass.count({ where: scope }),
      prisma.staff.count({ where: scope }),
      prisma.staff.count({ where: { ...scope, isActive: true } }),
      prisma.voucher.count({ where: { ...scope, auditStatus: "pending" } }).catch(() => 0),
      prisma.voucher.count({ where: { ...scope, auditStatus: "verified" } }).catch(() => 0),
      prisma.voucher.count({ where: scope }).catch(() => 0),
      prisma.student.count({
        where: { ...scope, OR: [{ photoPath: null }, { photoPath: "" }] },
      }),
      prisma.student.count({
        where: { ...scope, NOT: { OR: [{ photoPath: null }, { photoPath: "" }] } },
      }),
      prisma.bulkSubmission.findMany({
        where: scope,
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.studentAttendanceMonth.count({
        where: { schoolId, month, year },
      }).catch(() => 0),
      prisma.student.findMany({ where: scope, select: { gender: true } }),
      prisma.student.groupBy({
        by: ["category"],
        where: scope,
        _count: { category: true },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, settings: { select: { schoolName: true, academicYear: true } } },
      }),
    ]);

    const byGender = { male: 0, female: 0, other: 0 };
    for (const s of studentsGender) {
      const g = normalizeGender(s.gender);
      if (g === "Male") byGender.male++;
      else if (g === "Female") byGender.female++;
      else byGender.other++;
    }

    const scholarshipTotal = ready + pending + submitted + approved;
    const completionRate =
      totalStudents > 0
        ? Math.round(((ready + submitted + approved) / totalStudents) * 100)
        : 0;

    return NextResponse.json({
      schoolName: school?.settings?.schoolName || school?.name || "",
      academicYear: school?.settings?.academicYear || "",
      generatedAt: now.toISOString(),
      students: {
        total: totalStudents,
        male: byGender.male,
        female: byGender.female,
        other: byGender.other,
        withPhoto: withIdPhoto,
        withoutPhoto,
      },
      scholarship: {
        draft,
        ready,
        pending,
        submitted,
        approved,
        rejected,
        total: scholarshipTotal,
        completionRate,
      },
      admissions: {
        pending: admissionPending,
        verified: admissionVerified,
        rejected: admissionRejected,
        total: admissionPending + admissionVerified + admissionRejected,
      },
      classes: { total: totalClasses },
      staff: { total: totalStaff, active: activeStaff },
      accounting: {
        vouchersTotal,
        pending: vouchersPending,
        verified: vouchersVerified,
      },
      attendance: {
        monthsMarkedThisMonth: attendanceMonths,
      },
      idCards: {
        withPhoto: withIdPhoto,
        needingPhoto: withoutPhoto,
      },
      byCategory: byCategory
        .map((c) => ({ category: c.category || "Unknown", count: c._count.category }))
        .sort((a, b) => b.count - a.count),
      recentSubmissions,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[clerk/dashboard]", e);
    return NextResponse.json({ error: "Failed to load clerk dashboard" }, { status: 500 });
  }
}
