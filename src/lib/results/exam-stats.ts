import "server-only";

import { AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";
import { studentFullNameEn, studentFullNameGu } from "@/lib/student-names";
import { ensureClassExam } from "@/lib/class-subjects";
import { buildStudentTermRows, parseExamTermMeta, type ExamTermDef } from "@/lib/results/exam-terms";
import {
  emptyCategoryBucket,
  parseExamRules,
  serializeExamRules,
  summarizeTermMarks,
  type CategoryResultBucket,
  type ExamResultFlag,
  type ExamRules,
  type TermResultSummary,
} from "@/lib/results/exam-rules";

const CATEGORY_SET = new Set<string>(CATEGORIES);

export function normalizeResultCategory(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "Other";
  if (CATEGORY_SET.has(raw)) return raw;
  const upper = raw.toUpperCase();
  const match = CATEGORIES.find((item) => item.toUpperCase() === upper);
  return match || "Other";
}

export async function loadSchoolExamRules(schoolId: string): Promise<ExamRules> {
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId },
    select: { examRulesJson: true },
  });
  return parseExamRules(settings?.examRulesJson);
}

export async function saveSchoolExamRules(schoolId: string, rules: ExamRules): Promise<ExamRules> {
  const examRulesJson = serializeExamRules(rules);
  const updated = await prisma.schoolSettings.updateMany({
    where: { schoolId },
    data: { examRulesJson },
  });
  if (updated.count === 0) {
    try {
      await prisma.schoolSettings.create({
        data: { schoolId, examRulesJson },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      await prisma.schoolSettings.updateMany({
        where: { schoolId },
        data: { examRulesJson },
      });
    }
  }
  return parseExamRules(examRulesJson);
}

export type ExamStatsStudent = {
  studentId: string;
  rollNumber: string | null;
  grNumber: string | null;
  firstName: string;
  middleName: string | null;
  surname: string;
  nameEn: string;
  nameGu: string;
  category: string;
  gender: string | null;
  seatNumber: string;
  obtained: number;
  max: number;
  percent: number;
  grade: string;
  result: ExamResultFlag;
  filled: number;
  totalSubjects: number;
};

export type ExamTermStats = {
  term: {
    key: string;
    labelEn: string;
    labelGu: string;
    role: string;
    subjectScope: string;
    published: boolean;
    examDate: string | null;
    createdById: string | null;
    createdByName: string | null;
    createdAt: string | null;
    totalMax: number;
  };
  counts: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passPercent: number;
  };
  byCategory: Record<string, CategoryResultBucket>;
  students: ExamStatsStudent[];
};

function bumpBucket(bucket: CategoryResultBucket, result: ExamResultFlag) {
  bucket.total += 1;
  if (result === "pass") bucket.passed += 1;
  else if (result === "fail") bucket.failed += 1;
  else bucket.pending += 1;
}

function termCreator(term: ExamTermDef) {
  return {
    createdById: term.createdById ?? null,
    createdByName: term.createdByName ?? null,
    createdAt: term.createdAt ?? null,
  };
}

export async function buildClassExamStats(options: {
  schoolId: string;
  classId: string;
  termKey?: string | null;
  category?: string | null;
  result?: string | null;
  gender?: string | null;
  rules?: ExamRules;
  includeStudents?: boolean;
}): Promise<{
  class: {
    id: string;
    name: string;
    standard: string;
    section: string;
    stream: string;
    academicYear: string;
    studentCount: number;
  };
  exam: { id: string; isPublished: boolean };
  rules: ExamRules;
  terms: ExamTermStats[];
}> {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: options.classId, schoolId: options.schoolId },
    include: {
      students: {
        where: { status: { not: "archived" } },
        orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
      },
    },
  });
  if (!schoolClass) {
    throw new AuthError("Class not found", 404);
  }

  const rules = options.rules ?? (await loadSchoolExamRules(options.schoolId));
  const { exam, sheetConfig } = await ensureClassExam(options.schoolId, schoolClass);
  const meta = parseExamTermMeta(exam.termMeta);
  const results = await prisma.examResult.findMany({
    where: { examId: exam.id },
    select: { studentId: true, subjectId: true, marksObtained: true, remarks: true },
  });
  const seats = await prisma.examSeatAssignment.findMany({
    where: { schoolId: options.schoolId, examId: exam.id, classId: schoolClass.id },
    select: { studentId: true, termKey: true, seatNumber: true },
  });
  const seatByTerm = new Map<string, string>();
  for (const seat of seats) {
    seatByTerm.set(`${seat.termKey}::${seat.studentId}`, seat.seatNumber);
  }

  const wantedCategory = options.category ? normalizeResultCategory(options.category) : "";
  const wantedResult = String(options.result || "").toLowerCase();
  const wantedGender = String(options.gender || "").toLowerCase();
  const termsToBuild = options.termKey
    ? meta.terms.filter((term) => term.key === options.termKey)
    : meta.terms;

  const terms: ExamTermStats[] = termsToBuild.map((term) => {
    const rows = buildStudentTermRows(
      term.key,
      meta,
      sheetConfig,
      schoolClass.students,
      results,
      exam.subjects,
    );
    const byCategory: Record<string, CategoryResultBucket> = {
      Other: emptyCategoryBucket(),
    };
    for (const cat of CATEGORIES) byCategory[cat] = emptyCategoryBucket();

    const students: ExamStatsStudent[] = [];
    const counts: CategoryResultBucket & { passPercent: number } = {
      ...emptyCategoryBucket(),
      passPercent: 0,
    };

    for (const row of rows) {
      const student = schoolClass.students.find((item) => item.id === row.studentId);
      if (!student) continue;
      const summary: TermResultSummary = summarizeTermMarks(row.subjectMarks, rules);
      const category = normalizeResultCategory(student.category);
      const gender = student.gender || null;
      const genderKey = String(gender || "").toLowerCase();
      if (wantedCategory && category !== wantedCategory) continue;
      if (wantedResult && wantedResult !== "all" && summary.result !== wantedResult) continue;
      if (wantedGender && wantedGender !== "all") {
        const isBoy = genderKey.startsWith("m") || genderKey.includes("boy");
        const isGirl = genderKey.startsWith("f") || genderKey.includes("girl");
        if (wantedGender === "male" && !isBoy) continue;
        if (wantedGender === "female" && !isGirl) continue;
        if (wantedGender === "other" && (isBoy || isGirl)) continue;
      }

      bumpBucket(byCategory[category] || byCategory.Other, summary.result);
      bumpBucket(counts, summary.result);
      if (options.includeStudents === false) continue;
      students.push({
        studentId: student.id,
        rollNumber: student.rollNumber,
        grNumber: student.grNumber,
        firstName: student.firstName,
        middleName: student.middleName,
        surname: student.surname,
        nameEn: studentFullNameEn(student),
        nameGu: studentFullNameGu(student),
        category,
        gender,
        seatNumber: seatByTerm.get(`${term.key}::${student.id}`) || "",
        obtained: summary.obtained,
        max: summary.max,
        percent: summary.percent,
        grade: summary.grade,
        result: summary.result,
        filled: summary.filled,
        totalSubjects: summary.totalSubjects,
      });
    }

    const decided = counts.passed + counts.failed;
    counts.passPercent = decided > 0 ? Math.round((counts.passed / decided) * 1000) / 10 : 0;

    return {
      term: {
        key: term.key,
        labelEn: term.labelEn,
        labelGu: term.labelGu,
        role: term.role,
        subjectScope: term.subjectScope === "computer" ? "computer" : "all",
        published: term.published,
        examDate: term.examDate,
        totalMax: term.totalMax,
        ...termCreator(term),
      },
      counts,
      byCategory,
      students,
    };
  });

  return {
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
    rules,
    terms,
  };
}
