import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const schoolIdParam = request.nextUrl.searchParams.get("schoolId")?.trim() || "";
    const filterSchoolId = schoolIdParam && schoolIdParam !== "all" ? schoolIdParam : null;
    const months = lastNMonthKeys(6);
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 5, 1);
    monthStart.setHours(0, 0, 0, 0);

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
          _count: { select: { students: true, users: true, staff: true, classes: true } },
        },
      });

      if (!school) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
      }

      const [adminCount, paymentSum, payments, openTickets] = await Promise.all([
        prisma.user.count({ where: { role: "school_admin", schoolId: filterSchoolId } }),
        prisma.schoolPayment.aggregate({
          where: { schoolId: filterSchoolId },
          _sum: { amount: true },
        }),
        prisma.schoolPayment.findMany({
          where: { schoolId: filterSchoolId, paymentDate: { gte: monthStart } },
          select: { amount: true, paymentDate: true },
          orderBy: { paymentDate: "asc" },
        }),
        prisma.contactSupportMessage.count({
          where: {
            status: { in: ["new", "read"] },
            schoolCode: school.code,
          },
        }),
      ]);

      const contractValue =
        school.subscription?.totalAmount ?? school.subscription?.contractValue;
      const totalContractValue = contractValue ? Number(contractValue) : 0;
      const totalPaid = school.subscription ? Number(school.subscription.paidAmount) : 0;
      const st = school.subscription?.paymentStatus || "pending";
      const pendingPayments = st === "pending" || st === "partial" || st === "overdue" ? 1 : 0;
      const planName = school.subscription?.planName || "none";

      const monthlyMap: Record<string, number> = Object.fromEntries(months.map((k) => [k, 0]));
      for (const p of payments) {
        const k = monthKey(new Date(p.paymentDate));
        if (k in monthlyMap) monthlyMap[k] += Number(p.amount);
      }

      return NextResponse.json({
        schoolId: filterSchoolId,
        schoolCount: 1,
        studentCount: school._count.students,
        staffCount: school._count.staff,
        classCount: school._count.classes,
        userCount: school._count.users,
        adminCount,
        activeSchools: school.isActive ? 1 : 0,
        inactiveSchools: school.isActive ? 0 : 1,
        totalRevenue: Number(paymentSum._sum.amount ?? 0),
        totalContractValue,
        totalPaid,
        pendingPayments,
        openSupportTickets: openTickets,
        collectionRate:
          totalContractValue > 0 ? Math.round((totalPaid / totalContractValue) * 100) : 0,
        planBreakdown: { [planName]: 1 },
        paymentStatusBreakdown: { [st]: 1 },
        districtBreakdown: school.district
          ? [{ label: school.district, value: 1 }]
          : [{ label: "Unspecified", value: 1 }],
        topSchoolsByStudents: [
          {
            id: school.id,
            name: school.name,
            code: school.code,
            students: school._count.students,
            isActive: school.isActive,
          },
        ],
        monthlyPayments: months.map((k) => ({
          key: k,
          label: monthLabel(k),
          amount: Math.round(monthlyMap[k] || 0),
        })),
        schoolsByMonth: months.map((k) => ({
          key: k,
          label: monthLabel(k),
          count: monthKey(school.createdAt) === k ? 1 : 0,
        })),
      });
    }

    const [
      schoolCount,
      studentCount,
      adminCount,
      activeSchools,
      staffCount,
      classCount,
      userCount,
      paymentsAgg,
      schools,
      paymentRows,
      schoolCreated,
      openSupportTickets,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.user.count({ where: { role: "school_admin" } }),
      prisma.school.count({ where: { isActive: true } }),
      prisma.staff.count(),
      prisma.schoolClass.count(),
      prisma.user.count(),
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
      prisma.schoolPayment.findMany({
        where: { paymentDate: { gte: monthStart } },
        select: { amount: true, paymentDate: true },
        orderBy: { paymentDate: "asc" },
      }),
      prisma.school.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { createdAt: true },
      }),
      prisma.contactSupportMessage.count({ where: { status: { in: ["new", "read"] } } }),
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
    const paymentStatusBreakdown: Record<string, number> = {};
    const districtMap: Record<string, number> = {};

    for (const s of schools) {
      const plan = s.subscription?.planName || "none";
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;

      const st = s.subscription?.paymentStatus || "pending";
      paymentStatusBreakdown[st] = (paymentStatusBreakdown[st] || 0) + 1;

      const dist = (s.district || "").trim() || "Unspecified";
      districtMap[dist] = (districtMap[dist] || 0) + 1;
    }

    const districtBreakdown = Object.entries(districtMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const topSchoolsByStudents = [...schools]
      .sort((a, b) => b._count.students - a._count.students)
      .slice(0, 8)
      .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        students: s._count.students,
        isActive: s.isActive,
      }));

    const monthlyMap: Record<string, number> = Object.fromEntries(months.map((k) => [k, 0]));
    for (const p of paymentRows) {
      const k = monthKey(new Date(p.paymentDate));
      if (k in monthlyMap) monthlyMap[k] += Number(p.amount);
    }

    const growthMap: Record<string, number> = Object.fromEntries(months.map((k) => [k, 0]));
    for (const s of schoolCreated) {
      const k = monthKey(new Date(s.createdAt));
      if (k in growthMap) growthMap[k] += 1;
    }

    return NextResponse.json({
      schoolId: "all",
      schoolCount,
      studentCount,
      staffCount,
      classCount,
      userCount,
      adminCount,
      activeSchools,
      inactiveSchools: schoolCount - activeSchools,
      totalRevenue: Number(paymentsAgg._sum.amount ?? 0),
      totalContractValue,
      totalPaid,
      pendingPayments,
      openSupportTickets,
      collectionRate:
        totalContractValue > 0 ? Math.round((totalPaid / totalContractValue) * 100) : 0,
      planBreakdown,
      paymentStatusBreakdown,
      districtBreakdown,
      topSchoolsByStudents,
      monthlyPayments: months.map((k) => ({
        key: k,
        label: monthLabel(k),
        amount: Math.round(monthlyMap[k] || 0),
      })),
      schoolsByMonth: months.map((k) => ({
        key: k,
        label: monthLabel(k),
        count: growthMap[k] || 0,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
