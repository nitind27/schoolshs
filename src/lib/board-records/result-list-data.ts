import { gsebGrade, resultStatus } from "./gseb";
import type { BoardResultListConfig } from "./result-list-config";
import { parseBoardResultJson } from "./result-list-config";

export type BoardResultListRow = {
  id: string;
  isEmpty: boolean;
  serial: number;
  grNumber: string;
  dateOfBirth: string;
  caste: string;
  surname: string;
  firstName: string;
  fatherName: string;
  seatPrefix: string;
  seatNumber: string;
  seatDisplay: string;
  subjects: Record<string, number | null>;
  totalMarks: number | null;
  rankScore: number | null;
  grade: string;
  percentage: number | null;
  result: string;
};

type StudentRaw = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  fatherName?: string | null;
  grNumber?: string | null;
  dateOfBirth: string;
  caste?: string | null;
  category?: string | null;
  rollNumber?: string | null;
  standard: string | null;
  percentage10th: number | null;
  percentage12th?: number | null;
  sscSeatPrefix?: string | null;
  sscSeatNumber?: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
  gsebResultJson?: string | null;
};

function formatDob(dob: string): string {
  if (!dob) return "";
  const m = dob.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return dob;
}

function seatParts(s: StudentRaw, standard: "10" | "12") {
  const prefix = standard === "12" ? s.hscSeatPrefix || "" : s.sscSeatPrefix || "";
  const number = standard === "12" ? s.hscSeatNumber || "" : s.sscSeatNumber || "";
  const display = prefix && number ? `${prefix} ${number}` : number || prefix || "";
  return { prefix, number, display };
}

function casteLabel(s: StudentRaw): string {
  const c = (s.caste || s.category || "").trim().toUpperCase();
  if (!c) return "";
  if (c.includes("ST") || c.includes("અનુ")) return "S.T.";
  if (c.includes("SC") || c.includes("અ.જા")) return "S.C.";
  if (c.includes("OBC") || c.includes("બી.પી")) return "BAXI";
  if (c.includes("OPEN") || c.includes("GEN")) return "OPEN";
  return c.length <= 6 ? c : c.slice(0, 6);
}

function sumSubjects(subjects: Record<string, number | null>): number | null {
  const vals = Object.values(subjects).filter((v) => v != null && !Number.isNaN(v)) as number[];
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}

export function buildBoardResultListRow(
  s: StudentRaw,
  serial: number,
  config: BoardResultListConfig,
): BoardResultListRow {
  const meta = parseBoardResultJson(s.gsebResultJson);
  const pct =
    config.standard === "10"
      ? s.percentage10th != null && s.percentage10th > 0
        ? s.percentage10th
        : null
      : s.percentage12th != null && s.percentage12th > 0
        ? s.percentage12th
        : null;
  const gradeInfo = gsebGrade(pct);
  const status = resultStatus(pct);
  const seat = seatParts(s, config.standard);
  const subjects: Record<string, number | null> = {};
  for (const sub of config.subjects) {
    subjects[sub.code] = meta.subjects?.[sub.code] ?? null;
  }
  const totalMarks = meta.totalMarks ?? sumSubjects(subjects);
  const rankScore = meta.rankScore ?? pct;

  return {
    id: s.id,
    isEmpty: false,
    serial,
    grNumber: s.grNumber || "",
    dateOfBirth: formatDob(s.dateOfBirth),
    caste: casteLabel(s),
    surname: s.surname || "",
    firstName: s.firstName || "",
    fatherName: s.fatherName || s.middleName || "",
    seatPrefix: seat.prefix,
    seatNumber: seat.number,
    seatDisplay: seat.display,
    subjects,
    totalMarks,
    rankScore,
    grade: meta.grade || (gradeInfo.label !== "—" ? gradeInfo.label : ""),
    percentage: pct,
    result:
      meta.result ||
      (status === "pass" ? "પાસ" : status === "fail" ? "નાપાસ" : ""),
  };
}

export function emptyBoardResultListRow(serial: number, config: BoardResultListConfig): BoardResultListRow {
  const subjects: Record<string, number | null> = {};
  for (const sub of config.subjects) subjects[sub.code] = null;
  return {
    id: `empty-${serial}`,
    isEmpty: true,
    serial,
    grNumber: "",
    dateOfBirth: "",
    caste: "",
    surname: "",
    firstName: "",
    fatherName: "",
    seatPrefix: "",
    seatNumber: "",
    seatDisplay: "",
    subjects,
    totalMarks: null,
    rankScore: null,
    grade: "",
    percentage: null,
    result: "",
  };
}

export function padBoardResultListRows(
  rows: BoardResultListRow[],
  config: BoardResultListConfig,
): BoardResultListRow[] {
  const out = [...rows];
  while (out.length < config.minRows) {
    out.push(emptyBoardResultListRow(out.length + 1, config));
  }
  return out;
}

export function recomputeBoardRow(
  row: BoardResultListRow,
  config: BoardResultListConfig,
): BoardResultListRow {
  const totalMarks = sumSubjects(row.subjects) ?? row.totalMarks;
  const pct = row.percentage;
  const gradeInfo = gsebGrade(pct);
  const status = resultStatus(pct);
  return {
    ...row,
    totalMarks,
    rankScore: row.rankScore ?? pct,
    grade: gradeInfo.label !== "—" ? gradeInfo.label : "",
    result:
      row.result ||
      (status === "pass" ? "પાસ" : status === "fail" ? "નાપાસ" : ""),
  };
}
