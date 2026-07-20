import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

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
