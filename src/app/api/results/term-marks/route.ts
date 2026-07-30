import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { ensureClassExam, getClassMarksSheetConfig } from "@/lib/class-subjects";
import type { MarksSheetConfig } from "@/lib/results/marks-sheet-config";
import {
  activeExamTerms,
  buildStudentTermRows,
  clampTermMarks,
  computeTermCompletion,
  defaultExamTermMeta,
  getTerm,
  isValidTermKey,
  metaFromTemplateTerms,
  parseExamTermMeta,
  parseTermRemarks,
  serializeExamTermMeta,
  serializeTermRemarks,
  writeTermInternalScore,
  writeTermScore,
  type ExamTermKey,
  type ExamTermMeta,
} from "@/lib/results/exam-terms";

function termStatsForExam(
  meta: ExamTermMeta,
  sheetConfig: MarksSheetConfig,
  students: Array<{ id: string }>,
  results: Array<{ studentId: string; subjectId: string; marksObtained: number; remarks: string | null }>,
  examSubjects: Array<{ id: string; code: string | null; name: string }>,
) {
  return activeExamTerms(meta).map((term) => {
    const rows = buildStudentTermRows(
      term.key,
      meta,
      sheetConfig,
      students.map((s) => ({ ...s, firstName: "", surname: "" })),
      results,
      examSubjects,
    );
    const completion = computeTermCompletion(term, meta, rows);
    return {
      key: term.key,
      labelEn: term.labelEn,
      labelGu: term.labelGu,
      role: term.role,
      maxMarks: term.maxMarks,
      internalMax: term.internalMax ?? 0,
      published: term.published,
      locked: term.locked,
      examDate: term.examDate,
      ...completion,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const classId = request.nextUrl.searchParams.get("classId");
    const termParam = request.nextUrl.searchParams.get("term") as ExamTermKey | null;

    if (!classId) {
      return NextResponse.json({ error: "classId required" }, { status: 400 });
    }

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
    const meta = parseExamTermMeta(exam.termMeta);
    const results = await prisma.examResult.findMany({ where: { examId: exam.id } });

    const termStats = termStatsForExam(
      meta,
      sheetConfig,
      schoolClass.students,
      results,
      exam.subjects,
    );

    if (!termParam) {
      return NextResponse.json({
        class: {
          id: schoolClass.id,
          name: schoolClass.name,
          standard: schoolClass.standard,
          section: schoolClass.section,
          stream: schoolClass.stream,
          academicYear: schoolClass.academicYear,
          studentCount: schoolClass.students.length,
        },
        exam: { id: exam.id, isPublished: exam.isPublished },
        termMeta: meta,
        termStats,
        subjects: sheetConfig.subjects,
      });
    }

    if (!isValidTermKey(termParam, meta)) {
      return NextResponse.json({ error: "Invalid or disabled exam term" }, { status: 400 });
    }

    const term = getTerm(meta, termParam);
    if (!term) {
      return NextResponse.json({ error: "Invalid or disabled exam term" }, { status: 400 });
    }
    const students = buildStudentTermRows(
      termParam,
      meta,
      sheetConfig,
      schoolClass.students,
      results,
      exam.subjects,
    );
    const completion = computeTermCompletion(term, meta, students);

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
      term,
      termMeta: meta,
      subjects: sheetConfig.subjects.filter((s) => s.type === "numeric" || term.role === "final"),
      students,
      completion,
      editable: !term.locked && !term.published,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load term marks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const { action, examId, classId } = body;

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId: session.schoolId },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const meta = parseExamTermMeta(exam.termMeta);

    if (action === "update_config") {
      if (!["school_admin", "clerk"].includes(session.role)) {
        return NextResponse.json({ error: "Only admin or clerk can change exam settings" }, { status: 403 });
      }

      let next: ExamTermMeta;
      if (Array.isArray(body.templateTerms) && body.templateTerms.length) {
        next = metaFromTemplateTerms(body.templateTerms);
      } else if (Array.isArray(body.termsList) && body.termsList.length) {
        next = metaFromTemplateTerms(body.termsList);
      } else {
        const midCount = Math.max(1, Math.min(12, Number(body.midExamCount) || 2));
        next = defaultExamTermMeta(midCount);
        const patchMap = body.terms || {};
        next.terms = next.terms.map((term) => {
          const p = patchMap[term.key];
          if (!p) return term;
          const maxMarks =
            p.maxMarks != null ? Number(p.maxMarks) : term.maxMarks;
          const internalMax =
            p.internalMax != null
              ? Number(p.internalMax)
              : term.internalMax ?? 0;
          return {
            ...term,
            maxMarks,
            internalMax,
            totalMax:
              p.totalMax != null
                ? Number(p.totalMax)
                : maxMarks + internalMax,
            examDate: p.examDate !== undefined ? p.examDate || null : term.examDate,
            labelEn: p.labelEn ? String(p.labelEn) : term.labelEn,
            labelGu: p.labelGu ? String(p.labelGu) : term.labelGu,
            published: getTerm(meta, term.key)?.published ?? term.published,
            publishedAt: getTerm(meta, term.key)?.publishedAt ?? term.publishedAt,
            locked: getTerm(meta, term.key)?.locked ?? term.locked,
          };
        });
        next.midExamCount = next.terms.filter((t) => t.role === "component").length;
      }

      // Preserve publish state from previous by key
      next.terms = next.terms.map((term) => {
        const prev = getTerm(meta, term.key);
        if (!prev) return term;
        return {
          ...term,
          published: prev.published,
          publishedAt: prev.publishedAt,
          locked: prev.locked,
          examDate: term.examDate ?? prev.examDate,
        };
      });

      await prisma.exam.update({
        where: { id: examId },
        data: { termMeta: serializeExamTermMeta(next) },
      });
      return NextResponse.json({ success: true, termMeta: next });
    }

    if (action === "save_marks") {
      const termKey = body.term as ExamTermKey;
      if (!isValidTermKey(termKey, meta)) {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
      const term = getTerm(meta, termKey);
      if (!term) return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      if (term.locked || term.published) {
        return NextResponse.json({ error: "This exam term is locked. Unpublish to edit marks." }, { status: 400 });
      }

      const schoolClass = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
      });
      if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

      const sheetConfig = await getClassMarksSheetConfig(
        classId,
        schoolClass.standard,
        schoolClass.stream,
      );
      let saved = 0;

      for (const st of body.students || []) {
        for (const sub of st.subjectMarks || []) {
          const def = sheetConfig.subjects.find((s) => s.code === sub.subjectCode);
          if (!def) continue;
          const examSub =
            exam.subjects.find((s) => s.code === def.code) ||
            exam.subjects.find((s) => s.name === def.name);
          if (!examSub) continue;

          const existing = await prisma.examResult.findUnique({
            where: {
              examId_subjectId_studentId: {
                examId,
                subjectId: examSub.id,
                studentId: st.studentId,
              },
            },
          });

          const termData = parseTermRemarks(existing?.remarks);
          let marksObtained = existing?.marksObtained ?? 0;
          let remarks: import("@/lib/results/marks-sheet-config").MarksSheetTermData = {
            ...termData,
            scores: { ...(termData.scores || {}) },
          };

          if (def.type === "grade") {
            if (sub.letterGrade != null) remarks.letterGrade = sub.letterGrade || null;
          } else if (term.role === "final") {
            const annual = clampTermMarks(term, sub.termValue != null ? Number(sub.termValue) : null);
            const internal = clampTermMarks(
              { ...term, maxMarks: term.internalMax ?? 20 },
              sub.internalValue != null ? Number(sub.internalValue) : null,
            );
            if (annual != null) marksObtained = annual;
            if ((term.internalMax ?? 0) > 0) {
              remarks = writeTermInternalScore(term, remarks, internal);
            }
          } else {
            const val = clampTermMarks(term, sub.termValue != null ? Number(sub.termValue) : null);
            const written = writeTermScore(term, remarks, val);
            remarks = written.termData;
            if ((term.internalMax ?? 0) > 0) {
              const internal = clampTermMarks(
                { ...term, maxMarks: term.internalMax ?? 0 },
                sub.internalValue != null ? Number(sub.internalValue) : null,
              );
              remarks = writeTermInternalScore(term, remarks, internal);
            }
          }

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
              marksObtained,
              achievementMarks: existing?.achievementMarks ?? 0,
              graceMarks: existing?.graceMarks ?? 0,
              remarks: serializeTermRemarks(remarks),
              grade: existing?.grade ?? null,
            },
            update: {
              marksObtained,
              remarks: serializeTermRemarks(remarks),
            },
          });
          saved++;
        }
      }

      return NextResponse.json({ success: true, saved });
    }

    if (action === "publish_term") {
      const termKey = body.term as ExamTermKey;
      if (!isValidTermKey(termKey, meta)) {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
      const next: ExamTermMeta = {
        ...meta,
        terms: meta.terms.map((t) =>
          t.key === termKey
            ? {
                ...t,
                published: true,
                publishedAt: new Date().toISOString(),
                locked: true,
              }
            : t,
        ),
      };
      await prisma.exam.update({
        where: { id: examId },
        data: { termMeta: serializeExamTermMeta(next) },
      });
      if (termKey === "final" || getTerm(meta, termKey)?.role === "final") {
        await prisma.exam.update({
          where: { id: examId },
          data: { isPublished: true, publishedAt: new Date() },
        });
      }
      return NextResponse.json({ success: true, termMeta: next });
    }

    if (action === "unpublish_term") {
      const termKey = body.term as ExamTermKey;
      if (!isValidTermKey(termKey, meta)) {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
      const next: ExamTermMeta = {
        ...meta,
        terms: meta.terms.map((t) =>
          t.key === termKey
            ? {
                ...t,
                published: false,
                publishedAt: null,
                locked: false,
              }
            : t,
        ),
      };
      await prisma.exam.update({
        where: { id: examId },
        data: { termMeta: serializeExamTermMeta(next) },
      });
      if (termKey === "final" || getTerm(meta, termKey)?.role === "final") {
        await prisma.exam.update({
          where: { id: examId },
          data: { isPublished: false, publishedAt: null },
        });
      }
      return NextResponse.json({ success: true, termMeta: next });
    }

    if (action === "lock_term") {
      const termKey = body.term as ExamTermKey;
      if (!isValidTermKey(termKey, meta)) {
        return NextResponse.json({ error: "Invalid term" }, { status: 400 });
      }
      const next: ExamTermMeta = {
        ...meta,
        terms: meta.terms.map((t) =>
          t.key === termKey ? { ...t, locked: Boolean(body.locked) } : t,
        ),
      };
      await prisma.exam.update({
        where: { id: examId },
        data: { termMeta: serializeExamTermMeta(next) },
      });
      return NextResponse.json({ success: true, termMeta: next });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
