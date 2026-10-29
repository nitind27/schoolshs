/** Marks register layout — matches official Gujarati class marks sheet */

export type MarksSheetSubjectType = "numeric" | "grade";

export type MarksSheetSubjectDef = {
  name: string;
  shortName: string;
  type: MarksSheetSubjectType;
  code: string;
  /** Per-subject out-of when the school scheme is not 100 */
  maxMarks?: number;
};

export type MarksSheetExamRowDef = {
  key: string;
  label: string;
  maxMarks: number | null;
  kind:
    | "max"
    | "first"
    | "second"
    | "third"
    | "term"
    | "internal"
    | "annual"
    | "total"
    | "converted"
    | "achievement"
    | "special"
    | "grace"
    | "final";
  /** Links dynamic exam template term */
  termKey?: string;
  /** Whether this dynamic row stores paper or teacher/internal marks */
  scoreType?: "paper" | "internal";
};

export type MarksSheetConfig = {
  subjects: MarksSheetSubjectDef[];
  examRows: MarksSheetExamRowDef[];
  totalTermMax: number;
  convertedMax: number;
  achievementMax: number;
};

const EXAM_ROWS: MarksSheetExamRowDef[] = [
  { key: "max", label: "પરીક્ષા", maxMarks: null, kind: "max" },
  { key: "first", label: "પ્રથમ", maxMarks: 50, kind: "first" },
  { key: "second", label: "દ્વિતીય", maxMarks: 50, kind: "second" },
  { key: "internal", label: "આંતરિક", maxMarks: 20, kind: "internal" },
  { key: "annual", label: "વાર્ષિક", maxMarks: 80, kind: "annual" },
  { key: "total", label: "કુલ પ્રાપ્ત ગુણ", maxMarks: 200, kind: "total" },
  { key: "converted", label: "રૂપાંતરણ ગુણ", maxMarks: 100, kind: "converted" },
  { key: "achievement", label: "સિધ્ધિ ગુણ", maxMarks: 15, kind: "achievement" },
  { key: "special", label: "વિશિષ્ટ ગુણ", maxMarks: null, kind: "special" },
  { key: "grace", label: "કૃપા ગુણ", maxMarks: 10, kind: "grace" },
  { key: "final", label: "મેળવેલ ગુણ", maxMarks: 100, kind: "final" },
];

export const COMMERCE_MARKS_SHEET_SUBJECTS: MarksSheetSubjectDef[] = [
  { name: "ગુજરાતી", shortName: "ગુ", type: "numeric", code: "GUJ" },
  { name: "અંગ્રેજી", shortName: "અં", type: "numeric", code: "ENG" },
  { name: "અર્થશાસ્ત્ર", shortName: "અર્થ", type: "numeric", code: "ECO" },
  { name: "હિસાબ વિજ્ઞાન", shortName: "હિસા", type: "numeric", code: "ACC" },
  { name: "વ્યવ.પ્રશાસન", shortName: "વ્ય.પ્ર", type: "numeric", code: "BOM" },
  { name: "લેખાંકન", shortName: "લે", type: "numeric", code: "BK" },
  { name: "સંખ્યાશાસ્ત્ર", shortName: "સં", type: "numeric", code: "STAT" },
  { name: "શા. & શિ.", shortName: "શા.અ", type: "grade", code: "PE" },
  { name: "ઉદ્યોગ", shortName: "ઉદ્યો", type: "grade", code: "IND" },
];

export const ARTS_MARKS_SHEET_SUBJECTS: MarksSheetSubjectDef[] = [
  { name: "ગુજરાતી", shortName: "ગુ", type: "numeric", code: "GUJ" },
  { name: "અંગ્રેજી", shortName: "અં", type: "numeric", code: "ENG" },
  { name: "હિન્દી", shortName: "હિ", type: "numeric", code: "HIN" },
  { name: "ઇતિહાસ", shortName: "ઇ", type: "numeric", code: "HIS" },
  { name: "ભૂગોળ", shortName: "ભૂ", type: "numeric", code: "GEO" },
  { name: "અર્થશાસ્ત્ર", shortName: "અર્થ", type: "numeric", code: "ECO" },
  { name: "મનોવિજ્ઞાન", shortName: "મનો", type: "numeric", code: "PSY" },
  { name: "શા. & શિ.", shortName: "શા.અ", type: "grade", code: "PE" },
  { name: "ઉદ્યોગ", shortName: "ઉદ્યો", type: "grade", code: "IND" },
];

