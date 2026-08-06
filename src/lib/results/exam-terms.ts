import {
  getMarksSheetConfig,
  parseTermRemarks,
  serializeTermRemarks,
  type MarksSheetConfig,
  type MarksSheetExamRowDef,
  type MarksSheetSubjectDef,
  type MarksSheetTermData,
} from "@/lib/results/marks-sheet-config";

/** Any unique term id — mid1/mid2/final or custom_* */
export type ExamTermKey = string;
export type ExamTermRole = "component" | "final";

/** @deprecated Prefer counting active component terms */
export type MidExamCount = number;

export interface ExamTermDef {
  key: ExamTermKey;
  labelEn: string;
  labelGu: string;
  /** Storage key: first|second|third|annual|or custom id */
  fieldKey: string;
  role: ExamTermRole;
  /** Declared total out-of; must equal paper + teacher/internal */
  totalMax: number;
  /** Written paper out-of */
  maxMarks: number;
  /** Teacher/internal assessment out-of for this exam */
  internalMax?: number;
  published: boolean;
  publishedAt: string | null;
  locked: boolean;
  examDate: string | null;
}

export interface ExamTermMeta {
  version: 2;
  /** Ordered list — components first, final last */
  terms: ExamTermDef[];
  /** Derived for older UI; component count */
  midExamCount: number;
}

const LEGACY_FIELD: Record<string, string> = {
  mid1: "first",
  mid2: "second",
  mid3: "third",
  final: "annual",
};

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
  return base || "exam";
}

export function makeTermKey(label: string, existing: string[]): string {
  let key = slugify(label);
  if (!existing.includes(key) && key !== "final" && key !== "internal")
    return key;
  let i = 2;
  while (existing.includes(`${key}_${i}`)) i++;
  return `${key}_${i}`;
}

function withStatus(
  partial: Omit<
    ExamTermDef,
    "published" | "publishedAt" | "locked" | "examDate"
  > &
    Partial<
      Pick<ExamTermDef, "published" | "publishedAt" | "locked" | "examDate">
    >,
): ExamTermDef {
  return {
    published: false,
    publishedAt: null,
    locked: false,
    examDate: null,
    ...partial,
  };
}

export function createComponentTerm(opts: {
  key?: string;
  labelEn: string;
  labelGu?: string;
  maxMarks?: number;
  internalMax?: number;
  totalMax?: number;
  existingKeys?: string[];
}): ExamTermDef {
  const existing = opts.existingKeys || [];
  const key = opts.key || makeTermKey(opts.labelEn, existing);
  const fieldKey = LEGACY_FIELD[key] || key;
  return withStatus({
    key,
    labelEn: opts.labelEn,
    labelGu: opts.labelGu || opts.labelEn,
    fieldKey,
    role: "component",
    maxMarks: opts.maxMarks ?? 50,
    internalMax: opts.internalMax ?? 0,
    totalMax: opts.totalMax ?? (opts.maxMarks ?? 50) + (opts.internalMax ?? 0),
  });
}

export function createFinalTerm(opts?: {
  maxMarks?: number;
  internalMax?: number;
  totalMax?: number;
  labelEn?: string;
  labelGu?: string;
}): ExamTermDef {
  return withStatus({
    key: "final",
    labelEn: opts?.labelEn || "Final Exam",
    labelGu: opts?.labelGu || "વાર્ષિક / અંતિમ પરીક્ષા",
    fieldKey: "annual",
    role: "final",
    maxMarks: opts?.maxMarks ?? 80,
    internalMax: opts?.internalMax ?? 20,
    totalMax:
      opts?.totalMax ?? (opts?.maxMarks ?? 80) + (opts?.internalMax ?? 20),
  });
}

