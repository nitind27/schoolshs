import {
  getMarksSheetConfig,
  parseTermRemarks,
  serializeTermRemarks,
  type MarksSheetSubjectDef,
  type MarksSheetTermData,
} from "@/lib/results/marks-sheet-config";

export type ExamTermKey = "mid1" | "mid2" | "final";

export type TermFieldKey = "first" | "second" | "internal" | "annual";

export interface ExamTermDef {
  key: ExamTermKey;
  labelEn: string;
  labelGu: string;
  fieldKey: TermFieldKey;
  maxMarks: number;
  internalMax?: number;
  published: boolean;
  publishedAt: string | null;
  locked: boolean;
  examDate: string | null;
}

export interface ExamTermMeta {
  midExamCount: 1 | 2;
  terms: Record<ExamTermKey, ExamTermDef>;
}

const DEFAULT_TERMS: Record<ExamTermKey, Omit<ExamTermDef, "published" | "publishedAt" | "locked" | "examDate">> = {
  mid1: {
    key: "mid1",
    labelEn: "Mid Exam 1",
    labelGu: "પહેલી મધ્યમાં પરીક્ષા",
    fieldKey: "first",
    maxMarks: 50,
  },
  mid2: {
    key: "mid2",
    labelEn: "Mid Exam 2",
    labelGu: "બીજી મધ્યમાં પરીક્ષા",
    fieldKey: "second",
    maxMarks: 50,
  },
  final: {
    key: "final",
    labelEn: "Final Exam",
    labelGu: "વાર્ષિક / અંતિમ પરીક્ષા",
    fieldKey: "annual",
    maxMarks: 80,
    internalMax: 20,
  },
};

export function defaultExamTermMeta(midExamCount: 1 | 2 = 2): ExamTermMeta {
  const base = (key: ExamTermKey): ExamTermDef => ({
    ...DEFAULT_TERMS[key],
    published: false,
    publishedAt: null,
    locked: false,
    examDate: null,
  });
  return {
    midExamCount,
    terms: { mid1: base("mid1"), mid2: base("mid2"), final: base("final") },
  };
}

export function parseExamTermMeta(raw?: string | null): ExamTermMeta {
  if (!raw) return defaultExamTermMeta(2);
  try {
    const parsed = JSON.parse(raw) as Partial<ExamTermMeta>;
    const defaults = defaultExamTermMeta(parsed.midExamCount === 1 ? 1 : 2);
    const midExamCount = parsed.midExamCount === 1 ? 1 : 2;
    const terms = { ...defaults.terms };
    for (const key of ["mid1", "mid2", "final"] as ExamTermKey[]) {
      if (parsed.terms?.[key]) {
        terms[key] = { ...terms[key], ...parsed.terms[key] };
      }
    }
    return { midExamCount, terms };
  } catch {
    return defaultExamTermMeta(2);
  }
}

export function serializeExamTermMeta(meta: ExamTermMeta): string {
  return JSON.stringify(meta);
}

export function activeExamTerms(meta: ExamTermMeta): ExamTermDef[] {
  const list: ExamTermDef[] = [meta.terms.mid1];
  if (meta.midExamCount === 2) list.push(meta.terms.mid2);
  list.push(meta.terms.final);
  return list;
}

export function isValidTermKey(term: string, meta: ExamTermMeta): term is ExamTermKey {
  if (term === "mid1" || term === "final") return true;
  if (term === "mid2") return meta.midExamCount === 2;
  return false;
}

export function termMarksValue(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  annualMarks?: number | null,
): number | null {
  if (term.fieldKey === "annual") return annualMarks ?? null;
  const v = termData[term.fieldKey as keyof MarksSheetTermData];
  return typeof v === "number" ? v : v != null ? Number(v) : null;
}

export function setTermMarksValue(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  value: number | null,
): { termData: MarksSheetTermData; annual: number | null } {
  const next = { ...termData };
  let annual: number | null = null;
  if (term.fieldKey === "annual") {
    annual = value;
  } else if (term.fieldKey === "first" || term.fieldKey === "second" || term.fieldKey === "internal") {
    next[term.fieldKey] = value;
  }
  return { termData: next, annual };
}

export function numericSubjects(config: { subjects: MarksSheetSubjectDef[] }): MarksSheetSubjectDef[] {
  return config.subjects.filter((s) => s.type === "numeric");
}

export function computeTermCompletion(
  term: ExamTermDef,
  meta: ExamTermMeta,
  students: Array<{
    subjectMarks: Array<{
      subjectCode: string;
      subjectType: "numeric" | "grade";
      termValue: number | null;
      internalValue?: number | null;
    }>;
  }>,
): { complete: number; partial: number; pending: number; total: number; percent: number } {
  const total = students.length;
  if (!total) return { complete: 0, partial: 0, pending: 0, total: 0, percent: 0 };

  let complete = 0;
  let partial = 0;
  let pending = 0;

  for (const st of students) {
    const numeric = st.subjectMarks.filter((s) => s.subjectType === "numeric");
    if (!numeric.length) {
      pending++;
      continue;
    }
    const filled = numeric.filter((s) => {
      if (term.key === "final") {
        return (s.termValue != null && s.termValue > 0) || (s.internalValue != null && s.internalValue > 0);
      }
      return s.termValue != null && s.termValue >= 0;
    }).length;
    if (filled >= numeric.length) complete++;
    else if (filled > 0) partial++;
    else pending++;
  }

  return {
    complete,
    partial,
    pending,
    total,
    percent: Math.round((complete / total) * 100),
  };
}

export function clampTermMarks(term: ExamTermDef, value: number | null, internal?: number | null): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const max = term.maxMarks;
  return Math.min(Math.max(0, value), max);
}

export function buildStudentTermRows(
  termKey: ExamTermKey,
  meta: ExamTermMeta,
  sheetConfig: ReturnType<typeof getMarksSheetConfig>,
  students: Array<{
    id: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    rollNumber?: string | null;
    grNumber?: string | null;
  }>,
  results: Array<{
    studentId: string;
    subjectId: string;
    marksObtained: number;
    remarks: string | null;
  }>,
  examSubjects: Array<{ id: string; code: string | null; name: string }>,
) {
  const term = meta.terms[termKey];
  const subjects = sheetConfig.subjects;

  return students.map((st) => {
    const subjectMarks = subjects.map((def) => {
      const examSub =
        examSubjects.find((s) => s.code === def.code) ||
        examSubjects.find((s) => s.name === def.name);
      const result = examSub
        ? results.find((r) => r.studentId === st.id && r.subjectId === examSub.id)
        : null;
      const termData = parseTermRemarks(result?.remarks);
      const termValue = termMarksValue(term, termData, result?.marksObtained ?? null);
      const internalValue = termData.internal ?? null;

      return {
        subjectCode: def.code,
        subjectName: def.name,
        subjectType: def.type,
        examSubjectId: examSub?.id ?? null,
        termValue: def.type === "grade" ? null : termValue,
        internalValue: term.key === "final" && def.type === "numeric" ? internalValue : null,
        letterGrade: def.type === "grade" ? termData.letterGrade : null,
      };
    });

    return {
      studentId: st.id,
      firstName: st.firstName,
      middleName: st.middleName,
      surname: st.surname,
      rollNumber: st.rollNumber,
      grNumber: st.grNumber,
      subjectMarks,
    };
  });
}

export type TermStudentRow = ReturnType<typeof buildStudentTermRows>[number];

export { parseTermRemarks, serializeTermRemarks };