export const SECONDARY_MARKS_SHEET_SUBJECTS: MarksSheetSubjectDef[] = [
  { name: "ગુજરાતી", shortName: "ગુ", type: "numeric", code: "GUJ" },
  { name: "અંગ્રેજી", shortName: "અં", type: "numeric", code: "ENG" },
  { name: "હિન્દી", shortName: "હિ", type: "numeric", code: "HIN" },
  { name: "સંસ્કૃત", shortName: "સં", type: "numeric", code: "SAN" },
  { name: "ગણિત", shortName: "ગણિ", type: "numeric", code: "MATH" },
  { name: "વિજ્ઞાન", shortName: "વિજ્", type: "numeric", code: "SCI" },
  { name: "સામાજિક વિજ્ઞાન", shortName: "સા.વિ", type: "numeric", code: "SS" },
  { name: "શા. શિક્ષણ", shortName: "શા.શિ", type: "grade", code: "PE" },
  { name: "ચિત્રકામ", shortName: "ચિ", type: "grade", code: "ART" },
  { name: "કોમ્પ્યુટર", shortName: "કોમ્પ", type: "grade", code: "COMP" },
];

/** Upper primary result extras for school 24261004404 (standards 6–8). */
export const SONGADH_UPPER_PRIMARY_SUBJECTS: MarksSheetSubjectDef[] = [
  { name: "કોમ્પ્યુટર", shortName: "કમ્પ્યુ", type: "numeric", code: "COMP" },
  { name: "શારીરિક શિક્ષણ", shortName: "શા.શિ", type: "numeric", code: "PE" },
  { name: "સામાન્ય જ્ઞાન", shortName: "સા.જ્ઞા", type: "numeric", code: "GK" },
];

// ─── School 24261004403 — બાલવાટિકા Primary (Balvatika + Std 1–5) ────────────
// Notebook:
//   બાલવાટિકા     →  10+40=50   (5 subjects)
//   ધોરણ 1-2      →  10+40=50   (6 subjects)
//   ધોરણ 3 થી 5   →  80+20=100  (9 subjects)

export const SONGADH_PRIMARY_CODE = "24261004403";
export const SONGADH_PRIMARY_STANDARDS = ["Balvatika", "1", "2", "3", "4", "5"] as const;

function n50(partial: Omit<MarksSheetSubjectDef, "type" | "maxMarks">): MarksSheetSubjectDef {
  return { ...partial, type: "numeric", maxMarks: 50 };
}
function n100(partial: Omit<MarksSheetSubjectDef, "type" | "maxMarks">): MarksSheetSubjectDef {
  return { ...partial, type: "numeric", maxMarks: 100 };
}

/** School 24261004403 — બાલવાટિકા (total 50 per subject) */
export const SONGADH_PRIMARY_BALVATIKA_SUBJECTS: MarksSheetSubjectDef[] = [
  n50({ name: "ગુજરાતી (ભાષા)", shortName: "ગુ", code: "GUJ" }),
  n50({ name: "ગણિત", shortName: "ગણ", code: "MATH" }),
  n50({ name: "અભ્યાસક્રમ", shortName: "અભ્યા", code: "CURR" }),
  n50({ name: "અંગ્રેજી", shortName: "અં", code: "ENG" }),
  n50({ name: "ન્યાયશાસ્ત્ર", shortName: "ન્યા", code: "NYAYA" }),
];

/** School 24261004403 — Std 1 & 2 (total 50 per subject) */
export const SONGADH_PRIMARY_STD12_SUBJECTS: MarksSheetSubjectDef[] = [
  n50({ name: "ગુજરાતી", shortName: "ગુ", code: "GUJ" }),
  n50({ name: "ગણિત", shortName: "ગણ", code: "MATH" }),
  n50({ name: "અંગ્રેજી", shortName: "અં", code: "ENG" }),
  n50({ name: "હિન્દી", shortName: "હિ", code: "HIN" }),
  n50({ name: "સામાજિક જ્ઞાન", shortName: "સા.જ્ઞા", code: "SS" }),
  n50({ name: "વિજ્ઞાન", shortName: "વિ", code: "SCI" }),
];

