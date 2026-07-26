/** GSEB SSC/HSC board result analysis — shared grade & stats logic */

export const GSEB_PASS_PCT = 35;

export const GSEB_GRADES = [
  { grade: "A1", min: 80, max: 100, color: "text-emerald-700", bg: "bg-emerald-100", bar: "bg-emerald-500" },
  { grade: "A2", min: 70, max: 79, color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-400" },
  { grade: "B1", min: 60, max: 69, color: "text-blue-600", bg: "bg-blue-50", bar: "bg-blue-500" },
  { grade: "B2", min: 50, max: 59, color: "text-blue-500", bg: "bg-blue-50", bar: "bg-blue-400" },
  { grade: "C", min: 35, max: 49, color: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500" },
  { grade: "F", min: 0, max: 34, color: "text-red-600", bg: "bg-red-50", bar: "bg-red-500" },
] as const;

export type GsebGradeLabel = (typeof GSEB_GRADES)[number]["grade"];

export interface BoardStudent {
  id: string;
  firstName: string;
  surname: string;
  standard: string;
  section: string;
  rollNumber: string | null;
  grNumber: string | null;
  board10th: string;
  percentage10th: number;
  year10th: string;
  board12th: string | null;
  percentage12th: number | null;
  year12th: string | null;
  marksheet10Path: string | null;
  marksheet12Path: string | null;
  childUid: string | null;
  aadhaarNumber: string;
  sscSeatPrefix: string | null;
  sscSeatNumber: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
  gsebFetchedAt: string | null;
  gsebResultJson: string | null;
}

export interface StudentWithMeta extends BoardStudent {
  rank: number;
  grade: GsebGradeLabel | "—";
  gradeColor: string;
  gradeBg: string;
  resultStatus: "pass" | "fail" | "pending";
  boardSeatNo: string;
  displayPct: number | null;
}

export interface DivisionAnalysis {
  section: string;
  label: string;
  students: StudentWithMeta[];
  total: number;
  withResult: number;
  pending: number;
  passCount: number;
  failCount: number;
  passRate: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  topper: { name: string; pct: number } | null;
  gradeCounts: Record<GsebGradeLabel, number>;
}

export interface SchoolBoardAnalysis {
  standard: "10" | "12";
  title: string;
  total: number;
  withResult: number;
  pending: number;
  passCount: number;
  failCount: number;
  passRate: number;
  average: number | null;
  highest: number | null;
  gradeCounts: Record<GsebGradeLabel, number>;
  divisions: DivisionAnalysis[];
  toppers: { name: string; pct: number; section: string; rank: number }[];
}

export function gsebGrade(pct: number | null | undefined): {
  label: GsebGradeLabel | "—";
  color: string;
  bg: string;
  bar: string;
} {
  if (pct == null || pct <= 0) return { label: "—", color: "text-slate-400", bg: "bg-slate-50", bar: "bg-slate-300" };
  for (const g of GSEB_GRADES) {
    if (pct >= g.min && (g.grade === "A1" || pct <= g.max)) return { label: g.grade, color: g.color, bg: g.bg, bar: g.bar };
  }
  return { label: "F", color: "text-red-600", bg: "bg-red-50", bar: "bg-red-500" };
}

export function resultStatus(pct: number | null | undefined): "pass" | "fail" | "pending" {
  if (pct == null || pct <= 0) return "pending";
  return pct >= GSEB_PASS_PCT ? "pass" : "fail";
}

/** True only when saved JSON looks like a real GSEB marksheet (not invented %). */
export function parseVerifiedGsebPercentage(gsebResultJson: string | null | undefined): number | null {
  if (!gsebResultJson) return null;
  try {
    const j = JSON.parse(gsebResultJson) as {
      percentage?: number | null;
      rankScore?: number | null;
      studentName?: string | null;
      result?: string | null;
      subjects?: Record<string, number | null>;
    };
    const pct = j.percentage ?? j.rankScore ?? null;
    if (pct == null || !Number.isFinite(pct) || pct <= 0 || pct > 100) return null;

    const name = String(j.studentName || "").replace(/\s+/g, "");
    const subHits = Object.values(j.subjects || {}).filter((v) => v != null).length;
    const hasResult = !!(j.result && /pass|fail|પાસ|નાપાસ|atkt/i.test(String(j.result)));

    // Old buggy saves often had only a percentage with no name/subjects
    if (name.length < 3 && subHits < 3) return null;
    if (name.length < 3 && !hasResult && subHits < 3) return null;

    return Math.round(pct * 100) / 100;
  } catch {
    return null;
  }
}

/** Official GSEB seat only — never fall back to GR / UID / roll (those caused false fetches). */
export function boardSeatNo(s: BoardStudent, standard: "10" | "12" = "10"): string {
  const prefix = standard === "12" ? s.hscSeatPrefix : s.sscSeatPrefix;
  const number = standard === "12" ? s.hscSeatNumber : s.sscSeatNumber;
  const digits = (number || "").replace(/\D/g, "");
  const need = standard === "12" ? 6 : 7;
  if (digits.length === need) {
    const p = (prefix || (standard === "12" ? "B" : "A")).trim().toUpperCase() || (standard === "12" ? "B" : "A");
    return `${p}${digits}`;
  }
  return "—";
}

/** Display helper — prefers GSEB seat, then GR for identification only (not for GSEB fetch). */
export function boardSeatNoOrGr(s: BoardStudent, standard: "10" | "12" = "10"): string {
  const seat = boardSeatNo(s, standard);
  if (seat !== "—") return seat;
  if (s.grNumber?.trim()) return s.grNumber.trim();
  return s.rollNumber?.trim() || "—";
}

function getPct(s: BoardStudent, standard: "10" | "12"): number | null {
  // No official GSEB seat → never show Pass / % in board results
  const seat = boardSeatNo(s, standard);
  if (!seat || seat === "—") return null;

  // Prefer verified GSEB JSON. If a GSEB fetch was recorded but JSON is junk → pending.
  if (s.gsebFetchedAt || s.gsebResultJson) {
    const verified = parseVerifiedGsebPercentage(s.gsebResultJson);
    if (verified != null) return verified;
    // Stale/fake GSEB save — do not fall back to percentage10th
    if (s.gsebFetchedAt) return null;
  }

  // Manual % only when seat exists and no failed/stale GSEB fetch
  if (standard === "10") return s.percentage10th > 0 ? s.percentage10th : null;
  return s.percentage12th && s.percentage12th > 0 ? s.percentage12th : null;
}

function emptyGradeCounts(): Record<GsebGradeLabel, number> {
  return { A1: 0, A2: 0, B1: 0, B2: 0, C: 0, F: 0 };
}

function enrichStudent(s: BoardStudent, rank: number, standard: "10" | "12"): StudentWithMeta {
  const displayPct = getPct(s, standard);
  const g = gsebGrade(displayPct);
  return {
    ...s,
    rank,
    grade: g.label,
    gradeColor: g.color,
    gradeBg: g.bg,
    resultStatus: resultStatus(displayPct),
    boardSeatNo: boardSeatNo(s, standard),
    displayPct,
  };
}

function analyzeDivisionGroup(
  section: string,
  list: BoardStudent[],
  standard: "10" | "12"
): DivisionAnalysis {
  const sorted = [...list].sort((a, b) => {
    const pa = getPct(a, standard) ?? -1;
    const pb = getPct(b, standard) ?? -1;
    if (pb !== pa) return pb - pa;
    return Number(a.rollNumber || 0) - Number(b.rollNumber || 0);
  });

  const students = sorted.map((s, i) => enrichStudent(s, i + 1, standard));
  const withResult = students.filter((s) => s.displayPct != null);
  const passCount = students.filter((s) => s.resultStatus === "pass").length;
  const failCount = students.filter((s) => s.resultStatus === "fail").length;
  const pcts = withResult.map((s) => s.displayPct!);
  const gradeCounts = emptyGradeCounts();
  for (const s of withResult) {
    if (s.grade !== "—") gradeCounts[s.grade]++;
  }

  const topper = withResult.length
    ? { name: `${withResult[0].firstName} ${withResult[0].surname}`, pct: withResult[0].displayPct! }
    : null;

  return {
    section,
    label: section ? `Division ${section}` : "Unassigned",
    students,
    total: students.length,
    withResult: withResult.length,
    pending: students.length - withResult.length,
    passCount,
    failCount,
    passRate: withResult.length ? Math.round((passCount / withResult.length) * 100) : 0,
    average: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : null,
    highest: pcts.length ? Math.max(...pcts) : null,
    lowest: pcts.length ? Math.min(...pcts) : null,
    topper,
    gradeCounts,
  };
}

export function analyzeBoardStudents(
  students: BoardStudent[],
  standard: "10" | "12"
): SchoolBoardAnalysis {
  const filtered = students.filter((s) => s.standard === standard);
  const sectionMap = new Map<string, BoardStudent[]>();

  for (const s of filtered) {
    const sec = (s.section || "").trim().toUpperCase() || "_";
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec)!.push(s);
  }

  const sectionOrder = ["A", "B", "C", "D", "E", "F", "_"];
  const sections = [...sectionMap.keys()].sort((a, b) => {
    const ia = sectionOrder.indexOf(a);
    const ib = sectionOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const divisions = sections.map((sec) =>
    analyzeDivisionGroup(sec === "_" ? "" : sec, sectionMap.get(sec)!, standard)
  );

  const allEnriched = divisions.flatMap((d) => d.students);
  const withResult = allEnriched.filter((s) => s.displayPct != null);
  const passCount = allEnriched.filter((s) => s.resultStatus === "pass").length;
  const failCount = allEnriched.filter((s) => s.resultStatus === "fail").length;
  const pcts = withResult.map((s) => s.displayPct!);

  const gradeCounts = emptyGradeCounts();
  for (const s of withResult) {
    if (s.grade !== "—") gradeCounts[s.grade]++;
  }

  const schoolToppers = [...withResult]
    .sort((a, b) => (b.displayPct ?? 0) - (a.displayPct ?? 0))
    .slice(0, 5)
    .map((s, i) => ({
      name: `${s.firstName} ${s.surname}`,
      pct: s.displayPct!,
      section: s.section || "—",
      rank: i + 1,
    }));

  return {
    standard,
    title: standard === "10" ? "SSC (Class 10)" : "HSC (Class 12)",
    total: filtered.length,
    withResult: withResult.length,
    pending: filtered.length - withResult.length,
    passCount,
    failCount,
    passRate: withResult.length ? Math.round((passCount / withResult.length) * 100) : 0,
    average: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : null,
    highest: pcts.length ? Math.max(...pcts) : null,
    gradeCounts,
    divisions,
    toppers: schoolToppers,
  };
}

export function formatBoardNo(no: string): string {
  if (!no || no === "—") return "—";
  const digits = no.replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 6)} ${digits.slice(6, 12)} ${digits.slice(12)}`;
  }
  return no;
}
