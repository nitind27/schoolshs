import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  attendancePercent,
  buildAttendanceRows,
  buildStudentReports,
  countMarkedDays,
  countMonthAbsent,
  countMonthHalf,
  countMonthPresent,
  parseDaysJson,
} from "@/lib/attendance";
import {
  mapEntryToGrRow,
  mapStudentToGrRow,
} from "@/lib/certificates/general-register";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        schoolClass: { select: { id: true, name: true, standard: true, section: true, academicYear: true } },
      },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // —— Attendance (current month + history) ——
    const monthRecord = await prisma.studentAttendanceMonth.findFirst({
      where: { schoolId: session.schoolId, studentId: id, month, year },
    });
    const saved = new Map(monthRecord ? [[id, monthRecord]] : []);
    const rows = buildAttendanceRows([student], saved);
    const reports = buildStudentReports(rows);
    const current = reports[0] || null;

    const historyRows = await prisma.studentAttendanceMonth.findMany({
      where: { schoolId: session.schoolId, studentId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 24,
    });

    const history = historyRows.map((h) => {
      const days = parseDaysJson(h.daysJson);
      const marked = countMarkedDays(days);
      const present = countMonthPresent(days);
      const absent = countMonthAbsent(days);
      const half = countMonthHalf(days);
      return {
        month: h.month,
        year: h.year,
        present,
        absent,
        half,
        markedDays: marked,
        notMarked: Math.max(0, 31 - marked),
        monthTotal: h.monthTotal,
        prevTotal: h.prevTotal,
        cumulative: h.cumulative,
        percent: attendancePercent(present, marked),
        note: h.note || "",
      };
    });

    const yearHistory = history.filter((h) => h.year === year);
    const yearTotals = yearHistory.reduce(
      (acc, h) => {
        acc.present += h.present;
        acc.absent += h.absent;
        acc.half += h.half;
        acc.markedDays += h.markedDays;
        return acc;
      },
      { present: 0, absent: 0, half: 0, markedDays: 0 },
    );
    const yearPercent = attendancePercent(yearTotals.present, yearTotals.markedDays);

    // —— General register ——
    let academicYear = student.financialYear || student.schoolClass?.academicYear || "2025-26";
    let classLabel = student.schoolClass?.name || "";
    let classId = student.classId || student.schoolClass?.id || "";

    if (student.classId && !classLabel) {
      const cls = await prisma.schoolClass.findFirst({
        where: { id: student.classId, schoolId: session.schoolId },
        select: { id: true, name: true, standard: true, section: true, academicYear: true },
      });
      if (cls) {
        classId = cls.id;
        classLabel = cls.name || `${cls.standard}-${cls.section}`;
        if (cls.academicYear) academicYear = cls.academicYear;
      }
    }

    const grEntry = await prisma.generalRegisterEntry.findFirst({
      where: {
        schoolId: session.schoolId,
        OR: [{ studentId: id }, ...(student.grNumber ? [{ grNumber: student.grNumber, academicYear }] : [])],
      },
      orderBy: { updatedAt: "desc" },
    });

    const grRow = grEntry
      ? mapEntryToGrRow(grEntry, 1)
      : mapStudentToGrRow(student, 1);

    // —— Report cards / exams ——
    const reportCards = await prisma.reportCard.findMany({
      where: { studentId: id },
      orderBy: [{ academicYear: "desc" }, { updatedAt: "desc" }],
      take: 12,
    });
    const examIds = reportCards.map((r) => r.examId).filter(Boolean) as string[];
    const exams = examIds.length
      ? await prisma.exam.findMany({
          where: { id: { in: examIds }, schoolId: session.schoolId },
          select: { id: true, name: true, examType: true, academicYear: true, isPublished: true },
        })
      : [];
    const examById = new Map(exams.map((e) => [e.id, e]));

    const results = reportCards.map((rc) => {
      const exam = rc.examId ? examById.get(rc.examId) : null;
      return {
        id: rc.id,
        examId: rc.examId,
        examName: exam?.name || rc.academicYear,
        examType: exam?.examType || "",
        academicYear: rc.academicYear,
        standard: rc.standard,
        section: rc.section,
        totalMarks: rc.totalMarks,
        percentage: rc.percentage,
        grade: rc.grade,
        rank: rc.rank,
        result: rc.result,
        attendancePresent: rc.attendancePresent,
        attendanceTotal: rc.attendanceTotal,
        isPublished: rc.isPublished,
        printHref:
          rc.examId && classId
            ? `/results/print?examId=${rc.examId}&studentId=${id}&classId=${classId}&mode=particular`
            : rc.examId
              ? `/results/print?examId=${rc.examId}&studentId=${id}&mode=particular`
              : classId
                ? `/results/student?classId=${classId}&studentId=${id}`
                : null,
      };
    });

    // —— Document completeness ——
    const docFields = [
      student.photoPath || student.idPhotoProcessedPath,
      student.aadhaarDocPath,
      student.incomeCertPath,
      student.casteCertPath,
      student.marksheet10Path,
      student.marksheet12Path,
      student.bankPassbookPath,
      student.feeReceiptPath,
    ];
    const docsUploaded = docFields.filter(Boolean).length;

    return NextResponse.json({
      attendance: {
        month,
        year,
        present: current?.present ?? 0,
        absent: current?.absent ?? 0,
        half: current?.half ?? 0,
        markedDays: current?.markedDays ?? 0,
        notMarked: current?.notMarked ?? 0,
        percent: current?.percent ?? 0,
        cumulative: current?.cumulative ?? 0,
        hasData: current?.hasData ?? false,
        yearTotals: { ...yearTotals, percent: yearPercent },
        history,
      },
      gr: {
        hasSavedEntry: Boolean(grEntry),
        hasGrNumber: Boolean(student.grNumber?.trim()),
        academicYear,
        classLabel,
        classId,
        admissionDate: grRow.admissionDate || "",
        conduct: grRow.conduct || "",
        progress: grRow.progress || "",
        leavingDate: grRow.leavingDate || "",
        lastSchool: grRow.lastSchool || "",
        feeStatus: grRow.feeStatus || "",
        remarks: grRow.remarks || "",
      },
      results,
      docs: {
        uploaded: docsUploaded,
        total: docFields.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET student analysis:", error);
    return NextResponse.json({ error: "Failed to load analysis" }, { status: 500 });
  }
}
