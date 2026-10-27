import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { attendanceRatio, schoolYearMonthsUntil, tallyAttendance } from "@/lib/attendance-shortfall";
import { compareRollNumbers } from "@/lib/attendance";
import { studentListName } from "@/lib/student-names";
import {
  assertSupervisorClassAccess,
  getSupervisorClassIds,
} from "@/lib/supervisor-scope";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "supervisor", "teacher", "clerk"]);
    const { searchParams } = new URL(request.url);
    const classId = String(searchParams.get("classId") || "").trim();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const threshold = Math.min(100, Math.max(1, Number(searchParams.get("threshold")) || 75));
    const scope = searchParams.get("scope") === "year" ? "year" : "month";

    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    await assertTeacherAttendanceAccess(session, classId);
    await assertSupervisorClassAccess(session, classId);
    const supervisorIds = await getSupervisorClassIds(session);
    if (supervisorIds && !supervisorIds.includes(classId)) {
      return NextResponse.json({ error: "Class not assigned" }, { status: 403 });
    }

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true, name: true, standard: true, section: true },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId, classId, status: { not: "archived" } },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        firstNameGu: true,
        middleNameGu: true,
        surnameGu: true,
        rollNumber: true,
        grNumber: true,
        standard: true,
        section: true,
      },
    });

    const windows =
      scope === "year" ? schoolYearMonthsUntil(month, year) : [{ month, year }];
    const saved = students.length
      ? await prisma.studentAttendanceMonth.findMany({
          where: {
            schoolId: session.schoolId,
            studentId: { in: students.map((s) => s.id) },
            OR: windows.map((w) => ({ month: w.month, year: w.year })),
          },
          select: { studentId: true, daysJson: true },
        })
      : [];
    const byStudent = new Map<string, string[]>();
    for (const row of saved) {
      const list = byStudent.get(row.studentId) || [];
      list.push(row.daysJson);
      byStudent.set(row.studentId, list);
    }

    const rows = students
      .map((student) => {
        const tally = tallyAttendance(byStudent.get(student.id) || []);
        return {
          id: student.id,
          name: studentListName(student),
          rollNumber: student.rollNumber || "",
          grNumber: student.grNumber || "",
          standard: student.standard || schoolClass.standard,
          section: student.section || schoolClass.section,
          present: tally.present,
          marked: tally.marked,
          percent: attendanceRatio(tally.present, tally.marked),
          hasData: tally.marked > 0,
        };
      })
      .sort((a, b) => compareRollNumbers(a.rollNumber, b.rollNumber));

    const below = rows.filter((row) => row.hasData && row.percent < threshold);
    const noData = rows.filter((row) => !row.hasData).length;

    return NextResponse.json({
      className: schoolClass.name,
      standard: schoolClass.standard,
      section: schoolClass.section,
      month,
      year,
      threshold,
      scope,
      below,
      noData,
      total: rows.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Failed to load attendance list" }, { status: 500 });
  }
}
