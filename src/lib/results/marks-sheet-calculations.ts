import type { MarksSheetConfig, MarksSheetSubjectDef, MarksSheetTermData } from "./marks-sheet-config";

export type SubjectMarksInput = {
  subject: MarksSheetSubjectDef;
  first: number | null;
  second: number | null;
  third: number | null;
  /** Extra / dynamic term scores (mid4+, unit tests, etc.) */
  scores: Record<string, number | null>;
  /** Teacher/internal scores keyed by exam term */
  internalScores: Record<string, number | null>;
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

function rowMax(config: MarksSheetConfig, kind: string, fallback: number): number {
  const row = config.examRows.find((r) => r.kind === kind);
  if (row?.maxMarks != null && row.maxMarks > 0) return row.maxMarks;
  return fallback;
}

function sumComponentMarks(input: SubjectMarksInput, config: MarksSheetConfig): number {
  // Prefer summing from configured component rows so order/count stays correct
  const componentRows = config.examRows.filter(
    (r) =>
      r.scoreType !== "internal" &&
      (r.kind === "first" ||
        r.kind === "second" ||
        r.kind === "third" ||
        r.kind === "term"),
  );
  if (componentRows.length) {
    let sum = 0;
    for (const row of componentRows) {
      const key = row.termKey || row.key;
      if (row.kind === "first") sum += num(input.scores[key] ?? input.first);
      else if (row.kind === "second") sum += num(input.scores[key] ?? input.second);
      else if (row.kind === "third") sum += num(input.scores[key] ?? input.third);
      else sum += num(input.scores[key]);
    }
    return sum;
  }
  return (
    num(input.first) +
    num(input.second) +
    num(input.third) +
    Object.values(input.scores || {}).reduce<number>((acc, v) => acc + num(v), 0)
  );
}

export function computeSubjectMarks(
  subject: MarksSheetSubjectDef,
  input: SubjectMarksInput,
  config: MarksSheetConfig,
) {
  const totalTermMax = config.totalTermMax > 0 ? config.totalTermMax : 200;

  if (subject.type === "grade") {
    const grade = input.letterGrade || "";
    const cells: Record<string, RowCellValue> = {
      max: "",
      first: "",
      second: "",
      third: "",
      internal: "",
      annual: "",
      total: "",
      converted: grade,
      achievement: "",
      special: "",
      grace: "",
      final: grade,
    };
    for (const row of config.examRows) {
      if (row.kind === "term") cells[row.key] = "";
    }
    return cells;
  }

  const dynamicInternal = Object.values(input.internalScores || {}).reduce<number>(
    (sum, value) => sum + num(value),
    0,
  );
  // Legacy fallback when final internal was stored only in `internal`.
  const internal =
    Object.keys(input.internalScores || {}).length > 0
      ? dynamicInternal
      : num(input.internal);
  const annual = num(input.annual);
  const achievement = num(input.achievement);
  const special = num(input.special);
  const grace = num(input.grace);
  const components = sumComponentMarks(input, config);

  const denom = totalTermMax > 0 ? totalTermMax : 200;
  const total = components + internal + annual;
  const converted = (total / denom) * 100;
  const final = converted + achievement + special + grace;

  const cells: Record<string, RowCellValue> = {
    max: "",
    first: num(input.first) || num(input.scores.mid1) || null,
    second: num(input.second) || num(input.scores.mid2) || null,
    third: num(input.third) || num(input.scores.mid3) || null,
    internal: internal || null,
    annual: annual || null,
    total: total || null,
    converted: converted ? fmt(converted) : null,
    achievement: achievement || null,
    special: special || null,
    grace: grace || null,
    final: final ? fmt(final) : null,
  };

  for (const row of config.examRows) {
    if (row.scoreType === "internal" && row.termKey) {
      cells[row.key] = num(input.internalScores[row.termKey]) || null;
    } else if (row.kind === "term" || row.kind === "first" || row.kind === "second" || row.kind === "third") {
      const key = row.termKey || row.key;
      const v =
        input.scores[key] ??
        (row.kind === "first" ? input.first : null) ??
        (row.kind === "second" ? input.second : null) ??
        (row.kind === "third" ? input.third : null);
      cells[row.key] = num(v) || null;
    }
  }

  return cells;
}

export function computeStudentMarksSheet(
  config: MarksSheetConfig,
  subjects: SubjectMarksInput[],
): ComputedMarksSheet {
  const subjectCells: Record<string, Record<string, RowCellValue>> = {};
  const numericSubjects = subjects.filter((s) => s.subject.type === "numeric");
  const totalTermMax = config.totalTermMax > 0 ? config.totalTermMax : 200;

  const componentRows = config.examRows.filter(
    (r) =>
      r.scoreType !== "internal" &&
      (r.kind === "first" ||
        r.kind === "second" ||
        r.kind === "third" ||
        r.kind === "term"),
  );
  const internalRows = config.examRows.filter(
    (r) => r.scoreType === "internal" && !!r.termKey,
  );

  const componentTotals: Record<string, number> = {};
  for (const row of componentRows) componentTotals[row.key] = 0;
  const internalTotals: Record<string, number> = {};
  for (const row of internalRows) internalTotals[row.key] = 0;

  let totalInternal = 0;
  let totalAnnual = 0;
  let totalObtained = 0;
  let totalConverted = 0;
  let totalAchievement = 0;
  let totalSpecial = 0;
  let totalGrace = 0;
  let totalFinal = 0;

  for (const sub of subjects) {
    const cells = computeSubjectMarks(sub.subject, sub, config);
    subjectCells[sub.subject.code] = cells;

    if (sub.subject.type === "numeric") {
      for (const row of componentRows) {
        componentTotals[row.key] =
          (componentTotals[row.key] || 0) + num(cells[row.key] as number | null);
      }
      for (const row of internalRows) {
        internalTotals[row.key] =
          (internalTotals[row.key] || 0) + num(cells[row.key] as number | null);
      }
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
  const maxConverted = numericCount * 100;

  const summaryCells: Record<string, RowCellValue> = {
    max: "",
    first: componentTotals.first ?? componentTotals.mid1 ?? null,
    second: componentTotals.second ?? componentTotals.mid2 ?? null,
    third: componentTotals.third ?? componentTotals.mid3 ?? null,
    internal: totalInternal || null,
    annual: totalAnnual || null,
    total: totalObtained || null,
    converted: totalConverted ? fmt(totalConverted) : null,
    achievement: totalAchievement || null,
    special: totalSpecial || null,
    grace: totalGrace || null,
    final: totalFinal ? fmt(totalFinal) : null,
    totalMarks: totalObtained || null,
    maxFirst: numericCount * rowMax(config, "first", 50),
    maxSecond: numericCount * rowMax(config, "second", 50),
    maxThird: numericCount * rowMax(config, "third", 0),
    maxInternal: numericCount * rowMax(config, "internal", 20),
    maxAnnual: numericCount * rowMax(config, "annual", 80),
    maxTotal: numericCount * totalTermMax,
    percentage: pct(totalFinal, maxConverted),
    result: totalFinal >= maxConverted * 0.33 ? "પાસ" : totalFinal > 0 ? "નાપાસ" : "",
    rank: null,
  };

  for (const row of componentRows) {
    summaryCells[row.key] = componentTotals[row.key] || null;
  }
  for (const row of internalRows) {
    summaryCells[row.key] = internalTotals[row.key] || null;
  }

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
  const scores: Record<string, number | null> = { ...(term.scores || {}) };
  const internalScores: Record<string, number | null> = {
    ...(term.internalScores || {}),
  };
  if (term.first != null && scores.mid1 == null) scores.mid1 = term.first;
  if (term.second != null && scores.mid2 == null) scores.mid2 = term.second;
  if (term.third != null && scores.mid3 == null) scores.mid3 = term.third;
  if (term.internal != null && internalScores.final == null) {
    internalScores.final = term.internal;
  }

  return {
    subject,
    first: term.first ?? scores.mid1 ?? null,
    second: term.second ?? scores.mid2 ?? null,
    third: term.third ?? scores.mid3 ?? null,
    scores,
    internalScores,
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
  const p = (Number(obtained) / max) * 100;
  return p < 33 ? "નાપાસ" : "";
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
