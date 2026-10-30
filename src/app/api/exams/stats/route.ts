import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";
import { parseExamTermMeta } from "@/lib/results/exam-terms";
import {
  buildClassExamStats,
  loadSchoolExamRules,
} from "@/lib/results/exam-stats";
import { getTeacherScope } from "@/lib/teacher-scope";
import { emptyCategoryBucket } from "@/lib/results/exam-rules";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const params = request.nextUrl.searchParams;
    const academicYear = params.get("academicYear") || DEFAULT_ACADEMIC_YEAR;
    let classId = params.get("classId") || "";
    const examId = params.get("examId") || "";
    const termKey = params.get("term") || params.get("termKey") || params.get("examTerm") || "";
    const category = params.get("category") || "";
    const result = params.get("result") || "";
    const gender = params.get("gender") || "";

    if (!classId && examId) {
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId: session.schoolId },
        select: { standard: true, section: true, academicYear: true },
      });
      if (exam) {
        const matched = await prisma.schoolClass.findFirst({
          where: {
            schoolId: session.schoolId,
            standard: exam.standard || undefined,
            section: exam.section || undefined,
            academicYear: exam.academicYear,
          },
          select: { id: true },
        });
        if (matched) classId = matched.id;
      }
    }

    const teacherScope =
      session.role === "teacher" ? await getTeacherScope(session, { academicYear }) : null;
    const allowedIds = teacherScope
      ? new Set(
          teacherScope.classes
            .filter((item) => item.isHomeroom || item.canEnterMarks || item.isTeaching)
            .map((item) => item.id),
        )
      : null;

    if (classId) {
      if (allowedIds && !allowedIds.has(classId)) {
        throw new AuthError("Class not found or access denied", 404);
      }
      const payload = await buildClassExamStats({
        schoolId: session.schoolId,
        classId,
        termKey: termKey || null,
        category: category || null,
        result: result || null,
        gender: gender || null,
      });
      const selected = termKey
        ? payload.terms.find((item) => item.term.key === termKey) || payload.terms[0] || null
        : payload.terms[0] || null;
      return mobileJson(
        {
          ...payload,
          term: selected?.term || null,
          counts: selected?.counts || {
            total: 0,
            passed: 0,
            failed: 0,
            pending: 0,
            passPercent: 0,
          },
          byCategory: selected?.byCategory || {},
          students: selected?.students || [],
        },
        undefined,
        origin,
      );
    }

    const rules = await loadSchoolExamRules(session.schoolId);
    const classes = await prisma.schoolClass.findMany({
      where: {
        schoolId: session.schoolId,
        academicYear,
        ...(allowedIds ? { id: { in: Array.from(allowedIds) } } : {}),
      },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
        _count: { select: { students: true } },
      },
    });

    const exams = await prisma.exam.findMany({
      where: { schoolId: session.schoolId, academicYear, examType: "Annual" },
      select: { id: true, standard: true, section: true, termMeta: true, isPublished: true },
    });

    const overview = [];
    for (const cls of classes) {
      const exam = exams.find(
        (item) => item.standard === cls.standard && item.section === cls.section,
      );
      if (!exam) {
        overview.push({
          classId: cls.id,
          className: cls.name,
          standard: cls.standard,
          section: cls.section,
          academicYear: cls.academicYear,
          studentCount: cls._count.students,
          examId: null,
          isPublished: false,
          terms: [],
        });
        continue;
      }
      const detail = await buildClassExamStats({
        schoolId: session.schoolId,
        classId: cls.id,
        category: category || null,
        result: result || null,
        gender: gender || null,
        rules,
        includeStudents: false,
      });
      overview.push({
        classId: cls.id,
        className: cls.name,
        standard: cls.standard,
        section: cls.section,
        academicYear: cls.academicYear,
        studentCount: cls._count.students,
        examId: exam.id,
        isPublished: exam.isPublished,
        terms: detail.terms.map((item) => ({
          ...item.term,
          counts: item.counts,
          byCategory: item.byCategory,
        })),
      });
    }

    const totals = { total: 0, passed: 0, failed: 0, pending: 0, passPercent: 0 };
    const byCategory: Record<string, ReturnType<typeof emptyCategoryBucket>> = {};
    for (const row of overview) {
      for (const term of row.terms) {
        totals.total += term.counts.total;
        totals.passed += term.counts.passed;
        totals.failed += term.counts.failed;
        totals.pending += term.counts.pending;
        for (const [key, bucket] of Object.entries(term.byCategory || {})) {
          if (!byCategory[key]) byCategory[key] = emptyCategoryBucket();
          byCategory[key].total += bucket.total;
          byCategory[key].passed += bucket.passed;
          byCategory[key].failed += bucket.failed;
          byCategory[key].pending += bucket.pending;
        }
      }
    }
    const decided = totals.passed + totals.failed;
    totals.passPercent = decided > 0 ? Math.round((totals.passed / decided) * 1000) / 10 : 0;

    return mobileJson(
      {
        academicYear,
        rules,
        counts: totals,
        byCategory,
        classes: overview,
        termMetaHint: exams[0] ? parseExamTermMeta(exams[0].termMeta).terms.map((t) => ({
          key: t.key,
          labelEn: t.labelEn,
          labelGu: t.labelGu,
        })) : [],
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("GET /api/exams/stats:", error);
    return mobileJson({ error: "Failed to load exam stats" }, { status: 500 }, origin);
  }
}
