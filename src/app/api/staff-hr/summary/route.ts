import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const now = new Date();
    const { searchParams } = new URL(request.url);
    const monthRaw = parseInt(searchParams.get("month") || "", 10);
    const yearRaw = parseInt(searchParams.get("year") || "", 10);
    const month =
      Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12
        ? monthRaw
        : now.getMonth() + 1;
    const year =
      Number.isFinite(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
        ? yearRaw
        : now.getFullYear();

    const [totalStaff, withSalary, attendanceMarked, payrollPending, payrollPaid] = await Promise.all([
      prisma.staff.count({ where: { schoolId: session.schoolId, isActive: true } }),
      prisma.staff.count({
        where: { schoolId: session.schoolId, isActive: true, monthlySalary: { gt: 0 } },
      }),
      prisma.staffAttendanceMonth.count({
        where: { schoolId: session.schoolId, month, year },
      }),
      prisma.staffPayroll.count({
        where: { schoolId: session.schoolId, month, year, paymentStatus: "pending" },
      }),
      prisma.staffPayroll.count({
        where: { schoolId: session.schoolId, month, year, paymentStatus: "paid" },
      }),
    ]);

    const monthPayroll = await prisma.staffPayroll.aggregate({
      where: { schoolId: session.schoolId, month, year },
      _sum: { netSalary: true, grossSalary: true },
    });

    return NextResponse.json({
      month,
      year,
      totalStaff,
      withSalary,
      attendanceMarked,
      attendanceUnmarked: Math.max(0, totalStaff - attendanceMarked),
      payrollPending,
      payrollPaid,
      totalGross: monthPayroll._sum.grossSalary || 0,
      totalNet: monthPayroll._sum.netSalary || 0,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
