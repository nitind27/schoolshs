/** Songadh Primary (24261004403 / 24261004404) — પ્રગતિપત્રક */

export const PRAGATI_PATRAK_SCHOOL_CODES = ["24261004403", "24261004404"] as const;

export function isPragatiPatrakSchool(
  code?: string | null,
  udiseCode?: string | null,
): boolean {
  const c = (code || "").trim();
  const u = (udiseCode || "").trim();
  return (
    PRAGATI_PATRAK_SCHOOL_CODES.includes(c as (typeof PRAGATI_PATRAK_SCHOOL_CODES)[number]) ||
    PRAGATI_PATRAK_SCHOOL_CODES.includes(u as (typeof PRAGATI_PATRAK_SCHOOL_CODES)[number])
  );
}

/** પ્રગતિપત્રક result — primary ધોરણ 1–8 (403/404) */
export const PRAGATI_RESULT_STANDARDS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function isPragatiResultStandard(standard?: string | null): boolean {
  const s = String(standard || "").trim().replace(/^0+/, "") || "";
  return PRAGATI_RESULT_STANDARDS.includes(
    s as (typeof PRAGATI_RESULT_STANDARDS)[number],
  );
}

export function shouldUsePragatiPatrakResult(
  schoolCode?: string | null,
  udiseCode?: string | null,
  standard?: string | null,
): boolean {
  return isPragatiPatrakSchool(schoolCode, udiseCode) && isPragatiResultStandard(standard);
}

export type PragatiSubjectDef = {
  key: string;
  name: string;
  /** Match exam subject names (en/gu, short forms) */
  aliases: string[];
  /** null = not applicable that semester (show —) */
  sem1Max: number | null;
  sem2Max: number | null;
};