/** Default: Mid1 + Mid2 + Final (most common) */
export function defaultExamTermMeta(
  midExamCount: MidExamCount = 2,
): ExamTermMeta {
  const count = Math.max(1, Math.min(12, Number(midExamCount) || 2));
  const components: ExamTermDef[] = [];
  for (let i = 1; i <= count; i++) {
    const key = `mid${i}`;
    components.push(
      createComponentTerm({
        key,
        labelEn: `Mid Exam ${i}`,
        labelGu:
          i === 1
            ? "પહેલી મધ્યમાં પરીક્ષા"
            : i === 2
              ? "બીજી મધ્યમાં પરીક્ષા"
              : `મધ્ય પરીક્ષા ${i}`,
        maxMarks: 50,
        existingKeys: components.map((c) => c.key),
      }),
    );
  }
  const terms = [...components, createFinalTerm()];
  return { version: 2, terms, midExamCount: components.length };
}

function normalizeFromLegacyRecord(parsed: {
  midExamCount?: unknown;
  terms?: Record<string, Partial<ExamTermDef>>;
}): ExamTermMeta {
  const n = Number(parsed.midExamCount);
  const count = n === 1 ? 1 : n === 3 ? 3 : n > 3 ? Math.min(12, n) : 2;
  const base = defaultExamTermMeta(count);
  const src = parsed.terms || {};
  for (const term of base.terms) {
    const patch = src[term.key];
    if (!patch) continue;
    Object.assign(term, {
      ...patch,
      key: term.key,
      role: term.role,
      fieldKey: term.fieldKey,
      totalMax:
        patch.totalMax ??
        (Number(patch.maxMarks ?? term.maxMarks) || 0) +
          (Number(patch.internalMax ?? term.internalMax) || 0),
    });
  }
  // Import any extra keys from legacy record (custom)
  for (const [key, patch] of Object.entries(src)) {
    if (base.terms.some((t) => t.key === key)) continue;
    if (!patch || key === "internal") continue;
    base.terms.splice(
      base.terms.length - 1,
      0,
      withStatus({
        key,
        labelEn: patch.labelEn || key,
        labelGu: patch.labelGu || patch.labelEn || key,
        fieldKey: patch.fieldKey || LEGACY_FIELD[key] || key,
        role: "component",
        maxMarks: Number(patch.maxMarks) || 50,
        internalMax: Math.max(0, Number(patch.internalMax) || 0),
        totalMax:
          Number(patch.totalMax) ||
          (Number(patch.maxMarks) || 50) +
            Math.max(0, Number(patch.internalMax) || 0),
        published: !!patch.published,
        publishedAt: patch.publishedAt ?? null,
        locked: !!patch.locked,
        examDate: patch.examDate ?? null,
      }),
    );
  }
  base.midExamCount = base.terms.filter((t) => t.role === "component").length;
  return base;
}

export function parseExamTermMeta(raw?: string | null): ExamTermMeta {
  if (!raw) return defaultExamTermMeta(2);
  try {
    const parsed = JSON.parse(raw) as {
      version?: number;
      midExamCount?: unknown;
      terms?: ExamTermDef[] | Record<string, Partial<ExamTermDef>>;
    };

    if (Array.isArray(parsed.terms)) {
      const terms = parsed.terms
        .filter((t) => t && t.key)
        .map((t) => {
          const role: ExamTermRole =
            t.role === "final" || t.key === "final" ? "final" : "component";
          return withStatus({
            key: String(t.key),
            labelEn: t.labelEn || String(t.key),
            labelGu: t.labelGu || t.labelEn || String(t.key),
            fieldKey: t.fieldKey || LEGACY_FIELD[t.key] || String(t.key),
            role,
            maxMarks: Math.max(0, Number(t.maxMarks) || 0),
            internalMax: Math.max(
              0,
              Number(t.internalMax) || (role === "final" ? 20 : 0),
            ),
            totalMax: Math.max(
              0,
              Number(t.totalMax) ||
                (Number(t.maxMarks) || 0) +
                  (Number(t.internalMax) || (role === "final" ? 20 : 0)),
            ),
            published: !!t.published,
            publishedAt: t.publishedAt ?? null,
            locked: !!t.locked,
            examDate: t.examDate ?? null,
          });
        });

      // Ensure exactly one final at end
      let finals = terms.filter((t) => t.role === "final");
      let components = terms.filter((t) => t.role === "component");
      if (!finals.length) finals = [createFinalTerm()];
      if (!components.length) {
        components = [
          createComponentTerm({
            key: "mid1",
            labelEn: "Mid Exam 1",
            labelGu: "પહેલી મધ્યમાં પરીક્ષા",
          }),
        ];
      }
      const final = finals[finals.length - 1]!;
      const ordered = [...components, final];
      return {
        version: 2,
        terms: ordered,
        midExamCount: components.length,
      };
    }

    // Legacy Record shape
    if (parsed.terms && typeof parsed.terms === "object") {
      return normalizeFromLegacyRecord({
        midExamCount: parsed.midExamCount,
        terms: parsed.terms as Record<string, Partial<ExamTermDef>>,
      });
    }

    return defaultExamTermMeta(2);
  } catch {
    return defaultExamTermMeta(2);
  }
}

