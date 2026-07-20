import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildAttendanceRows,
  countMonthPresent,
  parseDaysJson,
  prevCalendarMonth,
  serializeDays,
  toClassRegisterRows,
} from "@/lib/attendance";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";
import { assertStudentsInSchool } from "@/lib/school-assertions";

async function fetchStudents(
  schoolId: string,
  classId: string | null,
  standard: string | null,
  section: string | null
) {
  const where: Record<string, unknown> = { schoolId, status: { not: "archived" } };
  if (classId) where.classId = classId;
  if (standard) where.standard = standard;
  if (section) where.section = section;

  return prisma.student.findMany({
    where,
    orderBy: [{ rollNumber: "asc" }, { grNumber: "asc" }, { firstName: "asc" }],
    include: { schoolClass: { select: { name: true, standard: true, section: true } } },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    await assertTeacherAttendanceAccess(session, classId);

    const students = await fetchStudents(
      session.schoolId,
      classId,
      standard,
      section
    );

    const studentIds = students.map((s) => s.id);
    const records = studentIds.length
      ? await prisma.studentAttendanceMonth.findMany({
          where: { schoolId: session.schoolId, studentId: { in: studentIds }, month, year },
        })
      : [];

    const saved = new Map(records.map((r) => [r.studentId, r]));
    const rows = buildAttendanceRows(students, saved);

    const std = standard || students[0]?.standard || students[0]?.schoolClass?.standard || "";
    const sec = section || students[0]?.section || students[0]?.schoolClass?.section || "";

    return NextResponse.json({
      rows,
      registerRows: toClassRegisterRows(rows),
      month: String(month),
      year: String(year),
      standard: std,
      section: sec,
      studentCount: students.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET attendance:", error);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = body.classId ? String(body.classId) : null;
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    const entries = (body.rows || []) as {
      studentId: string;
      attendance: (string | null)[];
      rollNumber?: string;
      schoolFee?: string;
      termFee?: string;
      admissionFee?: string;
      otherFee?: string;
      note?: string;
    }[];

    if (!month || !year || !entries.length) {
      return NextResponse.json({ error: "month, year and rows required" }, { status: 400 });
    }

    await assertTeacherAttendanceAccess(session, classId);

    const studentIds = entries.map((e) => e.studentId);
    await assertStudentsInSchool(session.schoolId, studentIds);

    // Persist roll numbers edited in the attendance grid
    for (const entry of entries) {
      if (entry.rollNumber === undefined) continue;
      const rollNumber = String(entry.rollNumber ?? "").trim() || null;
      await prisma.student.update({
        where: { id: entry.studentId },
        data: { rollNumber },
      });
    }

    const prev = prevCalendarMonth(month, year);

    const prevRecords = await prisma.studentAttendanceMonth.findMany({
      where: { schoolId: session.schoolId, studentId: { in: studentIds }, month: prev.month, year: prev.year },
    });
    const prevMap = new Map(prevRecords.map((r) => [r.studentId, r.cumulative]));

    let saved = 0;
    for (const entry of entries) {
      const days = entry.attendance?.length === 31 ? entry.attendance : parseDaysJson(null);
      const monthTotal = countMonthPresent(days);
      const prevTotal = prevMap.get(entry.studentId) ?? 0;
      const cumulative = prevTotal + monthTotal;

      await prisma.studentAttendanceMonth.upsert({
        where: { studentId_month_year: { studentId: entry.studentId, month, year } },
        create: {
          schoolId: session.schoolId,
          studentId: entry.studentId,
          classId,
          month,
          year,
          daysJson: serializeDays(days),
          monthTotal,
          prevTotal,
          cumulative,
          schoolFee: entry.schoolFee || null,
          termFee: entry.termFee || null,
          admissionFee: entry.admissionFee || null,
          otherFee: entry.otherFee || null,
          note: entry.note || null,
        },
        update: {
          classId,
          daysJson: serializeDays(days),
          monthTotal,
          prevTotal,
          cumulative,
          schoolFee: entry.schoolFee || null,
          termFee: entry.termFee || null,
          admissionFee: entry.admissionFee || null,
          otherFee: entry.otherFee || null,
          note: entry.note || null,
        },
      });
      saved++;
    }

    return NextResponse.json({ success: true, saved });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("PUT attendance:", error);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
