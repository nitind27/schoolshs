/**
 * Songadh Primary exam report (24261004403 / 24261004404)
 * Matches physical register: subject grid + student semester block.
 */

import {
  buildPragatiSubjectRows,
  isPragatiPatrakSchool,
  matchPragatiSubject,
  pragatiGradeFromPercent,
  pragatiPercent,
  sumPragatiColumn,
  type PragatiSubjectInput,
} from "@/lib/results/pragati-patrak";

export { isPragatiPatrakSchool, PRAGATI_PATRAK_SCHOOL_CODES } from "@/lib/results/pragati-patrak";

/** Internal exam report (register) — separate from પ્રગતિપત્રક result */
export const PRIMARY_EXAM_REPORT_STANDARDS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function isPrimaryExamReportStandard(standard?: string | null): boolean {
  const s = String(standard || "").trim().replace(/^0+/, "") || "";
  return PRIMARY_EXAM_REPORT_STANDARDS.includes(
    s as (typeof PRIMARY_EXAM_REPORT_STANDARDS)[number],
  );
}

export function shouldUsePrimaryExamReport(
  schoolCode?: string | null,
  udiseCode?: string | null,
  standard?: string | null,
): boolean {
  return (
    isPragatiPatrakSchool(schoolCode, udiseCode) &&
    isPrimaryExamReportStandard(standard)
  );
}

/** Exact 14 column headers from printed exam report */
export const EXAM_REPORT_COLUMNS = [
  { key: "guj", header: "ગુજરાતી", aliases: ["gujarati", "ગુજરાતી"] },
  { key: "hin", header: "હિન્દી", aliases: ["hindi", "હિન્દી"] },
  { key: "eng", header: "અંગ્રેજી", aliases: ["english", "અંગ્રેજી"] },
  { key: "ss", header: "સામાજિક વિજ્ઞાન", aliases: ["social", "સામાજિક"] },
  { key: "math", header: "ગણિત", aliases: ["math", "ગણિત"] },
  {
    key: "sci",
    header: "વિજ્ઞાન અને ટેકનોલોજી/પર્યાવરણ",
    aliases: ["science", "વિજ્ઞાન", "પર્યાવરણ"],
  },
  {
    key: "art",
    header: "ચિત્રકામ (સત્ર દીઠ ૫૦ ગુણ)",
    aliases: ["drawing", "ચિત્રકામ", "art"],
  },
  {
    key: "san",
    header: "સંસ્કૃત (સત્ર દીઠ ૫૦ ગુણ)",
    aliases: ["sanskrit", "સંસ્કૃત"],
  },
  {
    key: "comp",
    header: "કમ્પ્યુટર (સત્ર દીઠ ૫૦ ગુણ)",
    aliases: ["computer", "કોમ્પ્યુટર", "કમ્પ્યુટર"],
  },
  {
    key: "pe",
    header: "શારીરિક અને સ્વાસ્થ્ય શિક્ષણ (સત્ર દીઠ ૧૦૦ ગુણ)",
    aliases: ["physical", "pe", "શારીરિક", "health"],
  },
  {
    key: "music",
    header: "સંગીત શિક્ષણ (સત્ર દીઠ ૫૦ ગુણ)",
    aliases: ["music", "સંગીત", "gk", "સામાન્ય જ્ઞાન", "બૌદ્ધિક"],
  },
  { key: "total", header: "શૈક્ષણિક વિષય ગુણ", aliases: [] },
  { key: "pct", header: "ટકા", aliases: [] },
  { key: "grade", header: "સરેરાશ ગ્રેડ", aliases: [] },
] as const;

export type ExamReportSubjectInput = PragatiSubjectInput & {
  formative?: number | null;
  internal?: number | null;
};

export type ExamReportAssessmentRow = {
  key: string;
  label: string;
  marks: number | null;
  remark: string;
};

export type ExamReportTermBlock = {
  key: "sem1" | "sem2" | "annual";
  label: string;
  rows: ExamReportAssessmentRow[];
};

export type ExamReportGridRow = {
  key: string;
  label: string;
  cells: (string | number | null)[];
};

export type ExamReportGrid = {
  termKey: "sem1" | "sem2" | "annual";
  termLabel: string;
  rows: ExamReportGridRow[];
};

export type ExamReportData = {
  srNo: number | string;
  examNumber: string;
  grNumber: string;
  standard: string;
  section: string;
  academicYear: string;
  attendancePresent: number | null;
  attendanceTotal: number | null;
  surname: string;
  studentName: string;
  fatherName: string;
  termBlocks: ExamReportTermBlock[];
  grids: ExamReportGrid[];
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.\s_/·\-–—]+/g, "")
    .trim();
}

