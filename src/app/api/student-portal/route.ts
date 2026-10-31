import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudentAuth, AuthError } from "@/lib/auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";
import {
  parseExamTermMeta,
  readTermInternalScore,
  readTermScore,
  resolveTermInternalMax,
} from "@/lib/results/exam-terms";
import { parseTermRemarks } from "@/lib/results/marks-sheet-config";
import { summarizeTermMarks } from "@/lib/results/exam-rules";
import { loadSchoolExamRules } from "@/lib/results/exam-stats";
import { formatBoardSeatNumber } from "@/lib/exam-seat-series";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireStudentAuth();
    const rules = await loadSchoolExamRules(session.schoolId);

    const student = await prisma.student.findFirst({
      where: { id: session.studentId, schoolId: session.schoolId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            district: true,
            taluka: true,
            city: true,
            phone: true,
            email: true,
            udiseCode: true,
          },
        },
        schoolClass: true,
        reportCards: {
          where: { isPublished: true },
          orderBy: { createdAt: "desc" },
        },
        examResults: {
          where: { exam: { isPublished: true } },
          include: { exam: true, subject: true },
          orderBy: { createdAt: "desc" },
        },
        examSeatAssignments: {
          where: { isPublished: true },
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                standard: true,
                section: true,
                termMeta: true,
              },
            },
            schoolClass: {
              select: { name: true, standard: true, section: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!student) {
      return mobileJson({ error: "Student not found" }, { status: 404 }, origin);
    }

    const examSeatAssignments = student.examSeatAssignments.map((assignment) => {
      const term = parseExamTermMeta(assignment.exam.termMeta).terms.find(
        (item) => item.key === assignment.termKey,
      );
      return {
        id: assignment.id,
        seatNumber: assignment.seatNumber,
        termKey: assignment.termKey,
        termLabelEn: term?.labelEn || assignment.termKey,
        termLabelGu: term?.labelGu || term?.labelEn || assignment.termKey,
        examDate: term?.examDate || null,
        examId: assignment.exam.id,
        academicYear: assignment.exam.academicYear,
        className: assignment.schoolClass.name,
        standard: assignment.schoolClass.standard,
        section: assignment.schoolClass.section,
      };
    });

    const seatByExamTerm = new Map(
      examSeatAssignments.map((item) => [`${item.examId}::${item.termKey}`, item.seatNumber]),
    );

    const resultsByExam = new Map<string, typeof student.examResults>();
    for (const row of student.examResults) {
      const list = resultsByExam.get(row.examId) || [];
      list.push(row);
      resultsByExam.set(row.examId, list);
    }

    const examSummary = [];
    for (const [examId, rows] of resultsByExam) {
      const exam = rows[0]?.exam;
      if (!exam) continue;
      const meta = parseExamTermMeta(exam.termMeta);
      for (const term of meta.terms) {
        if (!term.published && !exam.isPublished) continue;
        const subjectMarks = rows.map((row) => {
          const termData = parseTermRemarks(row.remarks);
          return {
            subjectType: "numeric" as const,
            termValue: readTermScore(term, termData, row.marksObtained),
            internalValue: readTermInternalScore(term, termData),
            paperMax: term.maxMarks,
            internalMax: resolveTermInternalMax(term),
          };
        });
        const summary = summarizeTermMarks(subjectMarks, rules);
        examSummary.push({
          examId,
          examName: exam.name,
          academicYear: exam.academicYear,
          termKey: term.key,
          termLabelEn: term.labelEn,
          termLabelGu: term.labelGu,
          examDate: term.examDate,
          seatNumber: seatByExamTerm.get(`${examId}::${term.key}`) || "",
          obtained: summary.obtained,
          max: summary.max,
          percent: summary.percent,
          percentage: summary.percent,
          grade: summary.grade,
          result: summary.result,
          resultStatus: summary.result,
          pass: summary.result === "pass",
          fail: summary.result === "fail",
        });
      }
    }

    const boardSeatNumber = formatBoardSeatNumber(
      student.schoolClass?.standard || student.standard,
      student,
    );

    return mobileJson(
      {
        student: {
          ...student,
          examSeatAssignments,
          examSummary,
          seatNumber: examSeatAssignments[0]?.seatNumber || "",
          examSeatNumber: examSeatAssignments[0]?.seatNumber || "",
          boardSeatNumber,
        },
        examSummary,
        rules,
      },
      undefined,
      origin,
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}
