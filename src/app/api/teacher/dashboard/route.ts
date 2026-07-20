import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { normalizeGender } from "@/lib/gender-utils";
import {
  countMarkedDays,
  countMonthPresent,
  parseDaysJson,
} from "@/lib/attendance";
import {
  getOrCreateTimetableConfig,
  getReleasedClassIds,
} from "@/lib/timetable-server";
import { periodForDay } from "@/lib/timetable";

/** Aggregated dashboard for class teachers — scoped to assigned classes */
export async function GET() {
  try {
    const session = await requireSchoolAuth(["teacher", "school_admin"]);
    const schoolId = session.schoolId;
    const staffId = session.staffId;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const todayDay = now.getDate(); // 1–31
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon … 7=Sun

    if (!staffId) {
      return NextResponse.json({
        linked: false,
        schoolName: session.schoolName || "",
        teacherName: session.name || "",
        academicYear: "",
        generatedAt: now.toISOString(),
        stats: {
          totalClasses: 0,
          totalStudents: 0,
          boys: 0,
          girls: 0,
          avgPerClass: 0,
          attendanceMarkedToday: 0,
          attendancePendingToday: 0,
          monthAttendancePct: 0,
          todayPeriods: 0,
          weeklyPeriods: 0,
        },
        classes: [],
        todaySchedule: [],
        quickHints: { noStaffLink: true },
      });
    }

    const [classes, school, staff] = await Promise.all([
      prisma.schoolClass.findMany({
        where: { schoolId, classTeacherId: staffId },
        orderBy: [{ standard: "asc" }, { section: "asc" }],
        include: {
          students: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              rollNumber: true,
              gender: true,
              status: true,
            },
            orderBy: [{ rollNumber: "asc" }, { surname: "asc" }],
          },
          _count: { select: { students: true } },
        },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          settings: { select: { schoolName: true, academicYear: true } },
        },
      }),
      prisma.staff.findFirst({
        where: { id: staffId, schoolId },
        select: { firstName: true, lastName: true, designation: true },
      }),
    ]);

    const academicYear =
      school?.settings?.academicYear ||
      classes[0]?.academicYear ||
      "2025-26";
    const classIds = classes.map((c) => c.id);
    const studentIds = classes.flatMap((c) => c.students.map((s) => s.id));

    const [attendanceRows, exams, releasedClassIds, daysConfig, timetableEntries] =
      await Promise.all([
        studentIds.length
          ? prisma.studentAttendanceMonth.findMany({
              where: { schoolId, month, year, studentId: { in: studentIds } },
              select: { studentId: true, classId: true, daysJson: true, monthTotal: true },
            })
          : Promise.resolve([]),
        classIds.length
          ? prisma.exam.findMany({
              where: {
                schoolId,
                academicYear,
                examType: "Annual",
                OR: classes.map((c) => ({ standard: c.standard, section: c.section })),
              },
              select: {
                id: true,
                standard: true,
                section: true,
                isPublished: true,
                termMeta: true,
              },
            })
          : Promise.resolve([]),
        getReleasedClassIds(schoolId, academicYear).catch(() => new Set<string>()),
        getOrCreateTimetableConfig(schoolId, academicYear).catch(() => null),
        staffId
          ? prisma.timetableEntry.findMany({
              where: {
                schoolId,
                academicYear,
                teacherId: staffId,
              },
              include: {
                class: { select: { id: true, name: true, standard: true, section: true } },
              },
              orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
            })
          : Promise.resolve([]),
      ]);

    const attByStudent = new Map(attendanceRows.map((r) => [r.studentId, r]));

    let boys = 0;
    let girls = 0;
    let other = 0;
    let markedTodayCount = 0;
    let presentMonth = 0;
    let markedMonth = 0;

    const classCards = classes.map((cls) => {
      let classBoys = 0;
      let classGirls = 0;
      let markedToday = 0;
      let presentToday = 0;
      let classPresentMonth = 0;
      let classMarkedMonth = 0;

      for (const s of cls.students) {
        const g = normalizeGender(s.gender);
        if (g === "Male") {
          boys++;
          classBoys++;
        } else if (g === "Female") {
          girls++;
          classGirls++;
        } else {
          other++;
        }

        const att = attByStudent.get(s.id);
        if (!att) continue;
        const days = parseDaysJson(att.daysJson);
        const todayMark = days[todayDay - 1];
        if (todayMark === "P" || todayMark === "A" || todayMark === "H") {
          markedToday++;
          if (todayMark === "P" || todayMark === "H") presentToday++;
        }
        const p = countMonthPresent(days);
        const m = countMarkedDays(days);
        classPresentMonth += p;
        classMarkedMonth += m;
        presentMonth += p;
        markedMonth += m;
      }

      const exam = exams.find(
        (e) => e.standard === cls.standard && e.section === cls.section,
      );

      const studentCount = cls._count.students;
      const attendancePct =
        classMarkedMonth > 0
          ? Math.round((classPresentMonth / classMarkedMonth) * 100)
          : 0;

      return {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: cls.stream,
        academicYear: cls.academicYear,
        studentCount,
        boys: classBoys,
        girls: classGirls,
        markedToday,
        presentToday,
        unmarkedToday: Math.max(0, studentCount - markedToday),
        attendancePct,
        examPublished: exam?.isPublished ?? false,
        examId: exam?.id ?? null,
      };
    });

    for (const c of classCards) {
      if (c.studentCount > 0 && c.markedToday >= c.studentCount) markedTodayCount++;
    }
    const attendancePendingToday = classCards.filter(
      (c) => c.studentCount > 0 && c.unmarkedToday > 0,
    ).length;

    const releasedIds = releasedClassIds instanceof Set ? releasedClassIds : new Set<string>();
    const filteredEntries = timetableEntries.filter(
      (e) => releasedIds.size === 0 || releasedIds.has(e.classId),
    );

    const todaySchedule = filteredEntries
      .filter((e) => e.dayOfWeek === dayOfWeek)
      .map((e) => {
        const p = daysConfig ? periodForDay(daysConfig, e.dayOfWeek, e.periodIndex) : null;
        return {
          periodIndex: e.periodIndex,
          subject: e.subject,
          room: e.room,
          classId: e.classId,
          className: e.class?.name || `${e.class?.standard}-${e.class?.section}`,
          startTime: p?.start || null,
          endTime: p?.end || null,
          label: p ? `P${p.index}` : `P${e.periodIndex}`,
        };
      });

    const totalStudents = studentIds.length;
    const teacherName = staff
      ? `${staff.firstName} ${staff.lastName}`.trim()
      : session.name || "";

    return NextResponse.json({
      linked: true,
      schoolName: school?.settings?.schoolName || school?.name || session.schoolName || "",
      teacherName,
      designation: staff?.designation || "",
      academicYear,
      month,
      year,
      generatedAt: now.toISOString(),
      stats: {
        totalClasses: classes.length,
        totalStudents,
        boys,
        girls,
        other,
        avgPerClass:
          classes.length > 0 ? Math.round(totalStudents / classes.length) : 0,
        attendanceMarkedToday: markedTodayCount,
        attendancePendingToday,
        monthAttendancePct:
          markedMonth > 0 ? Math.round((presentMonth / markedMonth) * 100) : 0,
        todayPeriods: todaySchedule.length,
        weeklyPeriods: filteredEntries.length,
      },
      classes: classCards,
      todaySchedule,
      quickHints: {
        noStaffLink: false,
        noClasses: classes.length === 0,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[teacher/dashboard]", e);
    return NextResponse.json({ error: "Failed to load teacher dashboard" }, { status: 500 });
  }
}
