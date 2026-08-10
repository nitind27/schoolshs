"use client";

import type { ResultCardData } from "@/components/results/annual-result-card";
import {
  EXAM_REPORT_COLUMNS,
  buildSongadhExamReport,
  type ExamReportData,
  type ExamReportSubjectInput,
} from "@/lib/results/songadh-exam-report";
import {
  studentDisplayFatherName,
  studentDisplayFirstName,
  studentDisplayMiddleName,
  studentDisplaySurname,
} from "@/lib/student-names";
import "./songadh-exam-report.css";

export type ExamReportCardData = Omit<ResultCardData, "subjects"> & {
  student: ResultCardData["student"] & {
    fatherName?: string | null;
    fatherNameGu?: string | null;
  };
  subjects: Array<
    ResultCardData["subjects"][number] & {
      first?: number | null;
      second?: number | null;
      formative?: number | null;
      internal?: number | null;
      letterGrade?: string | null;
      grade?: string | null;
    }
  >;
  index?: number;
};

const BLOCKS_PER_PAGE = 3;
const GRID_TERMS = ["sem1", "sem2", "annual"] as const;
const ASSESSMENT_ROW_KEYS = new Set([
  "formative",
  "summative",
  "internal",
  "total",
  "grade",
  "annualTotal",
  "annualPct",
  "annualGrade",
]);

function toGuDigits(n: number | string | null | undefined): string {
  if (n == null || n === "") return "";
  const gu = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  return String(n).replace(/\d/g, (d) => gu[parseInt(d, 10)]);
}

function cellVal(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") return toGuDigits(v);
  return String(v);
}

function markVal(marks: number | null, remark?: string): { marks: string; remark: string } {
  if (marks != null) return { marks: toGuDigits(marks), remark: remark || "" };
  if (remark) return { marks: "", remark };
  return { marks: "", remark: "" };
}

