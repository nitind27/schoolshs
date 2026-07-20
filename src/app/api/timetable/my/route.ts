import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  getOrCreateTimetableConfig,
  getReleasedClassIds,
} from "@/lib/timetable-server";
import {
  enabledDays,
  periodForDay,
  SCHOOL_SUBJECTS,
  type TimetableCell,
} from "@/lib/timetable";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["teacher", "clerk", "school_admin"]);
    const academicYear = request.nextUrl.searchParams.get("academicYear") || "2025-26";
    const staffIdParam = request.nextUrl.searchParams.get("staffId");

    // Prefer live DB link — session JWT staffId can go stale after re-seed
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { staffId: true },
    });

    const staffId =
      session.role === "school_admin" && staffIdParam
        ? staffIdParam
        : dbUser?.staffId || session.staffId || null;

    if (!staffId) {
      return NextResponse.json(
        {
          error: "Staff profile not linked",
          staff: null,
          academicYear,
          days: [],
          entries: [],
          message: "no_staff",
        },
        { status: 403 }
      );
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId: session.schoolId },
      select: { id: true, firstName: true, lastName: true, designation: true },
    });
    if (!staff) {
      return NextResponse.json(
        {
          error: "Staff not found",
          staff: null,
          academicYear,
          days: [],
          entries: [],
          message: "staff_missing",
        },
        { status: 404 }
      );
    }

    const [days, releasedClassIds] = await Promise.all([
      getOrCreateTimetableConfig(session.schoolId, academicYear),
      getReleasedClassIds(session.schoolId, academicYear),
    ]);

    const releasedIds = Array.from(releasedClassIds);
    if (!releasedIds.length) {
      return NextResponse.json({
        staff,
        academicYear,
        days: enabledDays(days),
        entries: [],
        subjects: SCHOOL_SUBJECTS,
        message: "not_released",
      });
    }

    const entries = await prisma.timetableEntry.findMany({
      where: {
        schoolId: session.schoolId,
        academicYear,
        teacherId: staffId,
        classId: { in: releasedIds },
      },
      include: {
        class: { select: { id: true, name: true, standard: true, section: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
    });

    const mapped: TimetableCell[] = entries.map((e) => {
      const p = periodForDay(days, e.dayOfWeek, e.periodIndex);
      void p;
      return {
        dayOfWeek: e.dayOfWeek,
        periodIndex: e.periodIndex,
        subject: e.subject,
        teacherId: e.teacherId,
        teacherName: e.teacher
          ? `${e.teacher.firstName} ${e.teacher.lastName}`.trim()
          : null,
        room: e.room,
        classId: e.classId,
        className: e.class?.name ?? null,
      };
    });

    const settings = await prisma.schoolSettings.findFirst({
      where: { schoolId: session.schoolId },
      select: { schoolName: true },
    });

    return NextResponse.json({
      staff,
      schoolName: settings?.schoolName || session.schoolName,
      academicYear,
      days: enabledDays(days),
      entries: mapped,
      subjects: SCHOOL_SUBJECTS,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable my GET:", error);
    return NextResponse.json({ error: "Failed to load timetable" }, { status: 500 });
  }
}