/** School 24261004403 — Std 3 to 5 (total 100 per subject) */
export const SONGADH_PRIMARY_STD35_SUBJECTS: MarksSheetSubjectDef[] = [
  n100({ name: "ગુજરાતી", shortName: "ગુ", code: "GUJ" }),
  n100({ name: "ગણિત", shortName: "ગણ", code: "MATH" }),
  n100({ name: "પર્યાવરણ", shortName: "પ.વ", code: "ENV" }),
  n100({ name: "હિન્દી", shortName: "હિ", code: "HIN" }),
  n100({ name: "અંગ્રેજી", shortName: "અં", code: "ENG" }),
  n100({ name: "સામાન્ય જ્ઞાન", shortName: "સા.જ્ઞા", code: "GK" }),
  n100({ name: "વિજ્ઞાન", shortName: "વિ", code: "SCI" }),
  n100({ name: "કમ્પ્યુટર", shortName: "કમ્પ્યુ", code: "COMP" }),
  n100({ name: "P.T.", shortName: "PT", code: "PT" }),
];

export function normalizeSongadhPrimaryStandard(standard: string): string {
  const raw = String(standard || "").trim();
  if (/^balvatika$/i.test(raw) || raw === "બાલવાટિકા") return "Balvatika";
  return raw.replace(/^0+/, "") || raw;
}

export function songadhPrimarySubjectsForStandard(
  standard: string,
): MarksSheetSubjectDef[] | null {
  const std = normalizeSongadhPrimaryStandard(standard);
  if (std === "Balvatika") return SONGADH_PRIMARY_BALVATIKA_SUBJECTS;
  if (std === "1" || std === "2") return SONGADH_PRIMARY_STD12_SUBJECTS;
  if (["3", "4", "5"].includes(std)) return SONGADH_PRIMARY_STD35_SUBJECTS;
  return null;
}

/** Master catalog — unique codes, full names */
export function songadhPrimaryMasterSubjects(): MarksSheetSubjectDef[] {
  const map = new Map<string, MarksSheetSubjectDef>();
  for (const s of [
    ...SONGADH_PRIMARY_STD35_SUBJECTS,
    ...SONGADH_PRIMARY_STD12_SUBJECTS,
    ...SONGADH_PRIMARY_BALVATIKA_SUBJECTS,
  ]) {
    if (!map.has(s.code)) map.set(s.code, { ...s, maxMarks: s.maxMarks ?? 100 });
  }
  return Array.from(map.values());
}

function buildConfig(subjects: MarksSheetSubjectDef[]): MarksSheetConfig {
  return {
    subjects,
    examRows: EXAM_ROWS,
    totalTermMax: 200,
    convertedMax: 100,
    achievementMax: 15,
  };
}

export function getMarksSheetConfig(standard: string, stream?: string | null, schoolCode?: string | null): MarksSheetConfig {
  const code = (schoolCode || "").trim();

  // School 24261004403 — બાલવાટિકા Primary, Songadh
  if (code === "24261004403" || code === SONGADH_PRIMARY_CODE) {
    const defs = songadhPrimarySubjectsForStandard(standard);
    if (defs) return buildConfig(defs);
  }

  if (["11", "12"].includes(standard) && stream === "Commerce") {
    return buildConfig(COMMERCE_MARKS_SHEET_SUBJECTS);
  }
  if (["11", "12"].includes(standard)) {
    return buildConfig(ARTS_MARKS_SHEET_SUBJECTS);
  }
  return buildConfig(SECONDARY_MARKS_SHEET_SUBJECTS);
}

/** Stored in ExamResult.remarks as JSON */
export type MarksSheetTermData = {
  first?: number | null;
  second?: number | null;
  third?: number | null;
  /** Dynamic exam scores keyed by term key */
  scores?: Record<string, number | null>;
  /** Teacher/internal scores keyed by term key */
  internalScores?: Record<string, number | null>;
  internal?: number | null;
  special?: number | null;
  letterGrade?: string | null;
};

export function parseTermRemarks(remarks?: string | null): MarksSheetTermData {
  if (!remarks) return {};
  try {
    const parsed = JSON.parse(remarks) as MarksSheetTermData;
    return {
      first: parsed.first ?? null,
      second: parsed.second ?? null,
      third: parsed.third ?? null,
      scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
      internalScores:
        parsed.internalScores && typeof parsed.internalScores === "object"
          ? parsed.internalScores
          : {},
      internal: parsed.internal ?? null,
      special: parsed.special ?? null,
      letterGrade: parsed.letterGrade ?? null,
    };
  } catch {
    return {};
  }
}

export function serializeTermRemarks(data: MarksSheetTermData): string {
  return JSON.stringify({
    first: data.first ?? null,
    second: data.second ?? null,
    third: data.third ?? null,
    scores: data.scores || {},
    internalScores: data.internalScores || {},
    internal: data.internal ?? null,
    special: data.special ?? null,
    letterGrade: data.letterGrade ?? null,
  });
}