export function serializeExamTermMeta(meta: ExamTermMeta): string {
  const components = meta.terms.filter((t) => t.role === "component");
  const final = meta.terms.find((t) => t.role === "final") || createFinalTerm();
  const normalized: ExamTermMeta = {
    version: 2,
    terms: [...components, final],
    midExamCount: components.length,
  };
  return JSON.stringify(normalized);
}

export function getTerm(
  meta: ExamTermMeta,
  key: string,
): ExamTermDef | undefined {
  return meta.terms.find((t) => t.key === key);
}

export function activeExamTerms(meta: ExamTermMeta): ExamTermDef[] {
  return meta.terms;
}

export function componentTerms(meta: ExamTermMeta): ExamTermDef[] {
  return meta.terms.filter((t) => t.role === "component");
}

export function finalTerm(meta: ExamTermMeta): ExamTermDef {
  return meta.terms.find((t) => t.role === "final") || createFinalTerm();
}

export function isValidTermKey(term: string, meta: ExamTermMeta): boolean {
  return meta.terms.some((t) => t.key === term);
}

export function totalTermMaxFromMeta(meta: ExamTermMeta): number {
  let total = 0;
  for (const term of activeExamTerms(meta)) {
    total += Math.max(
      0,
      Number(term.totalMax) ||
        (Number(term.maxMarks) || 0) + (Number(term.internalMax) || 0),
    );
  }
  return total || 200;
}

/** Legacy-shaped breakdown for older callers; extras go into third+ via total */
export function termMaxBreakdown(meta: ExamTermMeta): {
  first: number;
  second: number;
  third: number;
  internal: number;
  annual: number;
  total: number;
  components: Array<{ key: string; maxMarks: number; labelEn: string }>;
} {
  const comps = componentTerms(meta);
  const fin = finalTerm(meta);
  const first = comps[0]?.maxMarks || 0;
  const second = comps[1]?.maxMarks || 0;
  const third = comps.slice(2).reduce((s, t) => s + (t.maxMarks || 0), 0);
  const annual = fin.maxMarks || 0;
  const internal = fin.internalMax || 0;
  return {
    first,
    second,
    third,
    internal,
    annual,
    total: totalTermMaxFromMeta(meta),
    components: comps.map((c) => ({
      key: c.key,
      maxMarks: c.maxMarks,
      labelEn: c.labelEn,
    })),
  };
}

function resultRows(config: MarksSheetConfig): MarksSheetExamRowDef[] {
  return [
    {
      key: "converted",
      label: "રૂપાંતરણ ગુણ",
      maxMarks: config.convertedMax,
      kind: "converted",
    },
    {
      key: "achievement",
      label: "સિધ્ધિ ગુણ",
      maxMarks: config.achievementMax,
      kind: "achievement",
    },
    { key: "special", label: "વિશિષ્ટ ગુણ", maxMarks: null, kind: "special" },
    { key: "grace", label: "કૃપા ગુણ", maxMarks: 10, kind: "grace" },
    {
      key: "final",
      label: "મેળવેલ ગુણ",
      maxMarks: config.convertedMax,
      kind: "final",
    },
  ];
}

