import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildStaffAttendanceRows,
  countStaffAbsent,
  countStaffHalf,
  countStaffLeave,
  countStaffPresent,
  serializeStaffDays,
} from "@/lib/staff-hr";
import { assertStaffInSchool } from "@/lib/school-assertions";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const designation = searchParams.get("designation");

    const where: Record<string, unknown> = { schoolId: session.schoolId, isActive: true };
    if (designation) where.designation = designation;

    const staffList = await prisma.staff.findMany({
      where,
      orderBy: [{ designation: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        department: true,
        monthlySalary: true,
      },
    });

    const staffIds = staffList.map((s) => s.id);
    const records = staffIds.length
      ? await prisma.staffAttendanceMonth.findMany({
          where: { schoolId: session.schoolId, staffId: { in: staffIds }, month, year },
        })
      : [];

    const saved = new Map(records.map((r) => [r.staffId, { daysJson: r.daysJson, note: r.note }]));
    const rows = buildStaffAttendanceRows(staffList, saved);

    return NextResponse.json({ rows, month, year, staffCount: staffList.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    const entries = (body.rows || []) as {
      staffId: string;
      attendance: (string | null)[];
      note?: string;
    }[];

    if (!month || !year || !entries.length) {
      return NextResponse.json({ error: "month, year and rows required" }, { status: 400 });
    }

    await assertStaffInSchool(
      session.schoolId,
      entries.map((e) => e.staffId),
    );

    let saved = 0;
    for (const entry of entries) {
      const days = entry.attendance?.length === 31 ? entry.attendance : Array(31).fill(null);
      const presentDays = Math.round(countStaffPresent(days) * 10) / 10;
      const absentDays = countStaffAbsent(days);
      const leaveDays = countStaffLeave(days);
      const halfDays = countStaffHalf(days);

      await prisma.staffAttendanceMonth.upsert({
        where: { staffId_month_year: { staffId: entry.staffId, month, year } },
        create: {
          schoolId: session.schoolId,
          staffId: entry.staffId,
          month,
          year,
          daysJson: serializeStaffDays(days),
          presentDays: Math.floor(presentDays),
          absentDays,
          leaveDays,
          halfDays,
          note: entry.note || null,
        },
        update: {
          daysJson: serializeStaffDays(days),
          presentDays: Math.floor(presentDays),
          absentDays,
          leaveDays,
          halfDays,
          note: entry.note || null,
        },
      });
      saved++;
    }

    return NextResponse.json({ success: true, saved });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
