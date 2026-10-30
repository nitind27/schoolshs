import { RESULT_PASS_PERCENTAGE } from "./config";

export type ExamResultFlag = "pass" | "fail" | "pending";

export type ExamGradeBand = {
  grade: string;
  minPercent: number;
  labelEn: string;
  labelGu: string;
};

export type ExamRules = {
  passPercent: number;
  /** Pass marks out of 100. Kept in sync with passPercent. */
  passMarks: number;
  grades: ExamGradeBand[];
};

export const DEFAULT_EXAM_GRADE_BANDS: ExamGradeBand[] = [
  { grade: "A1", minPercent: 91, labelEn: "A1", labelGu: "A1" },
  { grade: "A2", minPercent: 81, labelEn: "A2", labelGu: "A2" },
  { grade: "B1", minPercent: 71, labelEn: "B1", labelGu: "B1" },
  { grade: "B2", minPercent: 61, labelEn: "B2", labelGu: "B2" },
  { grade: "C1", minPercent: 51, labelEn: "C1", labelGu: "C1" },
  { grade: "C2", minPercent: 41, labelEn: "C2", labelGu: "C2" },
  { grade: "D", minPercent: 33, labelEn: "D", labelGu: "D" },
  { grade: "E", minPercent: 0, labelEn: "E", labelGu: "E" },
];

export const DEFAULT_EXAM_RULES: ExamRules = {
  passPercent: RESULT_PASS_PERCENTAGE,
  passMarks: RESULT_PASS_PERCENTAGE,
  grades: DEFAULT_EXAM_GRADE_BANDS,
};

function clampPercent(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

export function normalizeGradeBands(raw: unknown): ExamGradeBand[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_EXAM_GRADE_BANDS.map((band) => ({ ...band }));
  }
  const bands: ExamGradeBand[] = [];
  for (const item of raw) {
    const row = item as Partial<ExamGradeBand>;
    const grade = String(row.grade || "").trim().toUpperCase();
    if (!grade) continue;
    bands.push({
      grade,
      minPercent: clampPercent(row.minPercent, 0),
      labelEn: String(row.labelEn || grade).trim() || grade,
      labelGu: String(row.labelGu || row.labelEn || grade).trim() || grade,
    });
  }
  if (!bands.length) return DEFAULT_EXAM_GRADE_BANDS.map((band) => ({ ...band }));
  bands.sort((a, b) => b.minPercent - a.minPercent);
  if (bands[bands.length - 1]!.minPercent > 0) {
    bands.push({ grade: "E", minPercent: 0, labelEn: "E", labelGu: "E" });
  }
  return bands;
}

export function parseExamRules(raw?: string | null): ExamRules {
  if (!raw) return { ...DEFAULT_EXAM_RULES, grades: DEFAULT_EXAM_GRADE_BANDS.map((b) => ({ ...b })) };
  try {
    const parsed = JSON.parse(raw) as Partial<ExamRules>;
    const passPercent = clampPercent(parsed.passPercent ?? parsed.passMarks, RESULT_PASS_PERCENTAGE);
    const passMarks = clampPercent(parsed.passMarks ?? passPercent, passPercent);
    return {
      passPercent,
      passMarks,
      grades: normalizeGradeBands(parsed.grades),
    };
  } catch {
    return { ...DEFAULT_EXAM_RULES, grades: DEFAULT_EXAM_GRADE_BANDS.map((b) => ({ ...b })) };
  }
}

export function serializeExamRules(rules: ExamRules): string {
  const passPercent = clampPercent(rules.passPercent, RESULT_PASS_PERCENTAGE);
  return JSON.stringify({
    passPercent,
    passMarks: clampPercent(rules.passMarks ?? passPercent, passPercent),
    grades: normalizeGradeBands(rules.grades),
  });
}

export function gradeFromPercent(percent: number, rules: ExamRules = DEFAULT_EXAM_RULES): string {
  const bands = rules.grades?.length ? rules.grades : DEFAULT_EXAM_GRADE_BANDS;
  const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent);
  for (const band of sorted) {
    if (percent + 1e-9 >= band.minPercent) return band.grade;
  }
  return sorted[sorted.length - 1]?.grade || "E";
}

export function isPassingPercent(percent: number, rules: ExamRules = DEFAULT_EXAM_RULES): boolean {
  return percent + 1e-9 >= (rules.passPercent ?? RESULT_PASS_PERCENTAGE);
}

export function resultFromPercent(
  percent: number,
  rules: ExamRules = DEFAULT_EXAM_RULES,
): Exclude<ExamResultFlag, "pending"> {
  return isPassingPercent(percent, rules) ? "pass" : "fail";
}

export function requiredMarksForTotal(max: number, rules: ExamRules = DEFAULT_EXAM_RULES): number {
  if (max <= 0) return 0;
  return Math.ceil((rules.passPercent / 100) * max * 10) / 10;
}

export type TermMarkLike = {
  subjectType?: string | null;
  termValue?: number | null;
  internalValue?: number | null;
  paperMax?: number | null;
  internalMax?: number | null;
};

export type TermResultSummary = {
  obtained: number;
  max: number;
  percent: number;
  grade: string;
  result: ExamResultFlag;
  filled: number;
  totalSubjects: number;
};

export function summarizeTermMarks(
  subjectMarks: TermMarkLike[],
  rules: ExamRules = DEFAULT_EXAM_RULES,
): TermResultSummary {
  const numeric = subjectMarks.filter((item) => item.subjectType !== "grade");
  let obtained = 0;
  let max = 0;
  let filled = 0;

  for (const item of numeric) {
    const paperMax = Math.max(0, Number(item.paperMax) || 0);
    const internalMax = Math.max(0, Number(item.internalMax) || 0);
    max += paperMax + internalMax;
    const paperDone = item.termValue != null && item.termValue !== undefined;
    const internalDone = internalMax <= 0 || (item.internalValue != null && item.internalValue !== undefined);
    if (paperDone && internalDone) filled += 1;
    if (paperDone) obtained += Number(item.termValue) || 0;
    if (item.internalValue != null && item.internalValue !== undefined) {
      obtained += Number(item.internalValue) || 0;
    }
  }

  const percent = max > 0 ? Math.round((obtained / max) * 1000) / 10 : 0;
  const pending = numeric.length === 0 || filled === 0;
  return {
    obtained: Math.round(obtained * 10) / 10,
    max: Math.round(max * 10) / 10,
    percent,
    grade: pending ? "—" : gradeFromPercent(percent, rules),
    result: pending ? "pending" : resultFromPercent(percent, rules),
    filled,
    totalSubjects: numeric.length,
  };
}

export function emptyCategoryBucket() {
  return { total: 0, passed: 0, failed: 0, pending: 0 };
}

export type CategoryResultBucket = ReturnType<typeof emptyCategoryBucket>;