function matchExamColumn(subjectName: string) {
  const n = norm(subjectName);
  if (!n) return null;
  for (const col of EXAM_REPORT_COLUMNS) {
    if (col.key === "total" || col.key === "pct" || col.key === "grade") continue;
    for (const a of col.aliases) {
      const an = norm(a);
      if (n === an || n.includes(an) || an.includes(n)) return col.key;
    }
  }
  const prag = matchPragatiSubject(subjectName);
  if (prag) {
    const map: Record<string, string> = {
      gk: "music",
      pe: "pe",
      art: "art",
      comp: "comp",
      san: "san",
      sci: "sci",
      ss: "ss",
      guj: "guj",
      hin: "hin",
      eng: "eng",
      math: "math",
    };
    return map[prag.key] || null;
  }
  return null;
}

function pickMark(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

function sumMarks(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0);
}

function buildTermBlock(
  label: string,
  key: "sem1" | "sem2" | "annual",
  rows: ExamReportAssessmentRow[],
): ExamReportTermBlock {
  return { key, label, rows };
}

function buildAssessmentRows(
  which: "sem1" | "sem2" | "annual",
  inputs: ExamReportSubjectInput[],
  pragRows: ReturnType<typeof buildPragatiSubjectRows>,
): ExamReportAssessmentRow[] {
  const col = sumPragatiColumn(pragRows, which);

  if (which === "annual") {
    const total =
      col.max > 0 && col.obtained > 0
        ? col.obtained
        : sumMarks(inputs.map((s) => pickMark(s.obtained)));
    return [
      {
        key: "annualTotal",
        label: "(પ્રથમ સત્ર+દ્વિતીય સત્ર) કુલ ગુણ",
        marks: total,
        remark: "",
      },
      {
        key: "annualPct",
        label: "એકંદર કુલ ગુણ ટકામાં",
        marks: col.percentage,
        remark: "",
      },
      {
        key: "annualGrade",
        label: "ગ્રેડ",
        marks: null,
        remark: col.grade,
      },
    ];
  }

  const formative = sumMarks(inputs.map((s) => pickMark(s.formative)));
  const internal = sumMarks(inputs.map((s) => pickMark(s.internal)));
  const summative =
    which === "sem1"
      ? sumMarks(inputs.map((s) => pickMark(s.first)))
      : sumMarks(inputs.map((s) => pickMark(s.second)));
  const total = col.max > 0 && col.obtained > 0 ? col.obtained : summative;

  return [
    {
      key: "formative",
      label: "રચનાત્મક મૂલ્યાંકન / OMR",
      marks: formative,
      remark: "",
    },
    {
      key: "summative",
      label: "સત્રાંતે મૂલ્યાંકન / લેખિત",
      marks: summative,
      remark: "",
    },
    {
      key: "internal",
      label: "સ્વ-અધ્યયન કાર્યના આધારે મૂલ્યાંકન /આંતરિક મૂલ્યાંકન",
      marks: internal,
      remark: "",
    },
    {
      key: "total",
      label: "કુલ ગુણ",
      marks: total,
      remark: "",
    },
    {
      key: "grade",
      label: "ગ્રેડ",
      marks: null,
      remark: col.grade,
    },
  ];
}

function subjectMarkForTerm(
  input: ExamReportSubjectInput | undefined,
  which: "sem1" | "sem2" | "annual",
): number | null {
  if (!input) return null;
  if (which === "sem1") return pickMark(input.first);
  if (which === "sem2") return pickMark(input.second);
  const a = pickMark(input.first);
  const b = pickMark(input.second);
  if (a != null || b != null) return (a || 0) + (b || 0);
  return pickMark(input.obtained);
}

