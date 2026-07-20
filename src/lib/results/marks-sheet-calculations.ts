import type { MarksSheetConfig, MarksSheetSubjectDef, MarksSheetTermData } from "./marks-sheet-config";

export type SubjectMarksInput = {
  subject: MarksSheetSubjectDef;
  first: number | null;
  second: number | null;
  internal: number | null;
  annual: number | null;
  achievement: number | null;
  special: number | null;
  grace: number | null;
  letterGrade: string | null;
};

export type RowCellValue = number | string | null;

export type ComputedMarksSheet = {
  subjectCells: Record<string, Record<string, RowCellValue>>;
  summaryCells: Record<string, RowCellValue>;
  footer: { result: string; percentage: number | null; rank: number | null };
};

function num(v: number | null | undefined): number {
  if (v == null || Number.isNaN(v)) return 0;
  return Number(v);
}

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "";
  if (digits === 0) return String(Math.round(n));
  return n.toFixed(digits);
}

function pct(obtained: number, max: number): number | null {
  if (max <= 0) return null;
  return (obtained / max) * 100;
}

export function computeSubjectMarks(subject: MarksSheetSubjectDef, input: SubjectMarksInput) {
  if (subject.type === "grade") {
    const grade = input.letterGrade || "";
    return {
      max: "",
      first: "",
      second: "",
      internal: "",
      annual: "",
      total: "",
      converted: grade,
      achievement: "",
      special: "",
      grace: "",
      final: grade,
    };
  }

  const first = num(input.first);
  const second = num(input.second);
  const internal = num(input.internal);
  const annual = num(input.annual);
  const achievement = num(input.achievement);
  const special = num(input.special);
  const grace = num(input.grace);

  const total = first + second + internal + annual;
  const converted = (total / 200) * 100;
  const final = converted + achievement + special + grace;

  return {
    max: "",
    first: first || null,
    second: second || null,
    internal: internal || null,
    annual: annual || null,
    total: total || null,
    converted: converted ? fmt(converted) : null,
    achievement: achievement || null,
    special: special || null,
    grace: grace || null,
    final: final ? fmt(final) : null,
  };
}

export function computeStudentMarksSheet(
  config: MarksSheetConfig,
  subjects: SubjectMarksInput[],
): ComputedMarksSheet {
  const subjectCells: Record<string, Record<string, RowCellValue>> = {};
  const numericSubjects = subjects.filter((s) => s.subject.type === "numeric");

  let totalFirst = 0;
  let totalSecond = 0;
  let totalInternal = 0;
  let totalAnnual = 0;
  let totalObtained = 0;
  let totalConverted = 0;
  let totalAchievement = 0;
  let totalSpecial = 0;
  let totalGrace = 0;
  let totalFinal = 0;

  for (const sub of subjects) {
    const cells = computeSubjectMarks(sub.subject, sub);
    subjectCells[sub.subject.code] = cells;

    if (sub.subject.type === "numeric") {
      totalFirst += num(sub.first);
      totalSecond += num(sub.second);
      totalInternal += num(sub.internal);
      totalAnnual += num(sub.annual);
      totalObtained += num(cells.total as number | null);
      totalConverted += Number(cells.converted) || 0;
      totalAchievement += num(sub.achievement);
      totalSpecial += num(sub.special);
      totalGrace += num(sub.grace);
      totalFinal += Number(cells.final) || 0;
    }
  }

  const numericCount = numericSubjects.length;
  const maxFirst = numericCount * 50;
  const maxSecond = numericCount * 50;
  const maxInternal = numericCount * 20;
  const maxAnnual = numericCount * 80;
  const maxTotal = numericCount * 200;
  const maxConverted = numericCount * 100;

  const summaryCells: Record<string, RowCellValue> = {
    max: "",
    first: totalFirst || null,
    second: totalSecond || null,
    internal: totalInternal || null,
    annual: totalAnnual || null,
    total: totalObtained || null,
    converted: totalConverted ? fmt(totalConverted) : null,
    achievement: totalAchievement || null,
    special: totalSpecial || null,
    grace: totalGrace || null,
    final: totalFinal ? fmt(totalFinal) : null,
    totalMarks: totalObtained || null,
    percentage: pct(totalFinal, maxConverted),
    result: totalFinal >= maxConverted * 0.33 ? "પાસ" : totalFinal > 0 ? "નાપાસ" : "",
    rank: null,
  };

  return {
    subjectCells,
    summaryCells,
    footer: {
      result: (summaryCells.result as string) || "",
      percentage: summaryCells.percentage as number | null,
      rank: null,
    },
  };
}

export function buildSubjectInput(
  subject: MarksSheetSubjectDef,
  term: MarksSheetTermData,
  annual: number | null,
  achievement: number | null,
  grace: number | null,
): SubjectMarksInput {
  return {
    subject,
    first: term.first ?? null,
    second: term.second ?? null,
    internal: term.internal ?? null,
    annual,
    achievement,
    special: term.special ?? null,
    grace,
    letterGrade: term.letterGrade ?? null,
  };
}

export function rowPassFail(obtained: number | null | undefined, max: number | null): string {
  if (obtained == null || max == null || max <= 0) return "";
  const pct = (Number(obtained) / max) * 100;
  return pct < 33 ? "નાપાસ" : "";
}

export function assignSheetRanks<T extends { id: string; percentage: number | null; finalTotal: number }>(
  rows: T[],
): (T & { rank: number | null })[] {
  const eligible = rows.filter((r) => r.percentage != null && r.percentage > 0);
  const sorted = [...eligible].sort((a, b) => {
    const ap = a.percentage ?? 0;
    const bp = b.percentage ?? 0;
    if (bp !== ap) return bp - ap;
    return (b.finalTotal ?? 0) - (a.finalTotal ?? 0);
  });

  const rankById = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage !== sorted[i - 1].percentage) rank = i + 1;
    rankById.set(sorted[i].id, rank);
  }

  return rows.map((row) => ({
    ...row,
    rank: rankById.get(row.id) ?? null,
  }));
}
