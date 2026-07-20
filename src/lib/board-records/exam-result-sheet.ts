/** Official GSHSEB Education Board Exam Result Sheet — paper ledger format */

import { gsebGrade, resultStatus } from "./gseb";
import { parseBoardResultJson, type BoardResultListJson } from "./result-list-config";

export const EXAM_RESULT_SHEET_PER_PAGE = 8;

export type ExamResultSubjectCol = {
  /** Internal key (matches GSEB / result-list codes) */
  key: string;
  /** Printed board subject code e.g. 01, 10 */
  boardCode: string;
  labelEn: string;
  labelGu: string;
  /** Alternate keys to read marks from (e.g. SAN | HIN) */
  altKeys?: string[];
};

/** SSC columns in ledger order (photo) */
export const SSC_EXAM_SHEET_SUBJECTS: ExamResultSubjectCol[] = [
  { key: "GUJ", boardCode: "01", labelEn: "Gujarati", labelGu: "ગુજરાતી" },
  { key: "SS", boardCode: "10", labelEn: "Social Science", labelGu: "સો. સાયન્સ" },
  { key: "SCI", boardCode: "11", labelEn: "Sci. & Tech.", labelGu: "વિ. અને ટેક્." },
  { key: "MATH", boardCode: "12", labelEn: "Maths", labelGu: "ગણિત" },
  { key: "ENG", boardCode: "16", labelEn: "English", labelGu: "અંગ્રેજી" },
  {
    key: "SAN",
    boardCode: "",
    labelEn: "Sanskrit / Hindi",
    labelGu: "સંસ્કૃત / હિન્દી",
    altKeys: ["HIN"],
  },
  { key: "EL1", boardCode: "", labelEn: "", labelGu: "" },
  { key: "EL2", boardCode: "", labelEn: "", labelGu: "" },
  { key: "EL3", boardCode: "", labelEn: "", labelGu: "" },
];

export const HSC_COMMERCE_SHEET_SUBJECTS: ExamResultSubjectCol[] = [
  { key: "GUJ", boardCode: "", labelEn: "Gujarati", labelGu: "ગુજરાતી" },
  { key: "ENG", boardCode: "", labelEn: "English", labelGu: "અંગ્રેજી" },
  { key: "ECO", boardCode: "", labelEn: "Economics", labelGu: "અર્થશાસ્ત્ર" },
  { key: "BOM", boardCode: "", labelEn: "B.O.M.", labelGu: "વા.વ્ય." },
  { key: "STAT", boardCode: "", labelEn: "Statistics", labelGu: "આંકડા" },
  { key: "ACC", boardCode: "", labelEn: "Accountancy", labelGu: "નામું" },
  { key: "SP", boardCode: "", labelEn: "S.P.", labelGu: "એસ.પી." },
  { key: "EL1", boardCode: "", labelEn: "", labelGu: "" },
];

export const HSC_ARTS_SHEET_SUBJECTS: ExamResultSubjectCol[] = [
  { key: "GUJ", boardCode: "", labelEn: "Gujarati", labelGu: "ગુજરાતી" },
  { key: "ENG", boardCode: "", labelEn: "English", labelGu: "અંગ્રેજી" },
  { key: "HIN", boardCode: "", labelEn: "Hindi", labelGu: "હિન્દી" },
  { key: "HIS", boardCode: "", labelEn: "History", labelGu: "ઇતિહાસ" },
  { key: "GEO", boardCode: "", labelEn: "Geography", labelGu: "ભૂગોળ" },
  { key: "ECO", boardCode: "", labelEn: "Economics", labelGu: "અર્થ." },
  { key: "PSY", boardCode: "", labelEn: "Psychology", labelGu: "મનો." },
  { key: "EL1", boardCode: "", labelEn: "", labelGu: "" },
];

export type SubjectMarksDetail = {
  board: number | null;
  school: number | null;
  total: number | null;
  grade: string | null;
};