function buildSubjectGrid(
  termKey: "sem1" | "sem2" | "annual",
  termLabel: string,
  inputs: ExamReportSubjectInput[],
  pragRows: ReturnType<typeof buildPragatiSubjectRows>,
): ExamReportGrid {
  const byCol = new Map<string, ExamReportSubjectInput>();
  for (const inp of inputs) {
    const key = matchExamColumn(inp.name);
    if (key) byCol.set(key, inp);
  }

  const colKeys = EXAM_REPORT_COLUMNS.map((c) => c.key).filter(
    (k) => k !== "total" && k !== "pct" && k !== "grade",
  );

  const rowDefs: { key: string; label: string; pick: (inp?: ExamReportSubjectInput) => number | null }[] =
    [
      {
        key: "formative",
        label: "રચનાત્મક મૂલ્યાંકન / OMR",
        pick: (inp) => pickMark(inp?.formative),
      },
      {
        key: "summative",
        label: "સત્રાંતે મૂલ્યાંકન / લેખિત",
        pick: (inp) =>
          termKey === "sem1"
            ? pickMark(inp?.first)
            : termKey === "sem2"
              ? pickMark(inp?.second)
              : pickMark(inp?.obtained),
      },
      {
        key: "internal",
        label: "સ્વ-અધ્યયન કાર્ય / આંતરિક",
        pick: (inp) => pickMark(inp?.internal),
      },
      {
        key: "total",
        label: "કુલ ગુણ",
        pick: (inp) => subjectMarkForTerm(inp, termKey),
      },
      {
        key: "grade",
        label: "ગ્રેડ",
        pick: () => null,
      },
    ];

  const rows: ExamReportGridRow[] = rowDefs.map((def) => {
    const subjectCells = colKeys.map((ck) => {
      const inp = byCol.get(ck);
      if (def.key === "grade") {
        const m = subjectMarkForTerm(inp, termKey);
        const prag = pragRows.find((r) => matchExamColumn(r.name) === ck);
        if (termKey === "sem1") return prag?.sem1Grade || pragatiGradeFromPercent(pragatiPercent(m, 100)) || null;
        if (termKey === "sem2") return prag?.sem2Grade || pragatiGradeFromPercent(pragatiPercent(m, 100)) || null;
        return prag?.annualGrade || pragatiGradeFromPercent(pragatiPercent(m, prag?.annualMax ?? 200)) || null;
      }
      return def.pick(inp);
    });

    const colTotals = sumPragatiColumn(pragRows, termKey);
    const totalCell = def.key === "total" ? colTotals.obtained : def.key === "grade" ? colTotals.grade : null;
    const pctCell = def.key === "total" ? colTotals.percentage : null;
    const gradeCell = def.key === "grade" ? colTotals.grade : null;

    return {
      key: def.key,
      label: def.label,
      cells: [...subjectCells, totalCell, pctCell, gradeCell],
    };
  });

  // Fill empty rows to match physical form (12 data rows)
  while (rows.length < 12) {
    rows.push({
      key: `blank-${rows.length}`,
      label: "",
      cells: Array(EXAM_REPORT_COLUMNS.length).fill(null),
    });
  }

  return { termKey, termLabel, rows: rows.slice(0, 12) };
}

export function buildSongadhExamReport(params: {
  srNo?: number | string;
  standard?: string | null;
  section?: string | null;
  academicYear?: string | null;
  student: {
    surname?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    surnameGu?: string | null;
    firstNameGu?: string | null;
    middleNameGu?: string | null;
    grNumber?: string | null;
    rollNumber?: string | null;
    fatherName?: string | null;
    fatherNameGu?: string | null;
  };
  reportCard?: {
    passNumber?: string | null;
    attendancePresent?: number | null;
    attendanceTotal?: number | null;
  } | null;
  subjects: ExamReportSubjectInput[];
}): ExamReportData {
  const { student, reportCard, subjects } = params;
  const pragRows = buildPragatiSubjectRows(subjects);

  const surname = (student.surnameGu || student.surname || "").trim();
  const studentName = [student.firstNameGu || student.firstName, student.middleNameGu || student.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fatherName = (student.fatherNameGu || student.fatherName || "").trim();

  const termBlocks: ExamReportTermBlock[] = [
    buildTermBlock("પ્રથમ સત્ર", "sem1", buildAssessmentRows("sem1", subjects, pragRows)),
    buildTermBlock("દ્વિતીય સત્ર", "sem2", buildAssessmentRows("sem2", subjects, pragRows)),
    buildTermBlock("વર્ષાન્ત", "annual", buildAssessmentRows("annual", subjects, pragRows)),
  ];

  const grids: ExamReportGrid[] = [
    buildSubjectGrid("sem1", "પ્રથમ સત્ર", subjects, pragRows),
    buildSubjectGrid("sem2", "દ્વિતીય સત્ર", subjects, pragRows),
    buildSubjectGrid("annual", "વર્ષાન્ત", subjects, pragRows),
  ];

  return {
    srNo: params.srNo ?? student.rollNumber ?? "",
    examNumber: reportCard?.passNumber?.trim() || "",
    grNumber: student.grNumber?.trim() || "",
    standard: String(params.standard || "").trim(),
    section: String(params.section || "").trim(),
    academicYear: String(params.academicYear || "").trim(),
    attendancePresent: reportCard?.attendancePresent ?? null,
    attendanceTotal: reportCard?.attendanceTotal ?? null,
    surname,
    studentName,
    fatherName,
    termBlocks,
    grids,
  };
}
