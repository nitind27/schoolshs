import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  getOrCreateTimetableConfig,
  getClassRelease,
} from "@/lib/timetable-server";
import {
  enabledDays,
  maxPeriodCount,
  periodForDay,
  SCHOOL_SUBJECTS,
  totalSlots,
} from "@/lib/timetable";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const params = request.nextUrl.searchParams;
    const classId = params.get("classId") || "";
    const academicYear = params.get("academicYear") || "2025-26";

    const [classes, staff, days, settings] = await Promise.all([
      prisma.schoolClass.findMany({
        where: { schoolId: session.schoolId },
        orderBy: [{ standard: "asc" }, { section: "asc" }],
        select: {
          id: true,
          name: true,
          standard: true,
          section: true,
          stream: true,
          academicYear: true,
          classTeacher: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.staff.findMany({
        where: { schoolId: session.schoolId, isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, designation: true },
      }),
      getOrCreateTimetableConfig(session.schoolId, academicYear),
      prisma.schoolSettings.findFirst({
        where: { schoolId: session.schoolId },
        select: { schoolName: true },
      }),
    ]);

    const entries = classId
      ? await prisma.timetableEntry.findMany({
          where: { schoolId: session.schoolId, classId, academicYear },
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : [];

    const release = classId
      ? await getClassRelease(session.schoolId, classId, academicYear)
      : null;

    const selectedClass = classes.find((c) => c.id === classId) || null;

    return NextResponse.json({
      classes,
      staff,
      selectedClass,
      academicYear,
      schoolName: settings?.schoolName || session.schoolName,
      days: enabledDays(days),
      allDays: days,
      isReleased: release?.isReleased ?? false,
      releasedAt: release?.releasedAt ?? null,
      maxPeriods: maxPeriodCount(days),
      totalSlots: totalSlots(days),
      entries: entries.map((e) => ({
        dayOfWeek: e.dayOfWeek,
        periodIndex: e.periodIndex,
        subject: e.subject,
        teacherId: e.teacherId,
        teacherName: e.teacher
          ? `${e.teacher.firstName} ${e.teacher.lastName}`.trim()
          : null,
        room: e.room,
      })),
      subjects: SCHOOL_SUBJECTS,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable GET error:", error);
    return NextResponse.json({ error: "Failed to load timetable" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "").trim();
    const academicYear = String(body.academicYear || "2025-26").trim();
    const dayOfWeek = Number(body.dayOfWeek);
    const periodIndex = Number(body.periodIndex);
    const subject = String(body.subject || "").trim();
    const teacherId = body.teacherId ? String(body.teacherId) : null;
    const room = body.room ? String(body.room).trim() : null;

    if (!classId) {
      return NextResponse.json({ error: "Class is required" }, { status: 400 });
    }

    const days = await getOrCreateTimetableConfig(session.schoolId, academicYear);
    const day = days.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day?.enabled) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }
    if (!periodForDay(days, dayOfWeek, periodIndex)) {
      return NextResponse.json({ error: "Invalid period for this day" }, { status: 400 });
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (teacherId) {
      const teacher = await prisma.staff.findFirst({
        where: { id: teacherId, schoolId: session.schoolId },
      });
      if (!teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
    }

    const where = {
      schoolId_classId_academicYear_dayOfWeek_periodIndex: {
        schoolId: session.schoolId,
        classId,
        academicYear,
        dayOfWeek,
        periodIndex,
      },
    };

    if (!subject) {
      await prisma.timetableEntry.deleteMany({
        where: {
          schoolId: session.schoolId,
          classId,
          academicYear,
          dayOfWeek,
          periodIndex,
        },
      });
      return NextResponse.json({ ok: true, cleared: true });
    }

    const entry = await prisma.timetableEntry.upsert({
      where,
      create: {
        schoolId: session.schoolId,
        classId,
        academicYear,
        dayOfWeek,
        periodIndex,
        subject,
        teacherId,
        room,
      },
      update: { subject, teacherId, room },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      entry: {
        dayOfWeek: entry.dayOfWeek,
        periodIndex: entry.periodIndex,
        subject: entry.subject,
        teacherId: entry.teacherId,
        teacherName: entry.teacher
          ? `${entry.teacher.firstName} ${entry.teacher.lastName}`.trim()
          : null,
        room: entry.room,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable PUT error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