export type ExamResultSheetRow = {
  id: string;
  isEmpty: boolean;
  serial: number;
  surname: string;
  firstName: string;
  fatherName: string;
  address: string;
  mobile: string;
  /** SID digits for boxed grid (up to 11) */
  sidDigits: string;
  grNumber: string;
  dateOfBirth: string;
  examCenter: string;
  seatDisplay: string;
  seatPrefix: string;
  seatNumber: string;
  subjects: Record<string, SubjectMarksDetail>;
  totalMarks: number | null;
  resultAndPct: string;
  percentile: number | null;
  gradeRank: string;
};

export type ExamResultSheetMeta = {
  academicYear: string;
  session: "March" | "July";
  standard: "10" | "12";
  stream?: string | null;
  section: string;
  className: string;
  examCenter: string;
  boardPct: string;
  centerPct: string;
  schoolPct: string;
  schoolGrade: string;
};

export type ExamResultSheetStudent = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  fatherName?: string | null;
  grNumber?: string | null;
  dateOfBirth: string;
  mobileNumber?: string | null;
  currentAddress?: string | null;
  currentCity?: string | null;
  currentDistrict?: string | null;
  currentPincode?: string | null;
  childUid?: string | null;
  rollNumber?: string | null;
  percentage10th: number | null;
  percentage12th?: number | null;
  sscSeatPrefix?: string | null;
  sscSeatNumber?: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
  gsebResultJson?: string | null;
};

export function getExamSheetSubjects(standard: string, stream?: string | null): ExamResultSubjectCol[] {
  if (standard === "12") {
    return stream === "Commerce" ? HSC_COMMERCE_SHEET_SUBJECTS : HSC_ARTS_SHEET_SUBJECTS;
  }
  return SSC_EXAM_SHEET_SUBJECTS;
}

function formatDob(dob: string): string {
  if (!dob) return "";
  const m = dob.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return dob;
}

function seatParts(s: ExamResultSheetStudent, standard: "10" | "12") {
  const prefix = standard === "12" ? s.hscSeatPrefix || "" : s.sscSeatPrefix || "";
  const number = standard === "12" ? s.hscSeatNumber || "" : s.sscSeatNumber || "";
  const display = prefix && number ? `${prefix} ${number}` : number || prefix || "";
  return { prefix, number, display };
}