/** Rebuild marks-sheet rows from configured exams */
export function applyTermMetaToSheetConfig(
  config: MarksSheetConfig,
  meta: ExamTermMeta,
): MarksSheetConfig {
  const total = totalTermMaxFromMeta(meta);
  const fin = finalTerm(meta);
  const comps = componentTerms(meta);

  const configuredRows = comps.flatMap((t, idx) => {
    // Keep classic kinds for first 3 so old sheets stay familiar
    const classicKind =
      idx === 0 ? "first" : idx === 1 ? "second" : idx === 2 ? "third" : "term";
    const paper: MarksSheetExamRowDef = {
      key: t.key,
      label: `${t.labelGu || t.labelEn} — પેપર`,
      maxMarks: t.maxMarks,
      kind: classicKind as MarksSheetExamRowDef["kind"],
      termKey: t.key,
      scoreType: "paper",
    };
    const internal: MarksSheetExamRowDef = {
      key: `${t.key}__internal`,
      label: `${t.labelGu || t.labelEn} — આંતરિક`,
      maxMarks: t.internalMax ?? 0,
      kind: "term",
      termKey: t.key,
      scoreType: "internal",
    };
    return (t.internalMax ?? 0) > 0 ? [paper, internal] : [paper];
  });

  const finalLabel = fin.labelGu || fin.labelEn || "વાર્ષિક";
  const finalRows: MarksSheetExamRowDef[] = [
    {
      key: "annual",
      label: `${finalLabel} — પેપર`,
      maxMarks: fin.maxMarks,
      kind: "annual",
      termKey: fin.key,
      scoreType: "paper",
    },
  ];
  if ((fin.internalMax ?? 0) > 0) {
    finalRows.push({
      key: "internal",
      label: `${finalLabel} — આંતરિક`,
      maxMarks: fin.internalMax ?? 0,
      kind: "internal",
      termKey: fin.key,
      scoreType: "internal",
    });
  }

  const examRows: MarksSheetExamRowDef[] = [
    { key: "max", label: "પરીક્ષા", maxMarks: null, kind: "max" },
    ...configuredRows,
    ...finalRows,
    { key: "total", label: "કુલ પ્રાપ્ત ગુણ", maxMarks: total, kind: "total" },
    ...resultRows(config),
  ];

  return { ...config, examRows, totalTermMax: total };
}

export function readTermScore(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  annualMarks?: number | null,
): number | null {
  if (term.role === "final" || term.fieldKey === "annual") {
    return annualMarks ?? null;
  }
  const fromScores =
    termData.scores?.[term.key] ?? termData.scores?.[term.fieldKey] ?? null;
  if (fromScores != null && fromScores !== undefined) return Number(fromScores);

  if (term.fieldKey === "first") return termData.first ?? null;
  if (term.fieldKey === "second") return termData.second ?? null;
  if (term.fieldKey === "third") return termData.third ?? null;
  return null;
}

/** @deprecated use readTermScore */
export function termMarksValue(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  annualMarks?: number | null,
): number | null {
  return readTermScore(term, termData, annualMarks);
}

export function writeTermScore(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  value: number | null,
): { termData: MarksSheetTermData; annual: number | null } {
  const next: MarksSheetTermData = {
    ...termData,
    scores: { ...(termData.scores || {}) },
  };
  let annual: number | null = null;

  if (term.role === "final" || term.fieldKey === "annual") {
    annual = value;
    return { termData: next, annual };
  }

  next.scores![term.key] = value;
  if (term.fieldKey === "first") next.first = value;
  else if (term.fieldKey === "second") next.second = value;
  else if (term.fieldKey === "third") next.third = value;

  return { termData: next, annual };
}

