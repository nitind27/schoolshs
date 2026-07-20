/** Marks register layout — matches official Gujarati class marks sheet */

export type MarksSheetSubjectType = "numeric" | "grade";

export type MarksSheetSubjectDef = {
  name: string;
  shortName: string;
  type: MarksSheetSubjectType;
  code: string;
};

export type MarksSheetExamRowDef = {
  key: string;
  label: string;
  maxMarks: number | null;
  kind: "max" | "first" | "second" | "internal" | "annual" | "total" | "converted" | "achievement" | "special" | "grace" | "final";
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

function buildConfig(subjects: MarksSheetSubjectDef[]): MarksSheetConfig {
  return {
    subjects,
    examRows: EXAM_ROWS,
    totalTermMax: 200,
    convertedMax: 100,
    achievementMax: 15,
  };
}

export function getMarksSheetConfig(standard: string, stream?: string | null): MarksSheetConfig {
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
    internal: data.internal ?? null,
    special: data.special ?? null,
    letterGrade: data.letterGrade ?? null,
  });
}
