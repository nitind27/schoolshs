import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildDailyAttendanceRows,
  computeAvgPercent,
  countWorkingDaysInMonth,
  dayLabels,
  displayToIso,
  isoToDisplay,
  mergeStoredRows,
  padDailyAttendanceRows,
  storedRowToBookRow,
  sumGrandTotals,
  type DailyAttendanceBookPayload,
  type DailyAttendanceBookRow,
} from "@/lib/certificates/daily-attendance-book";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function buildBookPayload(
  schoolId: string,
  dateIso: string,
  academicYear: string
): Promise<DailyAttendanceBookPayload> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, principalName: true },
  });

  const dt = new Date(`${dateIso}T12:00:00`);
  const month = dt.getMonth() + 1;
  const year = dt.getFullYear();
  const days = dayLabels(dateIso);

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId, academicYear },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
    include: {
      classTeacher: { select: { firstName: true, lastName: true } },
    },
  });

  const students = await prisma.student.findMany({
    where: { schoolId, status: { not: "archived" } },
    select: {
      id: true,
      gender: true,
      classId: true,
      startDate: true,
      verifiedAt: true,
      status: true,
    },
  });

  const studentIds = students.map((s) => s.id);
  const attendance = studentIds.length
    ? await prisma.studentAttendanceMonth.findMany({
        where: { schoolId, studentId: { in: studentIds }, month, year },
        select: { studentId: true, daysJson: true },
      })
    : [];

  const grEntries = await prisma.generalRegisterEntry.findMany({
    where: { schoolId, academicYear, studentId: { in: studentIds } },
    select: { studentId: true, leavingDate: true },
  });
  const leavingByStudent = new Map(
    grEntries.filter((e) => e.studentId && e.leavingDate).map((e) => [e.studentId!, e.leavingDate])
  );

  const computed = buildDailyAttendanceRows(classes, students, attendance, leavingByStudent, dateIso);

  const saved = await prisma.dailyAttendanceBook.findUnique({
    where: { schoolId_dateIso_academicYear: { schoolId, dateIso, academicYear } },
    include: { rows: { orderBy: { serial: "asc" } } },
  });

  let rows: DailyAttendanceBookRow[];
  let metaExtras = {
    bookId: saved?.id,
    workingDay: saved?.workingDay ?? countWorkingDaysInMonth(dateIso),
    shift: saved?.shift ?? "",
    avgPercent: saved?.avgPercent ?? null,
    principalSign: saved?.principalSign ?? school?.principalName ?? "",
    dayOfWeek: saved?.dayOfWeek || `${days.gu} / ${days.en}`,
    saved: !!saved,
  };

  if (saved?.rows.length) {
    const storedRows = saved.rows.map(storedRowToBookRow);
    rows = mergeStoredRows(computed, storedRows);
    if (saved.avgPercent == null) {
      metaExtras.avgPercent = computeAvgPercent(sumGrandTotals(rows));
    }
  } else {
    rows = computed;
    metaExtras.avgPercent = computeAvgPercent(sumGrandTotals(rows));
  }

  rows = padDailyAttendanceRows(rows);

  return {
    meta: {
      bookId: metaExtras.bookId,
      dateIso,
      dateDisplay: isoToDisplay(dateIso),
      dayOfWeek: metaExtras.dayOfWeek,
      dayOfWeekGu: days.gu,
      academicYear,
      schoolName: school?.name || "",
      workingDay: metaExtras.workingDay,
      shift: metaExtras.shift,
      avgPercent: metaExtras.avgPercent,
      principalSign: metaExtras.principalSign,
      saved: metaExtras.saved,
      grandTotals: sumGrandTotals(rows),
    },
    rows,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || todayIso();
    const dateIso = dateParam.includes("-") ? dateParam.slice(0, 10) : displayToIso(dateParam) || todayIso();
    const academicYear = searchParams.get("academicYear") || "2025-26";

    const payload = await buildBookPayload(session.schoolId, dateIso, academicYear);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET daily-attendance-book:", error);
    return NextResponse.json({ error: "Failed to load daily attendance book" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const dateIso = String(body.dateIso || body.date || todayIso()).slice(0, 10);
    const academicYear = String(body.academicYear || "2025-26");
    const rows = (body.rows || []) as DailyAttendanceBookRow[];
    const workingDay = body.workingDay != null ? parseInt(String(body.workingDay), 10) : null;
    const shift = String(body.shift || "");
    const dayOfWeek = String(body.dayOfWeek || "");
    const principalSign = String(body.principalSign || "");
    const avgPercent = body.avgPercent != null ? parseFloat(String(body.avgPercent)) : null;

    const dataRows = rows.filter((r) => !r.isEmpty && (r.standard || r.section || r.classId));

    const book = await prisma.dailyAttendanceBook.upsert({
      where: { schoolId_dateIso_academicYear: { schoolId: session.schoolId, dateIso, academicYear } },
      create: {
        schoolId: session.schoolId,
        dateIso,
        academicYear,
        dayOfWeek,
        workingDay: Number.isFinite(workingDay) ? workingDay : null,
        shift,
        avgPercent,
        principalSign,
      },
      update: {
        dayOfWeek,
        workingDay: Number.isFinite(workingDay) ? workingDay : null,
        shift,
        avgPercent,
        principalSign,
      },
    });

    await prisma.dailyAttendanceBookRow.deleteMany({ where: { bookId: book.id } });

    if (dataRows.length) {
      await prisma.dailyAttendanceBookRow.createMany({
        data: dataRows.map((r, i) => ({
          bookId: book.id,
          classId: r.classId,
          serial: r.serial || i + 1,
          standard: r.standard,
          section: r.section,
          stream: r.stream || "",
          presentBoys: r.present.boys,
          presentGirls: r.present.girls,
          absentBoys: r.absent.boys,
          absentGirls: r.absent.girls,
          newAdmBoys: r.newAdmission.boys,
          newAdmGirls: r.newAdmission.girls,
          leftBoys: r.leftSchool.boys,
          leftGirls: r.leftSchool.girls,
          teacherSign: r.teacherSign || "",
        })),
      });
    }

    const payload = await buildBookPayload(session.schoolId, dateIso, academicYear);
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("PUT daily-attendance-book:", error);
    return NextResponse.json({ error: "Failed to save daily attendance book" }, { status: 500 });
  }
}
