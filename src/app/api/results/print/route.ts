import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, requireStudentAuth, AuthError } from "@/lib/auth";
import { ANNUAL_RESULT_SUBJECTS } from "@/lib/results/config";
import { computeStudentTotals, subjectFinalMarks } from "@/lib/results/calculations";
import type { Student } from "@/generated/prisma/client";

async function loadStudentsForExam(
  schoolId: string,
  exam: { standard: string | null; section: string | null; academicYear: string },
  filterStudentId: string | null,
  classId: string | null,
  resultStudentIds: string[],
) {
  if (filterStudentId) {
    const st = await prisma.student.findFirst({
      where: { id: filterStudentId, schoolId },
      include: { schoolClass: true },
    });
    return st ? [st] : [];
  }

  const seen = new Set<string>();
  const students: Student[] = [];

  const add = (list: (Student & { schoolClass?: unknown })[]) => {
    for (const s of list) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        students.push(s);
      }
    }
  };

  if (classId) {
    add(
      await prisma.student.findMany({
        where: { schoolId, classId },
        orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        include: { schoolClass: true },
      }),
    );
  }

  const schoolClass = classId
    ? null
    : await prisma.schoolClass.findFirst({
        where: {
          schoolId,
          standard: exam.standard || undefined,
          section: exam.section || undefined,
          academicYear: exam.academicYear,
        },
      });

  if (schoolClass) {
    add(
      await prisma.student.findMany({
        where: { schoolId, classId: schoolClass.id },
        orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        include: { schoolClass: true },
      }),
    );
  }

  if (students.length === 0 && exam.standard) {
    add(
      await prisma.student.findMany({
        where: {
          schoolId,
          standard: exam.standard,
          ...(exam.section ? { OR: [{ section: exam.section }, { section: null }, { section: "" }] } : {}),
        },
        orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        include: { schoolClass: true },
      }),
    );
  }

  if (resultStudentIds.length) {
    add(
      await prisma.student.findMany({
        where: { schoolId, id: { in: resultStudentIds } },
        include: { schoolClass: true },
      }),
    );
  }

  return students.sort((a, b) => {
    const ra = a.rollNumber || "";
    const rb = b.rollNumber || "";
    if (ra !== rb) return ra.localeCompare(rb, undefined, { numeric: true });
    return `${a.surname} ${a.firstName}`.localeCompare(`${b.surname} ${b.firstName}`);
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");

    if (!examId) return NextResponse.json({ error: "examId required" }, { status: 400 });

    let schoolId: string;
    let filterStudentId = studentId;

    try {
      const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
      schoolId = session.schoolId;
    } catch {
      const session = await requireStudentAuth();
      schoolId = session.schoolId!;
      filterStudentId = session.studentId;
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const results = await prisma.examResult.findMany({
      where: { examId, ...(filterStudentId ? { studentId: filterStudentId } : {}) },
      include: { subject: true },
    });

    const resultStudentIds = [...new Set(results.map((r) => r.studentId))];

    const students = await loadStudentsForExam(
      schoolId,
      exam,
      filterStudentId,
      classId,
      resultStudentIds,
    );

    const reportCards = await prisma.reportCard.findMany({
      where: { examId, ...(filterStudentId ? { studentId: filterStudentId } : {}) },
      orderBy: [{ rank: "asc" }],
    });

    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });

    const cards = students.map((student) => {
      const studentResults = results.filter((r) => r.studentId === student.id);
      const rc = reportCards.find((r) => r.studentId === student.id);
      const subjectRows = exam.subjects.map((sub) => {
        const r = studentResults.find((x) => x.subjectId === sub.id);
        return {
          subjectId: sub.id,
          name: sub.name,
          maxMarks: sub.maxMarks,
          marksObtained: r?.marksObtained != null ? r.marksObtained : null,
          achievementMarks: r?.achievementMarks ?? 0,
          graceMarks: r?.graceMarks ?? 0,
          finalMarks: r
            ? subjectFinalMarks({
                marksObtained: r.marksObtained,
                achievementMarks: r.achievementMarks,
                graceMarks: r.graceMarks,
                maxMarks: sub.maxMarks,
                isAbsent: r.isAbsent,
              })
            : null,
          grade: r?.grade ?? null,
          isAbsent: r?.isAbsent ?? false,
        };
      });
      const totals = studentResults.length
        ? computeStudentTotals(
            studentResults.map((r) => ({
              marksObtained: r.marksObtained,
              achievementMarks: r.achievementMarks,
              graceMarks: r.graceMarks,
              maxMarks: r.subject.maxMarks,
              isAbsent: r.isAbsent,
            })),
          )
        : rc
          ? {
              totalObtained: 0,
              totalAchievement: 0,
              totalGrace: 0,
              totalFinal: rc.totalMarks ?? 0,
              percentage: rc.percentage ?? 0,
              grade: rc.grade ?? "",
            }
          : null;

      return {
        student: { ...student, id: student.id },
        reportCard: rc,
        subjects: subjectRows,
        totals,
        hasMarks: studentResults.some((r) => r.marksObtained > 0 || r.achievementMarks > 0 || r.graceMarks > 0 || r.isAbsent),
      };
    });

    return NextResponse.json({
      exam,
      cards,
      settings,
      template: ANNUAL_RESULT_SUBJECTS,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
