import type {
  MarksSheetConfig,
  MarksSheetExamRowDef,
  MarksSheetSubjectDef,
  MarksSheetTermData,
} from "./marks-sheet-config";

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
  /** Term keys marked absent in marks entry */
  absent?: Record<string, boolean>;
};

function isComputerCodeOrName(code?: string | null, name?: string | null): boolean {
  const c = String(code || "").trim().toUpperCase();
  if (c === "COMP" || c === "ICT") return true;
  return /computer|કોમ્પ્યુટર|કમ્પ્યુટર|ict/i.test(String(name || ""));
}

function subjectUsesComputerRows(
  subject: MarksSheetSubjectDef,
  config: MarksSheetConfig,
): boolean {
  const hasComputerRows = config.examRows.some((r) => r.subjectScope === "computer");
  return hasComputerRows && isComputerCodeOrName(subject.code, subject.name);
}

function rowAppliesToSubject(
  row: MarksSheetExamRowDef,
  subject: MarksSheetSubjectDef,
  config: MarksSheetConfig,
): boolean {
  const computerSub = subjectUsesComputerRows(subject, config);
  if (row.subjectScope === "computer") return computerSub;
  if (computerSub && (row.subjectScope === "all" || row.kind === "annual" || row.kind === "internal")) {
    // COMP marks live only on computer exam rows when those exist
    if (
      row.kind === "first" ||
      row.kind === "second" ||
      row.kind === "third" ||
      row.kind === "term" ||
      row.kind === "annual" ||
      row.kind === "internal" ||
      row.scoreType === "internal" ||
      row.scoreType === "paper"
    ) {
      return false;
    }
  }
  return true;
}

function componentRowsForSubject(
  subject: MarksSheetSubjectDef,
  config: MarksSheetConfig,
): MarksSheetExamRowDef[] {
  const computerSub = subjectUsesComputerRows(subject, config);
  return config.examRows.filter((r) => {
    if (r.scoreType === "internal") return false;
    if (
      !(
        r.kind === "first" ||
        r.kind === "second" ||
        r.kind === "third" ||
        r.kind === "term"
      )
    ) {
      return false;
    }
    if (computerSub) return r.subjectScope === "computer";
    return r.subjectScope !== "computer";
  });
}

export type RowCellValue = number | string | null;

export type ComputedMarksSheet = {
  subjectCells: Record<string, Record<string, RowCellValue>>;
  summaryCells: Record<string, RowCellValue>;
  footer: { result: string; percentage: number | null; rank: number | null };
};