export function readTermInternalScore(
  term: ExamTermDef,
  termData: MarksSheetTermData,
): number | null {
  const dynamic = termData.internalScores?.[term.key];
  if (dynamic != null) return Number(dynamic);
  if (term.role === "final") return termData.internal ?? null;
  return null;
}

export function writeTermInternalScore(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  value: number | null,
): MarksSheetTermData {
  const next: MarksSheetTermData = {
    ...termData,
    internalScores: { ...(termData.internalScores || {}), [term.key]: value },
  };
  if (term.role === "final") next.internal = value;
  return next;
}

/** @deprecated use writeTermScore */
export function setTermMarksValue(
  term: ExamTermDef,
  termData: MarksSheetTermData,
  value: number | null,
) {
  return writeTermScore(term, termData, value);
}

export function collectComponentScores(
  termData: MarksSheetTermData,
  meta: ExamTermMeta,
): Record<string, number | null> {
  const out: Record<string, number | null> = { ...(termData.scores || {}) };
  for (const term of componentTerms(meta)) {
    out[term.key] = readTermScore(term, termData, null);
  }
  // legacy mirrors
  if (termData.first != null && out.mid1 == null) out.mid1 = termData.first;
  if (termData.second != null && out.mid2 == null) out.mid2 = termData.second;
  if (termData.third != null && out.mid3 == null) out.mid3 = termData.third;
  return out;
}

export function numericSubjects(config: {
  subjects: MarksSheetSubjectDef[];
}): MarksSheetSubjectDef[] {
  return config.subjects.filter((s) => s.type === "numeric");
}

export function computeTermCompletion(
  term: ExamTermDef,
  _meta: ExamTermMeta,
  students: Array<{
    subjectMarks: Array<{
      subjectCode: string;
      subjectType: "numeric" | "grade";
      termValue: number | null;
      internalValue?: number | null;
    }>;
  }>,
): {
  complete: number;
  partial: number;
  pending: number;
  total: number;
  percent: number;
} {
  const total = students.length;
  if (!total)
    return { complete: 0, partial: 0, pending: 0, total: 0, percent: 0 };

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
      const paperDone = s.termValue != null;
      const internalDone =
        (term.internalMax ?? 0) <= 0 || s.internalValue != null;
      return paperDone && internalDone;
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

/** Paper / external mark field names accepted from web + mobile clients */
export const TERM_PAPER_MARK_KEYS = [
  "termValue",
  "externalValue",
  "external",
  "paperValue",
  "paperMarks",
  "paper",
  "marks",
  "value",
] as const;

/** Teacher / internal mark field names accepted from web + mobile clients */
export const TERM_INTERNAL_MARK_KEYS = [
  "internalValue",
  "internal",
  "internalMarks",
  "teacherMarks",
  "teacherValue",
  "teacher",
] as const;

/**
 * Read an optional numeric mark from a subject payload.
 * `undefined` = field omitted (leave existing DB value unchanged).
 * `null` = explicit clear.
 */
export function pickSubjectMarkField(
  sub: Record<string, unknown>,
  keys: readonly string[],
): number | null | undefined {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(sub, key)) continue;
    const raw = sub[key];
    if (raw === null || raw === "") return null;
    if (raw === undefined) continue;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return undefined;
}

export function resolveTermInternalMax(term: ExamTermDef): number {
  if ((term.internalMax ?? 0) > 0) return term.internalMax ?? 0;
  const derived = Math.max(0, (term.totalMax ?? 0) - (term.maxMarks ?? 0));
  if (derived > 0) return derived;
  return term.role === "final" ? 20 : 0;
}

export function clampTermMarks(
  term: ExamTermDef,
  value: number | null,
): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.min(Math.max(0, value), term.maxMarks);
}