function formatAddress(s: ExamResultSheetStudent): string {
  const parts = [
    s.currentAddress?.trim(),
    s.currentCity?.trim(),
    s.currentDistrict?.trim(),
    s.currentPincode?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

function sidDigits(s: ExamResultSheetStudent): string {
  const raw = (s.childUid || s.rollNumber || "").replace(/\D/g, "");
  return raw.slice(0, 11);
}

function subjectGrade(total: number | null): string {
  if (total == null || total < 0) return "";
  const info = gsebGrade(total);
  return info.label !== "—" ? info.label : "";
}

function resolveSubjectDetail(
  key: string,
  altKeys: string[] | undefined,
  meta: BoardResultListJson,
): SubjectMarksDetail {
  const detailMap = meta.subjectsDetail || {};
  const keys = [key, ...(altKeys || [])];
  let detail: Partial<SubjectMarksDetail> | undefined;
  for (const k of keys) {
    if (detailMap[k]) {
      detail = detailMap[k];
      break;
    }
  }

  let total: number | null = detail?.total ?? null;
  if (total == null) {
    for (const k of keys) {
      const v = meta.subjects?.[k];
      if (v != null && !Number.isNaN(Number(v))) {
        total = Number(v);
        break;
      }
    }
  }

  const board = detail?.board ?? null;
  const school = detail?.school ?? null;
  if (board != null && school != null) {
    total = board + school;
  }

  const grade = detail?.grade || subjectGrade(total);
  return { board, school, total, grade };
}

function emptySubjects(cols: ExamResultSubjectCol[]): Record<string, SubjectMarksDetail> {
  const out: Record<string, SubjectMarksDetail> = {};
  for (const c of cols) {
    out[c.key] = { board: null, school: null, total: null, grade: null };
  }
  return out;
}

export function buildExamResultSheetRow(
  s: ExamResultSheetStudent,
  serial: number,
  standard: "10" | "12",
  cols: ExamResultSubjectCol[],
  examCenter: string,
): ExamResultSheetRow {
  const meta = parseBoardResultJson(s.gsebResultJson);
  const seat = seatParts(s, standard);
  const subjects: Record<string, SubjectMarksDetail> = {};
  let sum = 0;
  let counted = 0;
  for (const c of cols) {
    const d = resolveSubjectDetail(c.key, c.altKeys, meta);
    subjects[c.key] = d;
    if (d.total != null) {
      sum += d.total;
      counted += 1;
    }
  }

  const pct =
    standard === "10"
      ? s.percentage10th != null && s.percentage10th > 0
        ? s.percentage10th
        : meta.percentage ?? null
      : s.percentage12th != null && s.percentage12th > 0
        ? s.percentage12th
        : meta.percentage ?? null;

  const totalMarks = meta.totalMarks ?? (counted ? sum : null);
  const gradeInfo = gsebGrade(pct);
  const status = resultStatus(pct);
  const result =
    meta.result ||
    (status === "pass" ? "પાસ" : status === "fail" ? "નાપાસ" : "");
  const resultAndPct =
    pct != null
      ? `${result}${result ? " / " : ""}${Number(pct).toFixed(2)}%`
      : result;

  return {
    id: s.id,
    isEmpty: false,
    serial,
    surname: s.surname || "",
    firstName: s.firstName || "",
    fatherName: s.fatherName || s.middleName || "",
    address: formatAddress(s),
    mobile: s.mobileNumber || "",
    sidDigits: sidDigits(s),
    grNumber: s.grNumber || "",
    dateOfBirth: formatDob(s.dateOfBirth),
    examCenter: examCenter || "",
    seatDisplay: seat.display,
    seatPrefix: seat.prefix,
    seatNumber: seat.number,
    subjects,
    totalMarks,
    resultAndPct,
    percentile: meta.percentile ?? null,
    gradeRank: meta.grade || (gradeInfo.label !== "—" ? gradeInfo.label : ""),
  };
}

export function emptyExamResultSheetRow(
  serial: number,
  cols: ExamResultSubjectCol[],
): ExamResultSheetRow {
  return {
    id: `empty-${serial}`,
    isEmpty: true,
    serial,
    surname: "",
    firstName: "",
    fatherName: "",
    address: "",
    mobile: "",
    sidDigits: "",
    grNumber: "",
    dateOfBirth: "",
    examCenter: "",
    seatDisplay: "",
    seatPrefix: "",
    seatNumber: "",
    subjects: emptySubjects(cols),
    totalMarks: null,
    resultAndPct: "",
    percentile: null,
    gradeRank: "",
  };
}

export function padExamResultSheetRows(
  rows: ExamResultSheetRow[],
  cols: ExamResultSubjectCol[],
): ExamResultSheetRow[] {
  const out = [...rows];
  const target = Math.max(
    EXAM_RESULT_SHEET_PER_PAGE,
    Math.ceil(Math.max(rows.length, 1) / EXAM_RESULT_SHEET_PER_PAGE) * EXAM_RESULT_SHEET_PER_PAGE,
  );
  while (out.length < target) {
    out.push(emptyExamResultSheetRow(out.length + 1, cols));
  }
  return out;
}

export function chunkExamResultSheetPages(
  rows: ExamResultSheetRow[],
  cols: ExamResultSubjectCol[],
): ExamResultSheetRow[][] {
  const padded = padExamResultSheetRows(rows, cols);
  const pages: ExamResultSheetRow[][] = [];
  for (let i = 0; i < padded.length; i += EXAM_RESULT_SHEET_PER_PAGE) {
    pages.push(padded.slice(i, i + EXAM_RESULT_SHEET_PER_PAGE));
  }
  return pages;
}

/** Year display: 2025-26 → 25 - 26 */
export function yearShortPair(academicYear: string): { a: string; b: string } {
  const m = academicYear.match(/(\d{2,4})\s*[-–]\s*(\d{2,4})/);
  if (!m) return { a: "__", b: "__" };
  const a = m[1].length === 4 ? m[1].slice(2) : m[1];
  const b = m[2].length === 4 ? m[2].slice(2) : m[2];
  return { a, b };
}
