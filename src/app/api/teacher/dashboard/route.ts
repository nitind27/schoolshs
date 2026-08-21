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
import { getTeacherScope, nowInIndia } from "@/lib/teacher-scope";

/** Aggregated dashboard — homeroom class + timetable teaching classes */
export async function GET() {
  try {
    const session = await requireSchoolAuth(["teacher", "school_admin"]);
    const schoolId = session.schoolId;
    const staffId = session.staffId;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const todayDay = now.getDate();
    const dayOfWeek = nowInIndia().dayOfWeek;

    if (!staffId) {
      return NextResponse.json({
        linked: false,
        schoolName: session.schoolName || "",
        teacherName: session.name || "",
        academicYear: "",
        generatedAt: now.toISOString(),
        defaultClassId: null,
        currentPeriod: null,
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
        students: [],
        todaySchedule: [],
        quickHints: { noStaffLink: true },
      });
    }

    const [scope, school, staff] = await Promise.all([
      getTeacherScope(session),
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
      school?.settings?.academicYear || scope.academicYear || "2025-26";
    const classIds = scope.classes.map((c) => c.id);

    const classes = classIds.length
      ? await prisma.schoolClass.findMany({
          where: { schoolId, id: { in: classIds } },
          include: {
            students: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                surname: true,
                rollNumber: true,
                grNumber: true,
                gender: true,
                category: true,
                status: true,
                sscSeatPrefix: true,
                sscSeatNumber: true,
                hscSeatPrefix: true,
                hscSeatNumber: true,
              },
              orderBy: [{ rollNumber: "asc" }, { surname: "asc" }],
            },
            _count: { select: { students: true } },
          },
        })
      : [];

    const classById = new Map(classes.map((c) => [c.id, c]));
    const orderedClasses = scope.classes
      .map((s) => classById.get(s.id))
      .filter((c): c is (typeof classes)[number] => Boolean(c));
    const studentIds = orderedClasses.flatMap((c) => c.students.map((s) => s.id));

    const [attendanceRows, exams, releasedClassIds, daysConfig, timetableEntries] =
      await Promise.all([
        studentIds.length
          ? prisma.studentAttendanceMonth.findMany({
              where: { schoolId, month, year, studentId: { in: studentIds } },
              select: {
                studentId: true,
                classId: true,
                daysJson: true,
                monthTotal: true,
              },
            })
          : Promise.resolve([]),
        orderedClasses.length
          ? prisma.exam.findMany({
              where: {
                schoolId,
                academicYear,
                examType: "Annual",
                OR: orderedClasses.map((c) => ({
                  standard: c.standard,
                  section: c.section,
                })),
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
        getReleasedClassIds(schoolId, academicYear).catch(
          () => new Set<string>(),
        ),
        getOrCreateTimetableConfig(schoolId, academicYear).catch(() => null),
        prisma.timetableEntry.findMany({
          where: {
            schoolId,
            academicYear,
            teacherId: staffId,
          },
          include: {
            class: {
              select: { id: true, name: true, standard: true, section: true },
            },
          },
          orderBy: [{ dayOfWeek: "asc" }, { periodIndex: "asc" }],
        }),
      ]);

    const attByStudent = new Map(attendanceRows.map((r) => [r.studentId, r]));
    const scopeById = new Map(scope.classes.map((c) => [c.id, c]));

    let boys = 0;
    let girls = 0;
    let other = 0;
    let markedTodayCount = 0;
    let presentMonth = 0;
    let markedMonth = 0;

    const classCards = orderedClasses.map((cls) => {
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
      const scoped = scopeById.get(cls.id);
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
        isHomeroom: scoped?.isHomeroom ?? false,
        isTeaching: scoped?.isTeaching ?? false,
        canMarkAttendance: scoped?.canMarkAttendance ?? false,
        canEnterMarks: scoped?.canEnterMarks ?? false,
        subjects: scoped?.subjects ?? [],
        subjectCodes: scoped?.subjectCodes ?? [],
      };
    });

    for (const c of classCards) {
      if (c.studentCount > 0 && c.markedToday >= c.studentCount)
        markedTodayCount++;
    }
    const attendancePendingToday = classCards.filter(
      (c) => c.studentCount > 0 && c.unmarkedToday > 0 && c.canMarkAttendance,
    ).length;

    const releasedIds =
      releasedClassIds instanceof Set ? releasedClassIds : new Set<string>();
    const filteredEntries = timetableEntries.filter((e) =>
      releasedIds.has(e.classId),
    );

    const todaySchedule = filteredEntries
      .filter((e) => e.dayOfWeek === dayOfWeek)
      .map((e) => {
        const p = daysConfig
          ? periodForDay(daysConfig, e.dayOfWeek, e.periodIndex)
          : null;
        const isNow =
          scope.currentPeriod?.classId === e.classId &&
          scope.currentPeriod?.periodIndex === e.periodIndex;
        return {
          periodIndex: e.periodIndex,
          subject: e.subject,
          room: e.room,
          classId: e.classId,
          className:
            e.class?.name || `${e.class?.standard}-${e.class?.section}`,
          startTime: p?.start || null,
          endTime: p?.end || null,
          label: p ? `P${p.index}` : `P${e.periodIndex}`,
          isNow,
        };
      });

    const totalStudents = studentIds.length;
    const students = orderedClasses.flatMap((cls) =>
      cls.students.map((student) => ({
        ...student,
        classId: cls.id,
        className: cls.name,
        standard: cls.standard,
        section: cls.section,
        boardSeatNumber:
          cls.standard === "12"
            ? [student.hscSeatPrefix, student.hscSeatNumber]
                .filter(Boolean)
                .join("")
            : cls.standard === "10"
              ? [student.sscSeatPrefix, student.sscSeatNumber]
                  .filter(Boolean)
                  .join("")
              : "",
      })),
    );
    const teacherName = staff
      ? `${staff.firstName} ${staff.lastName}`.trim()
      : session.name || "";

    return NextResponse.json({
      linked: true,
      schoolName:
        school?.settings?.schoolName ||
        school?.name ||
        session.schoolName ||
        "",
      teacherName,
      designation: staff?.designation || "",
      academicYear,
      month,
      year,
      generatedAt: now.toISOString(),
      defaultClassId: scope.defaultClassId,
      currentPeriod: scope.currentPeriod,
      stats: {
        totalClasses: classCards.length,
        totalStudents,
        boys,
        girls,
        other,
        avgPerClass:
          classCards.length > 0
            ? Math.round(totalStudents / classCards.length)
            : 0,
        attendanceMarkedToday: markedTodayCount,
        attendancePendingToday,
        monthAttendancePct:
          markedMonth > 0 ? Math.round((presentMonth / markedMonth) * 100) : 0,
        todayPeriods: todaySchedule.length,
        weeklyPeriods: filteredEntries.length,
      },
      classes: classCards,
      students,
      todaySchedule,
      quickHints: {
        noStaffLink: false,
        noClasses: classCards.length === 0,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[teacher/dashboard]", e);
    return NextResponse.json(
      { error: "Failed to load teacher dashboard" },
      { status: 500 },
    );
  }
}
