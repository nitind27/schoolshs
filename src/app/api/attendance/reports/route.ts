import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildAttendanceRows,
  buildStudentReports,
  countMarkedDays,
  countMonthAbsent,
  countMonthHalf,
  countMonthPresent,
  parseDaysJson,
} from "@/lib/attendance";

async function fetchStudents(
  schoolId: string,
  classId: string | null,
  standard: string | null,
  section: string | null,
  studentId?: string | null
) {
  const where: Record<string, unknown> = { schoolId, status: { not: "archived" } };
  if (studentId) where.id = studentId;
  if (classId) where.classId = classId;
  if (standard) where.standard = standard;
  if (section) where.section = section;

  return prisma.student.findMany({
    where,
    orderBy: [{ rollNumber: "asc" }, { grNumber: "asc" }, { firstName: "asc" }],
    include: { schoolClass: { select: { id: true, name: true, standard: true, section: true } } },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    if (!classId && !standard && !studentId) {
      return NextResponse.json({ error: "classId or standard or studentId required" }, { status: 400 });
    }

    const students = await fetchStudents(session.schoolId, classId, standard, section, studentId);
    if (!students.length) {
      return NextResponse.json({
        summary: {
          totalStudents: 0,
          markedStudents: 0,
          avgPercent: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalf: 0,
          totalMarkedDays: 0,
        },
        students: [],
        month: String(month),
        year: String(year),
        standard: standard || "",
        section: section || "",
        className: "",
      });
    }

    const studentIds = students.map((s) => s.id);
    const records = await prisma.studentAttendanceMonth.findMany({
      where: { schoolId: session.schoolId, studentId: { in: studentIds }, month, year },
    });
    const saved = new Map(records.map((r) => [r.studentId, r]));
    const rows = buildAttendanceRows(students, saved);
    const reports = buildStudentReports(rows);

    const first = students[0]!;
    const std = standard || first.standard || first.schoolClass?.standard || "";
    const sec = section || first.section || first.schoolClass?.section || "";
    const className = first.schoolClass?.name || `${std}-${sec}`;

    const markedStudents = reports.filter((r) => r.hasData).length;
    const totalPresent = reports.reduce((s, r) => s + r.present, 0);
    const totalAbsent = reports.reduce((s, r) => s + r.absent, 0);
    const totalHalf = reports.reduce((s, r) => s + r.half, 0);
    const totalMarkedDays = reports.reduce((s, r) => s + r.markedDays, 0);
    const avgPercent = reports.length
      ? Math.round(reports.reduce((s, r) => s + r.percent, 0) / reports.length)
      : 0;

    let studentDetail = null;
    if (studentId) {
      const target = reports.find((r) => r.studentId === studentId) || reports[0];
      if (target) {
        const history = await prisma.studentAttendanceMonth.findMany({
          where: { schoolId: session.schoolId, studentId: target.studentId },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 12,
        });

        studentDetail = {
          ...target,
          className,
          standard: std,
          section: sec,
          history: history.map((h) => {
            const days = parseDaysJson(h.daysJson);
            const marked = countMarkedDays(days);
            return {
              month: h.month,
              year: h.year,
              present: countMonthPresent(days),
              absent: countMonthAbsent(days),
              half: countMonthHalf(days),
              markedDays: marked,
              monthTotal: h.monthTotal,
              prevTotal: h.prevTotal,
              cumulative: h.cumulative,
              attendance: days,
              note: h.note || "",
            };
          }),
        };
      }
    }

    return NextResponse.json({
      summary: {
        totalStudents: reports.length,
        markedStudents,
        avgPercent,
        totalPresent,
        totalAbsent,
        totalHalf,
        totalMarkedDays,
      },
      students: reports,
      studentDetail,
      month: String(month),
      year: String(year),
      standard: std,
      section: sec,
      className,
      classId: classId || first.schoolClass?.id || first.classId || "",
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET attendance reports:", error);
    return NextResponse.json({ error: "Failed to load attendance report" }, { status: 500 });
  }
}
