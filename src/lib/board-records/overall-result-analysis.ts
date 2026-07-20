/** પરિણામની સમગ્ર તારીખ — Std 10 SSC overall result analysis form */

import { parseBoardResultJson } from "@/lib/board-records/result-list-config";
import { resultStatus } from "@/lib/board-records/gseb";

export const ANALYSIS_GRADES = ["A1", "A2", "B1", "B2", "C1", "C2", "D", "E1", "E2"] as const;
export type AnalysisGrade = (typeof ANALYSIS_GRADES)[number];

/** Official 9-point subject grade bands (form A1–E2) */
export const ANALYSIS_GRADE_BANDS: { grade: AnalysisGrade; min: number; max: number }[] = [
  { grade: "A1", min: 91, max: 100 },
  { grade: "A2", min: 81, max: 90 },
  { grade: "B1", min: 71, max: 80 },
  { grade: "B2", min: 61, max: 70 },
  { grade: "C1", min: 51, max: 60 },
  { grade: "C2", min: 41, max: 50 },
  { grade: "D", min: 33, max: 40 },
  { grade: "E1", min: 21, max: 32 },
  { grade: "E2", min: 0, max: 20 },
];

export const ANALYSIS_SUBJECTS: {
  key: string;
  label: string;
  altKeys?: string[];
}[] = [
  { key: "GUJ", label: "ગુજરાતી(૦૧)" },
  { key: "SS", label: "સા. વિજ્ઞાન(૧૦)" },
  { key: "SCI", label: "વિ. & ટેકનોલોજી(૧૧)" },
  { key: "MATH", label: "ગણિત(૧૨) (સ્ટાન્ડર્ડ)" },
  { key: "MATH_BASIC", label: "ગણિત(૧૮) (બેઝિક)", altKeys: ["MATHB", "BASIC"] },
  { key: "ENG", label: "અંગ્રેજી(૧૬)" },
  { key: "SAN", label: "સંસ્કૃત/હિન્દી (  )", altKeys: ["HIN"] },
  { key: "EL1", label: "કમ્પ્યુટર/શા.શિ. (  )", altKeys: ["PE", "COMP", "EL2"] },
];

export type BgCounts = { boys: number; girls: number; total: number };

export type CategoryKey = "general" | "sc" | "st" | "obc";

export const CATEGORY_COLS: { key: CategoryKey; label: string }[] = [
  { key: "general", label: "જનરલ" },
  { key: "sc", label: "એસ.સી." },
  { key: "st", label: "એસ.ટી." },
  { key: "obc", label: "ઓ.બી.સી." },
];

export type MarksRangeKey = "lt40" | "from40to60" | "from60to80" | "gte80" | "fail" | "total";