/** Page 1 — 3 student blocks per sheet (scan format) */
function StudentBlock({
  data,
  compact = false,
}: {
  data: ExamReportData;
  compact?: boolean;
}) {
  const sem1 = data.termBlocks.find((t) => t.key === "sem1")!;
  const sem2 = data.termBlocks.find((t) => t.key === "sem2")!;
  const annual = data.termBlocks.find((t) => t.key === "annual")!;

  const renderTermRows = (rows: typeof sem1.rows, startNo: number) =>
    rows.map((row, i) => {
      const { marks, remark } = markVal(row.marks, row.remark);
      const isAnnualPct = row.key === "annualPct";
      return (
        <div key={row.key} className="ser-mark-row">
          <span className="ser-mark-no">{toGuDigits(startNo + i)}</span>
          <span className="ser-mark-label">{row.label}</span>
          <span className="ser-mark-val">
            {isAnnualPct && row.marks != null ? `${toGuDigits(row.marks)}%` : marks}
          </span>
          <span className="ser-mark-val">{remark}</span>
        </div>
      );
    });

  return (
    <div className={`ser-student-block${compact ? " ser-student-block--compact" : ""}`}>
      <div className="ser-top-head">
        <span className="ser-th-sr">
          અ.નં.
          <strong>{toGuDigits(data.srNo)}</strong>
        </span>
        <span className="ser-th-name">વિદ્યાર્થીનું નામ</span>
        <span className="ser-th-rail" aria-hidden="true" />
        <div className="ser-th-marks">
          <span>પરીક્ષા</span>
          <span>ગુણ</span>
          <span>રીમાર્ક</span>
        </div>
      </div>

      <div className="ser-student-inner">
        <div className="ser-left-col">
          <div className="ser-left-box">
            પરીક્ષા નંબર
            <div className="ser-left-input">{toGuDigits(data.examNumber)}</div>
          </div>
          <div className="ser-left-box">
            જી.આર.નંબર
            <div className="ser-left-input">{toGuDigits(data.grNumber)}</div>
          </div>
          <div className="ser-left-box">
            હાજરી/કુલ
            <div className="ser-left-inputs-stack">
              <div className="ser-left-input ser-left-input--split">
                {data.attendancePresent != null ? toGuDigits(data.attendancePresent) : ""}
              </div>
              <div className="ser-left-input ser-left-input--split">
                {data.attendanceTotal != null ? toGuDigits(data.attendanceTotal) : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="ser-name-col">
          <div>
            અટક : <span className="ser-name-line">{data.surname || "\u00a0"}</span>
          </div>
          <div>
            વિદ્યાર્થીનું નામ :{" "}
            <span className="ser-name-line">{data.studentName || "\u00a0"}</span>
          </div>
          <div>
            પિતાનું નામ : <span className="ser-name-line">{data.fatherName || "\u00a0"}</span>
          </div>
          {!compact ? (
            <div className="ser-name-extra">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="ser-name-line">
                  {"\u00a0"}
                </div>
              ))}
            </div>
          ) : (
            <div className="ser-name-extra ser-name-extra--compact">
              {[1, 2].map((n) => (
                <div key={n} className="ser-name-line">
                  {"\u00a0"}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ser-term-rail">
          <div className="ser-term-label" style={{ flex: sem1.rows.length }}>
            પ્રથમ સત્ર
          </div>
          <div className="ser-term-label" style={{ flex: sem2.rows.length }}>
            દ્વિતીય સત્ર
          </div>
          <div className="ser-term-label" style={{ flex: annual.rows.length }}>
            વર્ષાન્ત
          </div>
        </div>

        <div className="ser-marks-col">
          <div className="ser-marks-head">
            <span>અ.નં.</span>
            <span>પરીક્ષા</span>
            <span>ગુણ</span>
            <span>રીમાર્ક</span>
          </div>
          <div className="ser-term-section">{renderTermRows(sem1.rows, 1)}</div>
          <div className="ser-term-section">{renderTermRows(sem2.rows, 1)}</div>
          <div className="ser-term-section">{renderTermRows(annual.rows, 1)}</div>
        </div>
      </div>
    </div>
  );
}

/** Physical register subject page — 3 term grids (પ્રથમ / દ્વિતીય / વર્ષાન્ત), no extra chrome */
function SubjectGrid({
  grid,
  showTag = false,
  srNo,
  studentLabel,
}: {
  grid: ExamReportData["grids"][number];
  showTag?: boolean;
  srNo?: number | string;
  studentLabel?: string;
}) {
  return (
    <div className="ser-grid-wrap">
      {showTag && (srNo != null || studentLabel) && (
        <div className="ser-grid-student-tag">
          {srNo != null && <span>અ.નં. {toGuDigits(srNo)}</span>}
          {studentLabel && <span>{studentLabel}</span>}
          <span className="ser-grid-term-tag">{grid.termLabel}</span>
        </div>
      )}
      <table className="ser-grid-table">
        <thead>
          <tr>
            {EXAM_REPORT_COLUMNS.map((col) => (
              <th key={col.key} className="ser-col-head">
                <span className="ser-col-head-text">{col.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, ci) => (
                <td key={`${row.key}-${ci}`}>{cellVal(cell) || "\u00a0"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Register subject sheet — 3 stacked term tables (scan page 1) */
function RegisterSubjectSheet({
  grids,
  dense = false,
}: {
  grids: ExamReportData["grids"];
  dense?: boolean;
}) {
  return (
    <div className={`ser-grids-page${dense ? " ser-grids-page--dense" : ""}`}>
      {grids.map((grid) => (
        <SubjectGrid key={grid.termKey} grid={grid} />
      ))}
    </div>
  );
}

/** Register student sheet — up to 3 student blocks (scan page 2) */
function RegisterStudentSheet({
  reports,
  compact = true,
}: {
  reports: ExamReportData[];
  compact?: boolean;
}) {
  return (
    <div className="ser-block-stack">
      {reports.map((report) => (
        <StudentBlock key={String(report.srNo)} data={report} compact={compact} />
      ))}
      {reports.length < BLOCKS_PER_PAGE &&
        Array.from({ length: BLOCKS_PER_PAGE - reports.length }).map((_, i) => (
          <div
            key={`empty-block-${i}`}
            className="ser-student-block ser-student-block--empty"
            aria-hidden
          />
        ))}
    </div>
  );
}

/** Merge up to 3 students into one term grid (rows stacked per student) */
function mergeBatchTermGrid(
  reports: ExamReportData[],
  termKey: (typeof GRID_TERMS)[number],
): ExamReportData["grids"][number] {
  const termLabel =
    termKey === "sem1" ? "પ્રથમ સત્ર" : termKey === "sem2" ? "દ્વિતીય સત્ર" : "વર્ષાન્ત";
  const rows: ExamReportData["grids"][number]["rows"] = [];

  for (const report of reports) {
    const grid = report.grids.find((g) => g.termKey === termKey);
    if (!grid) continue;
    const assessmentRows = grid.rows.filter((r) => ASSESSMENT_ROW_KEYS.has(r.key));
    rows.push(...assessmentRows);
  }

  while (rows.length < 12) {
    rows.push({
      key: `blank-${rows.length}`,
      label: "",
      cells: Array(EXAM_REPORT_COLUMNS.length).fill(null),
    });
  }

  const maxRows = reports.length > 1 ? 15 : 12;
  return { termKey, termLabel, rows: rows.slice(0, maxRows) };
}

function buildRegisterSubjectGrids(reports: ExamReportData[]): ExamReportData["grids"] {
  return GRID_TERMS.map((termKey) => mergeBatchTermGrid(reports, termKey));
}

function cardToReport(data: ExamReportCardData, index: number): ExamReportData {
  const subjects: ExamReportSubjectInput[] = data.subjects.map((s) => ({
    name: s.name,
    maxMarks: s.maxMarks,
    first: s.first,
    second: s.second,
    obtained: s.finalMarks ?? s.marksObtained,
    letterGrade: s.letterGrade ?? s.grade,
    formative: s.formative,
    internal: s.internal,
  }));

  const st = data.student;
  return buildSongadhExamReport({
    srNo: data.index ?? index + 1,
    standard: st.standard,
    section: st.section,
    academicYear: data.exam?.academicYear,
    student: {
      ...st,
      surname: studentDisplaySurname(st),
      firstName: studentDisplayFirstName(st),
      middleName: studentDisplayMiddleName(st),
      fatherName: studentDisplayFatherName(st),
    },
    reportCard: data.reportCard,
    subjects,
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Single student — subject page first, then student block (register order) */
export function SongadhExamReportCard({
  data,
  index = 0,
}: {
  data: ExamReportCardData;
  index?: number;
}) {
  const report = cardToReport(data, index);

  return (
    <div className="ser-root">
      <div className="ser-sheet ser-sheet--subjects ser-sheet--break">
        <RegisterSubjectSheet grids={report.grids} />
      </div>
      <div className="ser-sheet ser-sheet--student">
        <RegisterStudentSheet reports={[report]} compact={false} />
      </div>
    </div>
  );
}

/**
 * Class register — physical order per 3 students:
 * Page 1: Subject grids (પ્રથમ / દ્વિતીય / વર્ષાન્ત)
 * Page 2: Student blocks (3)
 */
export function SongadhExamReportCards({ cards }: { cards: ExamReportCardData[] }) {
  const reports = cards.map((card, i) => cardToReport({ ...card, index: i + 1 }, i));
  const batches = chunk(reports, BLOCKS_PER_PAGE);

  if (reports.length === 1) {
    const report = reports[0];
    return (
      <div className="ser-root">
        <div className="ser-sheet ser-sheet--subjects ser-sheet--break">
          <RegisterSubjectSheet grids={report.grids} />
        </div>
        <div className="ser-sheet ser-sheet--student">
          <RegisterStudentSheet reports={[report]} compact={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="ser-root">
      {batches.map((group, bi) => (
        <div key={`batch-${bi}`} className="ser-register-batch">
          <div className="ser-sheet ser-sheet--subjects ser-sheet--break">
            <RegisterSubjectSheet grids={buildRegisterSubjectGrids(group)} dense />
          </div>
          <div className="ser-sheet ser-sheet--student-batch ser-sheet--break">
            <RegisterStudentSheet reports={group} compact />
          </div>
        </div>
      ))}
    </div>
  );
}
