import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  calculatePayroll,
  countStaffPresent,
  parseStaffDaysJson,
} from "@/lib/staff-hr";
import { assertStaffInSchool } from "@/lib/school-assertions";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const payrolls = await prisma.staffPayroll.findMany({
      where: { schoolId: session.schoolId, month, year },
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            bankAccount: true,
            ifscCode: true,
            monthlySalary: true,
          },
        },
      },
      orderBy: { staff: { firstName: "asc" } },
    });

    const rows = payrolls.map((p) => ({
      staffId: p.staffId,
      employeeId: p.staff.employeeId || "",
      name: `${p.staff.firstName} ${p.staff.lastName}`,
      designation: p.staff.designation,
      presentDays: p.presentDays,
      absentDays: p.absentDays,
      workingDays: p.workingDays,
      grossSalary: p.grossSalary,
      deductions: p.deductions,
      netSalary: p.netSalary,
      paymentStatus: p.paymentStatus,
      paidAt: p.paidAt?.toISOString() || null,
      bankAccount: p.staff.bankAccount || "",
      ifscCode: p.staff.ifscCode || "",
    }));

    const summary = {
      totalStaff: rows.length,
      totalGross: rows.reduce((s, r) => s + r.grossSalary, 0),
      totalNet: rows.reduce((s, r) => s + r.netSalary, 0),
      paidCount: rows.filter((r) => r.paymentStatus === "paid").length,
      pendingCount: rows.filter((r) => r.paymentStatus === "pending").length,
    };

    return NextResponse.json({ rows, month, year, summary });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    const action = String(body.action || "generate");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year required" }, { status: 400 });
    }

    if (action === "markPaid") {
      const staffId = String(body.staffId || "");
      if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });
      await assertStaffInSchool(session.schoolId, [staffId]);
      const updated = await prisma.staffPayroll.updateMany({
        where: { staffId, month, year, schoolId: session.schoolId },
        data: { paymentStatus: "paid", paidAt: new Date() },
      });
      if (!updated.count) {
        return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    const staffList = await prisma.staff.findMany({
      where: { schoolId: session.schoolId, isActive: true },
      select: {
        id: true,
        monthlySalary: true,
        hra: true,
        conveyance: true,
        pfDeduction: true,
      },
    });

    const attendance = await prisma.staffAttendanceMonth.findMany({
      where: {
        schoolId: session.schoolId,
        staffId: { in: staffList.map((s) => s.id) },
        month,
        year,
      },
    });
    const attMap = new Map(attendance.map((a) => [a.staffId, a]));

    let generated = 0;
    for (const staff of staffList) {
      if (!staff.monthlySalary || staff.monthlySalary <= 0) continue;

      const att = attMap.get(staff.id);
      const days = parseStaffDaysJson(att?.daysJson);
      const presentDays = countStaffPresent(days);
      const absentDays = days.filter((d) => d === "A").length;

      const calc = calculatePayroll(
        staff,
        presentDays,
        absentDays,
        month,
        year
      );

      await prisma.staffPayroll.upsert({
        where: { staffId_month_year: { staffId: staff.id, month, year } },
        create: {
          schoolId: session.schoolId,
          staffId: staff.id,
          month,
          year,
          workingDays: calc.workingDays,
          presentDays: calc.presentDays,
          absentDays: calc.absentDays,
          grossSalary: calc.grossSalary,
          deductions: calc.deductions,
          netSalary: calc.netSalary,
          paymentStatus: "pending",
        },
        update: {
          workingDays: calc.workingDays,
          presentDays: calc.presentDays,
          absentDays: calc.absentDays,
          grossSalary: calc.grossSalary,
          deductions: calc.deductions,
          netSalary: calc.netSalary,
        },
      });
      generated++;
    }

    return NextResponse.json({ success: true, generated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