/** Convert ASCII digits → Gujarati digits (૦–૯) */
export function toGujaratiDigits(value: string | number): string {
  const map = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  return String(value).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

/** 40% bands (not 35%) — digits always Gujarati */
export const MARKS_RANGES: { key: MarksRangeKey; label: string }[] = [
  { key: "lt40", label: `${toGujaratiDigits(40)}% થી ઓછા` },
  { key: "from40to60", label: `${toGujaratiDigits(40)}% થી વધુ અને ${toGujaratiDigits(60)}% થી ઓછા` },
  { key: "from60to80", label: `${toGujaratiDigits(60)}% થી વધુ અને ${toGujaratiDigits(80)}% થી ઓછા` },
  { key: "gte80", label: `${toGujaratiDigits(80)}% થી વધુ` },
  { key: "fail", label: "નાપાસ" },
  { key: "total", label: "કુલ" },
];

export function marksRangeLabel(key: MarksRangeKey): string {
  return MARKS_RANGES.find((r) => r.key === key)?.label ?? key;
}

export type SubjectGradeRow = {
  serial: number;
  key: string;
  label: string;
  grades: Record<AnalysisGrade, number>;
  total: number;
};

export type CategoryRangeRow = {
  key: MarksRangeKey;
  label: string;
  cells: Record<CategoryKey, BgCounts>;
  grand: BgCounts;
};

export type OverallResultAnalysisMeta = {
  boardResultDate: string;
  yearShort: string;
  examMonthYear: string;
  standard: string;
  classLabel: string;
  academicYear: string;
  classTeacher: string;
};

export type OverallResultAnalysisPayload = {
  meta: OverallResultAnalysisMeta;
  subjectRows: SubjectGradeRow[];
  subjectTotals: Record<AnalysisGrade, number> & { total: number };
  regularRows: CategoryRangeRow[];
  nonRegularRows: CategoryRangeRow[];
};

function emptyGrades(): Record<AnalysisGrade, number> {
  return { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E1: 0, E2: 0 };
}

function emptyBg(): BgCounts {
  return { boys: 0, girls: 0, total: 0 };
}

function emptyCategoryCells(): Record<CategoryKey, BgCounts> {
  return {
    general: emptyBg(),
    sc: emptyBg(),
    st: emptyBg(),
    obc: emptyBg(),
  };
}

export function analysisGradeFromMarks(marks: number | null | undefined): AnalysisGrade | null {
  if (marks == null || Number.isNaN(marks)) return null;
  const m = Number(marks);
  if (m > 100) return "A1";
  for (const band of ANALYSIS_GRADE_BANDS) {
    if (m >= band.min && m <= band.max) return band.grade;
  }
  return "E2";
}

export function normalizeAnalysisGrade(
  raw: string | null | undefined,
  marks?: number | null
): AnalysisGrade | null {
  if (raw) {
    const g = raw.trim().toUpperCase().replace(/\s+/g, "");
    if ((ANALYSIS_GRADES as readonly string[]).includes(g)) return g as AnalysisGrade;
    if (g === "C") return marks != null && marks >= 41 ? "C2" : "D";
    if (g === "F" || g === "E") return marks != null && marks >= 21 ? "E1" : "E2";
  }
  return analysisGradeFromMarks(marks ?? null);
}

export function mapStudentCategory(category: string | null | undefined): CategoryKey {
  const c = (category || "").trim().toUpperCase();
  if (c === "SC" || c.includes("SCHEDULED CASTE")) return "sc";
  if (c === "ST" || c.includes("SCHEDULED TRIBE")) return "st";
  if (c === "OBC" || c === "SEBC" || c === "BAXI" || c.includes("BAKSHI")) return "obc";
  return "general";
}

export function isBoy(gender: string | null | undefined) {
  const g = (gender || "").toLowerCase();
  return g === "male" || g === "m" || g === "boy";
}

export function isRegularStudent(admissionType: string | null | undefined) {
  const a = (admissionType || "Regular").trim().toLowerCase();
  return a === "regular" || a === "";
}

function bumpBg(cell: BgCounts, boy: boolean) {
  if (boy) cell.boys++;
  else cell.girls++;
  cell.total++;
}

function sumBg(a: BgCounts, b: BgCounts): BgCounts {
  return { boys: a.boys + b.boys, girls: a.girls + b.girls, total: a.total + b.total };
}

type StudentInput = {
  gender: string;
  category: string;
  admissionType?: string | null;
  percentage10th?: number | null;
  gsebResultJson?: string | null;
};

function getSubjectMarksAndGrade(
  parsed: ReturnType<typeof parseBoardResultJson>,
  subjectKey: string,
  altKeys?: string[]
): { marks: number | null; grade: AnalysisGrade | null } {
  const keys = [subjectKey, ...(altKeys || [])];
  for (const k of keys) {
    const detail = parsed.subjectsDetail?.[k];
    if (detail) {
      const marks = detail.total ?? null;
      const grade = normalizeAnalysisGrade(detail.grade, marks);
      if (grade || marks != null) return { marks: marks ?? null, grade };
    }
    const sub = parsed.subjects?.[k];
    if (sub != null) {
      return { marks: sub, grade: analysisGradeFromMarks(sub) };
    }
  }
  return { marks: null, grade: null };
}

export function buildCategoryAnalysis(students: StudentInput[]): CategoryRangeRow[] {
  const buckets: Record<Exclude<MarksRangeKey, "total">, Record<CategoryKey, BgCounts>> = {
    lt40: emptyCategoryCells(),
    from40to60: emptyCategoryCells(),
    from60to80: emptyCategoryCells(),
    gte80: emptyCategoryCells(),
    fail: emptyCategoryCells(),
  };
  const totalCells = emptyCategoryCells();

  for (const s of students) {
    const parsed = parseBoardResultJson(s.gsebResultJson);
    const pct =
      parsed.percentage ??
      (s.percentage10th && s.percentage10th > 0 ? s.percentage10th : null);
    if (pct == null || pct <= 0) continue;

    const boy = isBoy(s.gender);
    const cat = mapStudentCategory(s.category);
    bumpBg(totalCells[cat], boy);

    if (resultStatus(pct) === "fail") bumpBg(buckets.fail[cat], boy);

    if (pct < 40) bumpBg(buckets.lt40[cat], boy);
    else if (pct < 60) bumpBg(buckets.from40to60[cat], boy);
    else if (pct < 80) bumpBg(buckets.from60to80[cat], boy);
    else bumpBg(buckets.gte80[cat], boy);
  }

  const keys: Exclude<MarksRangeKey, "total">[] = [
    "lt40",
    "from40to60",
    "from60to80",
    "gte80",
    "fail",
  ];

  const rows: CategoryRangeRow[] = keys.map((key) => {
    const cells = buckets[key];
    return {
      key,
      label: marksRangeLabel(key),
      cells,
      grand: CATEGORY_COLS.reduce((acc, c) => sumBg(acc, cells[c.key]), emptyBg()),
    };
  });

  rows.push({
    key: "total",
    label: "કુલ",
    cells: totalCells,
    grand: CATEGORY_COLS.reduce((acc, c) => sumBg(acc, totalCells[c.key]), emptyBg()),
  });

  return rows;
}

export function buildOverallResultAnalysis(
  students: StudentInput[],
  meta: Partial<OverallResultAnalysisMeta> = {}
): OverallResultAnalysisPayload {
  const subjectRows: SubjectGradeRow[] = ANALYSIS_SUBJECTS.map((sub, i) => {
    const grades = emptyGrades();
    let total = 0;
    for (const s of students) {
      const parsed = parseBoardResultJson(s.gsebResultJson);
      const { marks, grade } = getSubjectMarksAndGrade(parsed, sub.key, sub.altKeys);
      const g = grade || analysisGradeFromMarks(marks);
      if (!g) continue;
      grades[g]++;
      total++;
    }
    return { serial: i + 1, key: sub.key, label: sub.label, grades, total };
  });

  const subjectTotals = { ...emptyGrades(), total: 0 };
  for (const row of subjectRows) {
    for (const g of ANALYSIS_GRADES) subjectTotals[g] += row.grades[g];
    subjectTotals.total += row.total;
  }

  const regular = students.filter((s) => isRegularStudent(s.admissionType));
  const nonRegular = students.filter((s) => !isRegularStudent(s.admissionType));

  const year = meta.academicYear || "2025-26";
  const [ya, yb] = year.split("-");

  return {
    meta: {
      boardResultDate: meta.boardResultDate || "",
      yearShort: ya?.slice(-2) || "25",
      examMonthYear: meta.examMonthYear || yb?.slice(-2) || "26",
      standard: meta.standard || "10",
      classLabel: meta.classLabel || "",
      academicYear: year,
      classTeacher: meta.classTeacher || "",
    },
    subjectRows,
    subjectTotals,
    regularRows: buildCategoryAnalysis(regular),
    nonRegularRows: buildCategoryAnalysis(nonRegular),
  };
}