/** Exact subject rows from official Songadh Primary progress report */
export const PRAGATI_PATRAK_SUBJECTS: PragatiSubjectDef[] = [
  {
    key: "guj",
    name: "ગુજરાતી",
    aliases: ["gujarati", "ગુજરાતી", "guj"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "hin",
    name: "હિન્દી",
    aliases: ["hindi", "હિન્દી", "हिंदी", "hin"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "eng",
    name: "અંગ્રેજી",
    aliases: ["english", "અંગ્રેજી", "eng"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "ss",
    name: "સા.વિજ્ઞાન/પર્યાવરણ",
    aliases: [
      "social",
      "social science",
      "સામાજિક વિજ્ઞાન",
      "સા.વિજ્ઞાન",
      "પર્યાવરણ",
      "environment",
      "ss",
    ],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "math",
    name: "ગણિત",
    aliases: ["math", "maths", "mathematics", "ગણિત"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "sci",
    name: "વિજ્ઞાન",
    aliases: ["science", "વિજ્ઞાન", "sci"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "art",
    name: "ચિત્રકામ",
    aliases: ["drawing", "art", "ચિત્રકામ", "चित्र"],
    sem1Max: null,
    sem2Max: 100,
  },
  {
    key: "san",
    name: "સંસ્કૃત",
    aliases: ["sanskrit", "સંસ્કૃત", "san"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "comp",
    name: "કોમ્પ્યુટર",
    aliases: ["computer", "કોમ્પ્યુટર", "comp", "ict"],
    sem1Max: 100,
    sem2Max: 100,
  },
  {
    key: "pe",
    name: "શારીરિક શિક્ષણ",
    aliases: [
      "physical",
      "pe",
      "શારીરિક",
      "શા. શિક્ષણ",
      "સ્વા.અને શા.શિક્ષણ",
      "health",
    ],
    sem1Max: null,
    sem2Max: 100,
  },
  {
    key: "gk",
    name: "સામાન્ય જ્ઞાન",
    aliases: ["gk", "general knowledge", "સામાન્ય જ્ઞાન"],
    sem1Max: null,
    sem2Max: null,
  },
];

/** Official grade key printed on the card */
export const PRAGATI_GRADE_BANDS = [
  { grade: "A", min: 80, label: "૮૦% કે તેથી વધુ" },
  { grade: "B", min: 65, label: "૬૫% થી ૭૯%" },
  { grade: "C", min: 50, label: "૫૦% થી ૬૪%" },
  { grade: "D", min: 35, label: "૩૫% થી ૪૯%" },
  { grade: "E", min: 0, label: "૩૫% થી ઓછા" },
] as const;

export const PRAGATI_PASS_PERCENTAGE = 35;

export type PragatiSubjectInput = {
  name: string;
  maxMarks?: number | null;
  first?: number | null;
  second?: number | null;
  /** Fallback when term marks missing */
  obtained?: number | null;
  letterGrade?: string | null;
};

export type PragatiSubjectRow = {
  key: string;
  name: string;
  sem1Max: number | null;
  sem2Max: number | null;
  annualMax: number | null;
  sem1Obtained: number | null;
  sem2Obtained: number | null;
  annualObtained: number | null;
  sem1Grade: string;
  sem2Grade: string;
  annualGrade: string;
};

export type PragatiColumnTotals = {
  obtained: number;
  max: number;
  percentage: number | null;
  grade: string;
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.\s_/·\-–—]+/g, "")
    .trim();
}

export function matchPragatiSubject(
  subjectName: string,
): PragatiSubjectDef | null {
  const n = norm(subjectName);
  if (!n) return null;
  for (const def of PRAGATI_PATRAK_SUBJECTS) {
    if (norm(def.name) === n) return def;
    for (const a of def.aliases) {
      const an = norm(a);
      if (!an) continue;
      if (n === an || n.includes(an) || an.includes(n)) return def;
    }
  }
  return null;
}

export function pragatiGradeFromPercent(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "";
  if (pct >= 80) return "A";
  if (pct >= 65) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "E";
}

export function pragatiPercent(
  obtained: number | null,
  max: number | null,
): number | null {
  if (obtained == null || max == null || max <= 0) return null;
  return Math.round((obtained / max) * 10000) / 100;
}

function cleanMark(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

/**
 * Build display rows from official Songadh template order only.
 * Extra exam subjects are ignored so the printed card stays 11 fixed rows.
 */
export function buildPragatiSubjectRows(
  inputs: PragatiSubjectInput[],
): PragatiSubjectRow[] {
  const used = new Set<number>();
  const rows: PragatiSubjectRow[] = [];

  const pickInput = (def: PragatiSubjectDef): PragatiSubjectInput | null => {
    for (let i = 0; i < inputs.length; i++) {
      if (used.has(i)) continue;
      const matched = matchPragatiSubject(inputs[i].name);
      if (matched?.key === def.key) {
        used.add(i);
        return inputs[i];
      }
    }
    return null;
  };

  for (const def of PRAGATI_PATRAK_SUBJECTS) {
    const input = pickInput(def);
    rows.push(computeSubjectRow(def, input));
  }

  return rows;
}

function computeSubjectRow(
  def: PragatiSubjectDef,
  input: PragatiSubjectInput | null,
): PragatiSubjectRow {
  const sem1Max = def.sem1Max;
  const sem2Max = def.sem2Max;
  const annualMax =
    sem1Max == null && sem2Max == null
      ? null
      : (sem1Max || 0) + (sem2Max || 0);

  let sem1 = cleanMark(input?.first);
  let sem2 = cleanMark(input?.second);
  const fallback = cleanMark(input?.obtained);

  // If only annual/total stored, put it in year-end; leave terms empty
  let annual: number | null = null;
  if (sem1 != null || sem2 != null) {
    annual = (sem1 || 0) + (sem2 || 0);
    // If one term N/A, don't add zero for missing — only sum present applicable terms
    if (sem1Max == null) annual = sem2;
    else if (sem2Max == null) annual = sem1;
    else if (sem1 == null && sem2 != null) annual = sem2;
    else if (sem2 == null && sem1 != null) annual = sem1;
  } else if (fallback != null) {
    annual = fallback;
  }

  // Clamp marks that don't apply
  if (sem1Max == null) sem1 = null;
  if (sem2Max == null) sem2 = null;

  const g1 = pragatiGradeFromPercent(pragatiPercent(sem1, sem1Max));
  const g2 = pragatiGradeFromPercent(pragatiPercent(sem2, sem2Max));
  const gA = input?.letterGrade?.trim()
    || pragatiGradeFromPercent(pragatiPercent(annual, annualMax));

  return {
    key: def.key,
    name: def.name,
    sem1Max,
    sem2Max,
    annualMax,
    sem1Obtained: sem1,
    sem2Obtained: sem2,
    annualObtained: annual,
    sem1Grade: g1,
    sem2Grade: g2,
    annualGrade: gA,
  };
}

export function sumPragatiColumn(
  rows: PragatiSubjectRow[],
  which: "sem1" | "sem2" | "annual",
): PragatiColumnTotals {
  let obtained = 0;
  let max = 0;
  let has = false;

  for (const r of rows) {
    if (which === "sem1") {
      if (r.sem1Max == null) continue;
      max += r.sem1Max;
      if (r.sem1Obtained != null) {
        obtained += r.sem1Obtained;
        has = true;
      }
    } else if (which === "sem2") {
      if (r.sem2Max == null) continue;
      max += r.sem2Max;
      if (r.sem2Obtained != null) {
        obtained += r.sem2Obtained;
        has = true;
      }
    } else {
      if (r.annualMax == null) continue;
      max += r.annualMax;
      if (r.annualObtained != null) {
        obtained += r.annualObtained;
        has = true;
      }
    }
  }

  const percentage = has && max > 0 ? pragatiPercent(obtained, max) : null;
  return {
    obtained: has ? obtained : 0,
    max,
    percentage,
    grade: pragatiGradeFromPercent(percentage),
  };
}

export function pragatiResultLabel(percentage: number | null): string {
  if (percentage == null) return "";
  return percentage >= PRAGATI_PASS_PERCENTAGE ? "પાસ" : "નાપાસ";
}

export const PRAGATI_SCHOOL_BRAND = {
  trustGu: "શ્રી સાર્વજનિક એજ્યુકેશન મંડળ સંચાલિત",
  nameGu: "શ્રી સાર્વજનિક હાઈસ્કુલ ફોર્ટ-સોનગઢ",
  sectionGu: "પ્રાથમિક વિભાગ - સોનગઢ",
  logoPath: "/shs/logo.png",
} as const;