export function buildStudentTermRows(
  termKey: ExamTermKey,
  meta: ExamTermMeta,
  sheetConfig: ReturnType<typeof getMarksSheetConfig> | MarksSheetConfig,
  students: Array<{
    id: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    firstNameGu?: string | null;
    middleNameGu?: string | null;
    surnameGu?: string | null;
    rollNumber?: string | null;
    grNumber?: string | null;
    dateOfBirth?: string | null;
  }>,
  results: Array<{
    studentId: string;
    subjectId: string;
    marksObtained: number;
    remarks: string | null;
  }>,
  examSubjects: Array<{ id: string; code: string | null; name: string }>,
) {
  const term = getTerm(meta, termKey);
  if (!term) return [];
  const subjects = sheetConfig.subjects;

  return students.map((st) => {
    const subjectMarks = subjects.map((def) => {
      const examSub =
        examSubjects.find((s) => s.code === def.code) ||
        examSubjects.find((s) => s.name === def.name);
      const result = examSub
        ? results.find(
            (r) => r.studentId === st.id && r.subjectId === examSub.id,
          )
        : null;
      const termData = parseTermRemarks(result?.remarks);
      const termValue = readTermScore(
        term,
        termData,
        result?.marksObtained ?? null,
      );
      const internalValue = readTermInternalScore(term, termData);

      const internalMax = resolveTermInternalMax(term);
      const showInternal = internalMax > 0 && def.type === "numeric";

      return {
        subjectCode: def.code,
        subjectName: def.name,
        subjectType: def.type,
        examSubjectId: examSub?.id ?? null,
        termValue: def.type === "grade" ? null : termValue,
        /** Alias for mobile clients */
        externalValue: def.type === "grade" ? null : termValue,
        internalValue: showInternal ? internalValue : null,
        /** Alias for mobile clients */
        internal: showInternal ? internalValue : null,
        internalMax: showInternal ? internalMax : 0,
        paperMax: term.maxMarks,
        letterGrade: def.type === "grade" ? termData.letterGrade : null,
      };
    });

    return {
      studentId: st.id,
      firstName: st.firstName,
      middleName: st.middleName,
      surname: st.surname,
      firstNameGu: st.firstNameGu,
      middleNameGu: st.middleNameGu,
      surnameGu: st.surnameGu,
      rollNumber: st.rollNumber,
      grNumber: st.grNumber,
      dateOfBirth: st.dateOfBirth,
      subjectMarks,
    };
  });
}

export type TermStudentRow = ReturnType<typeof buildStudentTermRows>[number];

/** Build meta from UI template list */
export function metaFromTemplateTerms(
  items: Array<{
    key?: string;
    labelEn: string;
    labelGu?: string;
    maxMarks: number;
    totalMax?: number;
    role?: ExamTermRole;
    internalMax?: number;
    examDate?: string | null;
  }>,
): ExamTermMeta {
  const components: ExamTermDef[] = [];
  let final = createFinalTerm();

  for (const item of items) {
    if (item.role === "final" || item.key === "final") {
      final = createFinalTerm({
        maxMarks: item.maxMarks,
        internalMax: item.internalMax,
        totalMax: item.totalMax,
        labelEn: item.labelEn,
        labelGu: item.labelGu,
      });
      if (item.examDate) final.examDate = item.examDate;
      continue;
    }
    const term = createComponentTerm({
      key: item.key,
      labelEn: item.labelEn,
      labelGu: item.labelGu,
      maxMarks: item.maxMarks,
      internalMax: item.internalMax,
      totalMax: item.totalMax,
      existingKeys: components.map((c) => c.key),
    });
    if (item.examDate) term.examDate = item.examDate;
    components.push(term);
  }

  if (!components.length) {
    components.push(
      createComponentTerm({
        key: "mid1",
        labelEn: "Mid Exam 1",
        labelGu: "પહેલી મધ્યમાં પરીક્ષા",
      }),
    );
  }

  return {
    version: 2,
    terms: [...components, final],
    midExamCount: components.length,
  };
}

export { parseTermRemarks, serializeTermRemarks };
