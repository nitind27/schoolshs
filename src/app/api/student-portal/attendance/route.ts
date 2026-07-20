import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudentAuth, AuthError } from "@/lib/auth";
import {
  attendancePercent,
  countMarkedDays,
  countMonthAbsent,
  countMonthHalf,
  countMonthPresent,
  emptyDays,
  parseDaysJson,
} from "@/lib/attendance";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const session = await requireStudentAuth();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      select: {
        id: true,
        firstName: true,
        surname: true,
        rollNumber: true,
        grNumber: true,
        standard: true,
        section: true,
        classId: true,
      },
    });

    if (!student) {
      return mobileJson({ error: "Student not found" }, { status: 404 }, origin);
    }

    const record = await prisma.studentAttendanceMonth.findUnique({
      where: {
        studentId_month_year: {
          studentId: session.studentId,
          month,
          year,
        },
      },
    });

    const days = record ? parseDaysJson(record.daysJson) : emptyDays();
    const present = countMonthPresent(days);
    const absent = countMonthAbsent(days);
    const half = countMonthHalf(days);
    const markedDays = countMarkedDays(days);

    return mobileJson(
      {
        student: {
          id: student.id,
          firstName: student.firstName,
          surname: student.surname,
          rollNumber: student.rollNumber,
          grNumber: student.grNumber,
          standard: student.standard,
          section: student.section,
        },
        month,
        year,
        present,
        absent,
        half,
        markedDays,
        notMarked: 31 - markedDays,
        percent: attendancePercent(present, markedDays),
        monthTotal: record?.monthTotal ?? present,
        prevTotal: record?.prevTotal ?? 0,
        cumulative: record?.cumulative ?? present,
        days,
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("GET student-portal/attendance:", error);
    return mobileJson({ error: "Failed to load attendance" }, { status: 500 }, origin);
  }
}
