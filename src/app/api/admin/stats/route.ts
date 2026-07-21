import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const schoolIdParam = request.nextUrl.searchParams.get("schoolId")?.trim() || "";
    const filterSchoolId = schoolIdParam && schoolIdParam !== "all" ? schoolIdParam : null;

    if (filterSchoolId) {
      const school = await prisma.school.findUnique({
        where: { id: filterSchoolId },
        include: {
          subscription: {
            select: {
              totalAmount: true,
              paidAmount: true,
              paymentStatus: true,
              planName: true,
              contractValue: true,
            },
          },
          _count: { select: { students: true, users: true } },
        },
      });

      if (!school) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
      }

      const [adminCount, paymentSum] = await Promise.all([
        prisma.user.count({ where: { role: "school_admin", schoolId: filterSchoolId } }),
        prisma.schoolPayment.aggregate({
          where: { schoolId: filterSchoolId },
          _sum: { amount: true },
        }),
      ]);

      const contractValue =
        school.subscription?.totalAmount ?? school.subscription?.contractValue;
      const totalContractValue = contractValue ? Number(contractValue) : 0;
      const totalPaid = school.subscription ? Number(school.subscription.paidAmount) : 0;
      const st = school.subscription?.paymentStatus;
      const pendingPayments =
        st === "pending" || st === "partial" || st === "overdue" ? 1 : 0;

      const planName = school.subscription?.planName || "none";

      return NextResponse.json({
        schoolId: filterSchoolId,
        schoolCount: 1,
        studentCount: school._count.students,
        adminCount,
        activeSchools: school.isActive ? 1 : 0,
        inactiveSchools: school.isActive ? 0 : 1,
        totalRevenue: Number(paymentSum._sum.amount ?? 0),
        totalContractValue,
        totalPaid,
        pendingPayments,
        planBreakdown: { [planName]: 1 },
      });
    }

    const [schoolCount, studentCount, adminCount, activeSchools, payments, schools] =
      await Promise.all([
        prisma.school.count(),
        prisma.student.count(),
        prisma.user.count({ where: { role: "school_admin" } }),
        prisma.school.count({ where: { isActive: true } }),
        prisma.schoolPayment.aggregate({ _sum: { amount: true } }),
        prisma.school.findMany({
          include: {
            subscription: {
              select: {
                totalAmount: true,
                paidAmount: true,
                paymentStatus: true,
                planName: true,
                contractValue: true,
              },
            },
            _count: { select: { students: true } },
          },
        }),
      ]);

    const totalContractValue = schools.reduce((s, sch) => {
      const v = sch.subscription?.totalAmount ?? sch.subscription?.contractValue;
      return s + (v ? Number(v) : 0);
    }, 0);

    const totalPaid = schools.reduce((s, sch) => {
      return s + (sch.subscription ? Number(sch.subscription.paidAmount) : 0);
    }, 0);

    const pendingPayments = schools.filter((s) => {
      const st = s.subscription?.paymentStatus;
      return st === "pending" || st === "partial" || st === "overdue";
    }).length;

    const planBreakdown: Record<string, number> = {};
    for (const s of schools) {
      const plan = s.subscription?.planName || "none";
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
    }

    return NextResponse.json({
      schoolId: "all",
      schoolCount,
      studentCount,
      adminCount,
      activeSchools,
      inactiveSchools: schoolCount - activeSchools,
      totalRevenue: Number(payments._sum.amount ?? 0),
      totalContractValue,
      totalPaid,
      pendingPayments,
      planBreakdown,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
