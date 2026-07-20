import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import {
  ensureClassExam,
  getClassMarksSheetConfig,
  syncExamSubjects,
} from "@/lib/class-subjects";
import {
  parseTermRemarks,
  serializeTermRemarks,
  type MarksSheetSubjectDef,
} from "@/lib/results/marks-sheet-config";
import {
  assignSheetRanks,
  buildSubjectInput,
  computeStudentMarksSheet,
  type SubjectMarksInput,
} from "@/lib/results/marks-sheet-calculations";

function matchSubject(
  def: MarksSheetSubjectDef,
  examSubjects: { id: string; name: string; code: string | null }[],
) {
  return (
    examSubjects.find((s) => s.code === def.code) ||
    examSubjects.find((s) => s.name === def.name) ||
    null
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      include: {
        students: {
          orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        },
      },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const { exam, sheetConfig } = await ensureClassExam(session.schoolId, schoolClass);
    const examSubjects = exam.subjects;

    const results = await prisma.examResult.findMany({
      where: { examId: exam.id },
      include: { subject: true },
    });

    const reportCards = await prisma.reportCard.findMany({
      where: { examId: exam.id },
    });

    const students = schoolClass.students.map((st, idx) => {
      const rc = reportCards.find((r) => r.studentId === st.id);
      const subjectInputs: SubjectMarksInput[] = sheetConfig.subjects.map((def) => {
        const examSub = matchSubject(def, examSubjects);
        const result = examSub
          ? results.find((r) => r.studentId === st.id && r.subjectId === examSub.id)
          : null;
        const term = parseTermRemarks(result?.remarks);
        return buildSubjectInput(
          def,
          term,
          result?.marksObtained ?? null,
          result?.achievementMarks ?? null,
          result?.graceMarks ?? null,
        );
      });

      const computed = computeStudentMarksSheet(sheetConfig, subjectInputs);
      const finalTotal = Number(computed.summaryCells.final) || 0;

      return {
        id: st.id,
        firstName: st.firstName,
        middleName: st.middleName,
        surname: st.surname,
        rollNumber: st.rollNumber,
        grNumber: st.grNumber,
        dateOfBirth: st.dateOfBirth,
        examNumber: idx + 1,
        passNumber: rc?.passNumber || String(idx + 1),
        attendancePresent: rc?.attendancePresent ?? null,
        attendanceTotal: rc?.attendanceTotal ?? null,
        subjectInputs,
        computed,
        finalTotal,
        percentage: computed.footer.percentage,
      };
    });

    const ranked = assignSheetRanks(students);
    const rows = ranked.map((row) => ({
      ...row,
      computed: {
        ...row.computed,
        footer: {
          ...row.computed.footer,
          rank: row.rank,
          result: row.computed.footer.result || (row.percentage && row.percentage >= 33 ? "પાસ" : ""),
          percentage: row.percentage,
        },
        summaryCells: {
          ...row.computed.summaryCells,
          rank: row.rank,
          result: row.computed.footer.result || (row.percentage && row.percentage >= 33 ? "પાસ" : ""),
          percentage: row.percentage,
        },
      },
    }));

    return NextResponse.json({
      class: {
        id: schoolClass.id,
        name: schoolClass.name,
        standard: schoolClass.standard,
        section: schoolClass.section,
        stream: schoolClass.stream,
        academicYear: schoolClass.academicYear,
      },
      exam: { id: exam.id, isPublished: exam.isPublished },
      config: sheetConfig,
      examSubjects: examSubjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      students: rows,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load marks sheet" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const { examId, classId, students } = body;

    if (!examId || !classId || !Array.isArray(students)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: session.schoolId },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const sheetConfig = await getClassMarksSheetConfig(
      classId,
      schoolClass.standard,
      schoolClass.stream,
    );
    const examSubjects = await syncExamSubjects(exam.id, sheetConfig.subjects);

    for (const st of students) {
      for (const sub of st.subjectInputs || []) {
        const def = sheetConfig.subjects.find((s) => s.code === sub.subjectCode);
        if (!def) continue;
        const examSub = matchSubject(def, examSubjects);
        if (!examSub) continue;

        const remarks = serializeTermRemarks({
          first: sub.first,
          second: sub.second,
          internal: sub.internal,
          special: sub.special,
          letterGrade: sub.letterGrade,
        });

        await prisma.examResult.upsert({
          where: {
            examId_subjectId_studentId: {
              examId,
              subjectId: examSub.id,
              studentId: st.studentId,
            },
          },
          create: {
            examId,
            subjectId: examSub.id,
            studentId: st.studentId,
            marksObtained: Number(sub.annual) || 0,
            achievementMarks: Number(sub.achievement) || 0,
            graceMarks: Number(sub.grace) || 0,
            remarks,
            grade: sub.letterGrade || null,
          },
          update: {
            marksObtained: Number(sub.annual) || 0,
            achievementMarks: Number(sub.achievement) || 0,
            graceMarks: Number(sub.grace) || 0,
            remarks,
            grade: sub.letterGrade || null,
          },
        });
      }

      const existing = await prisma.reportCard.findFirst({
        where: { studentId: st.studentId, examId },
      });
      const rcData = {
        studentId: st.studentId,
        examId,
        academicYear: exam.academicYear,
        standard: exam.standard || "",
        section: exam.section,
        passNumber: st.passNumber || null,
        attendancePresent: st.attendancePresent != null ? Number(st.attendancePresent) : null,
        attendanceTotal: st.attendanceTotal != null ? Number(st.attendanceTotal) : null,
        totalMarks: st.finalTotal ?? null,
        percentage: st.percentage ?? null,
        result: st.result || null,
        isPublished: exam.isPublished,
      };
      if (existing) await prisma.reportCard.update({ where: { id: existing.id }, data: rcData });
      else await prisma.reportCard.create({ data: rcData });
    }

    return NextResponse.json({ success: true, count: students.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to save marks sheet" }, { status: 500 });
  }
}
