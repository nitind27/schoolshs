import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(["super_admin"]);

    const [schoolCount, studentCount, adminCount, activeSchools, payments, schools] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.user.count({ where: { role: "school_admin" } }),
      prisma.school.count({ where: { isActive: true } }),
      prisma.schoolPayment.aggregate({ _sum: { amount: true } }),
      prisma.school.findMany({
        include: {
          subscription: { select: { totalAmount: true, paidAmount: true, paymentStatus: true, planName: true, contractValue: true } },
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