function num(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
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
  const componentRows = componentRowsForSubject(input.subject, config);
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

function sumInternalForSubject(input: SubjectMarksInput, config: MarksSheetConfig): number {
  const computerSub = subjectUsesComputerRows(input.subject, config);
  const internalRows = config.examRows.filter((r) => {
    if (r.scoreType !== "internal" || !r.termKey) return false;
    if (computerSub) return r.subjectScope === "computer";
    return r.subjectScope !== "computer";
  });
  if (internalRows.length) {
    return internalRows.reduce(
      (sum, row) => sum + num(input.internalScores[row.termKey!]),
      0,
    );
  }
  const dynamicInternal = Object.values(input.internalScores || {}).reduce<number>(
    (sum, value) => sum + num(value),
    0,
  );
  return Object.keys(input.internalScores || {}).length > 0
    ? dynamicInternal
    : num(input.internal);
}

export function computeSubjectMarks(
  subject: MarksSheetSubjectDef,
  input: SubjectMarksInput,
  config: MarksSheetConfig,
) {
  const computerSub = subjectUsesComputerRows(subject, config);
  const totalTermMax = computerSub
    ? config.computerTermMax && config.computerTermMax > 0
      ? config.computerTermMax
      : config.totalTermMax > 0
        ? config.totalTermMax
        : 100
    : config.totalTermMax > 0
      ? config.totalTermMax
      : 200;

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

  const internal = sumInternalForSubject(input, config);
  // Computer column does not use the general annual / achievement rows
  const annual = computerSub ? 0 : num(input.annual);
  const achievement = computerSub ? 0 : num(input.achievement);
  const special = computerSub ? 0 : num(input.special);
  const grace = computerSub ? 0 : num(input.grace);
  const components = sumComponentMarks(input, config);

  const denom = totalTermMax > 0 ? totalTermMax : 200;
  const total = components + internal + annual;
  const converted = denom > 0 ? (total / denom) * 100 : 0;
  const final = converted + achievement + special + grace;

  const absentCell = (keys: string[], value: number | null): RowCellValue =>
    keys.some((key) => input.absent?.[key]) ? "AB" : value;

  const cells: Record<string, RowCellValue> = {
    max: "",
    first: computerSub
      ? null
      : absentCell(["mid1", "first"], num(input.first) || num(input.scores.mid1) || null),
    second: computerSub
      ? null
      : absentCell(["mid2", "second"], num(input.second) || num(input.scores.mid2) || null),
    third: computerSub
      ? null
      : absentCell(["mid3", "third"], num(input.third) || num(input.scores.mid3) || null),
    internal: computerSub ? null : input.absent?.final ? "AB" : internal || null,
    annual: computerSub
      ? null
      : absentCell(["final", "annual"], annual || null),
    total: computerSub ? null : total || null,
    converted: computerSub ? null : converted ? fmt(converted) : null,
    achievement: computerSub ? null : achievement || null,
    special: computerSub ? null : special || null,
    grace: computerSub ? null : grace || null,
    final: computerSub ? (total ? fmt(total) : null) : final ? fmt(final) : null,
    computer_total: computerSub ? total || null : null,
  };

  for (const row of config.examRows) {
    if (!rowAppliesToSubject(row, subject, config)) {
      cells[row.key] = null;
      continue;
    }
    if (row.key === "computer_total") {
      cells[row.key] = computerSub ? total || null : null;
      continue;
    }
    if (row.scoreType === "internal" && row.termKey) {
      cells[row.key] = input.absent?.[row.termKey]
        ? "AB"
        : num(input.internalScores[row.termKey]) || null;
    } else if (row.kind === "term" || row.kind === "first" || row.kind === "second" || row.kind === "third") {
      const key = row.termKey || row.key;
      if (input.absent?.[key]) {
        cells[row.key] = "AB";
        continue;
      }
      const v =
        input.scores[key] ??
        (row.kind === "first" ? input.first : null) ??
        (row.kind === "second" ? input.second : null) ??
        (row.kind === "third" ? input.third : null);
      cells[row.key] = num(v) || null;
    } else if (
      (row.kind === "annual" || row.key === "annual") &&
      (input.absent?.final || input.absent?.annual)
    ) {
      cells[row.key] = "AB";
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
  let computerTotalObtained = 0;

  for (const sub of subjects) {
    const cells = computeSubjectMarks(sub.subject, sub, config);
    subjectCells[sub.subject.code] = cells;
    const computerSub = subjectUsesComputerRows(sub.subject, config);

    if (sub.subject.type === "numeric") {
      for (const row of componentRows) {
        if (!rowAppliesToSubject(row, sub.subject, config)) continue;
        componentTotals[row.key] =
          (componentTotals[row.key] || 0) + num(cells[row.key] as number | null);
      }
      for (const row of internalRows) {
        if (!rowAppliesToSubject(row, sub.subject, config)) continue;
        internalTotals[row.key] =
          (internalTotals[row.key] || 0) + num(cells[row.key] as number | null);
      }
      if (computerSub) {
        computerTotalObtained += num(cells.computer_total as number | null);
      } else {
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
  if (config.computerTermMax && config.computerTermMax > 0) {
    summaryCells.computer_total = computerTotalObtained || null;
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
    absent: term.absent || {},
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
