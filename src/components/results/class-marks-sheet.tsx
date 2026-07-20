"use client";

import type { MarksSheetConfig, MarksSheetExamRowDef } from "@/lib/results/marks-sheet-config";
import type { ComputedMarksSheet, SubjectMarksInput } from "@/lib/results/marks-sheet-calculations";
import {
  computeStudentMarksSheet,
  assignSheetRanks,
  rowPassFail,
} from "@/lib/results/marks-sheet-calculations";
import { studentFullNameGu } from "@/lib/student-names";

export type MarksSheetStudent = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  rollNumber?: string | null;
  grNumber?: string | null;
  dateOfBirth: string;
  examNumber: number;
  passNumber: string;
  attendancePresent: number | null;
  attendanceTotal: number | null;
  subjectInputs: SubjectMarksInput[];
  computed: ComputedMarksSheet;
  finalTotal: number;
  percentage: number | null;
  rank: number | null;
};

const RED = "#c41e3a";
const BORDER = "1px solid #000";

const CELL: React.CSSProperties = {
  border: BORDER,
  padding: "5px 6px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
  lineHeight: 1.3,
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  ...CELL,
  textAlign: "left",
  fontWeight: 700,
  whiteSpace: "nowrap",
  paddingLeft: "8px",
};

const META_LABEL: React.CSSProperties = {
  ...CELL,
  fontWeight: 700,
  fontSize: "9.5px",
  padding: "5px 4px",
};

const MAX_COL: React.CSSProperties = {
  ...CELL,
  width: "30px",
  minWidth: "30px",
  fontWeight: 700,
  padding: "4px 3px",
};

const SUBJECT_COL: React.CSSProperties = {
  ...CELL,
  width: "36px",
  minWidth: "36px",
  padding: "4px 3px",
};

const SUMMARY_COL: React.CSSProperties = {
  ...CELL,
  width: "44px",
  minWidth: "44px",
};

const TABLE_BASE: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontFamily: '"Noto Sans Gujarati", Arial, sans-serif',
  color: "#000",
};

function studentName(st: MarksSheetStudent) {
  return studentFullNameGu(st);
}

function displayValue(v: string | number | null | undefined) {
  if (v == null || v === "") return "";
  return String(v);
}

function VerticalLabel({ children, height = 76 }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      className="marks-sheet-vertical-label"
      style={{
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "9px",
        fontWeight: 600,
        lineHeight: 1.1,
        margin: "0 auto",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function MarksInput({
  value,
  onChange,
  max,
  type = "number",
  width = 48,
}: {
  value: string | number | null;
  onChange?: (v: string) => void;
  max?: number;
  type?: "number" | "text";
  width?: number;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      max={max}
      onChange={(e) => onChange?.(e.target.value)}
      className="marks-sheet-input"
      style={{
        width: "100%",
        maxWidth: width,
        border: "none",
        background: "transparent",
        textAlign: "center",
        fontSize: "10px",
        padding: 0,
        outline: "none",
      }}
    />
  );
}

function StudentInfoHeader({
  name,
  standard,
  section,
  student,
  editable,
  onMetaChange,
}: {
  name: string;
  standard: string;
  section: string;
  student: MarksSheetStudent;
  editable: boolean;
  onMetaChange: (patch: Partial<MarksSheetStudent>) => void;
}) {
  const metaLabels = [
    "પરીક્ષા નંબર",
    "રોલ નંબર",
    "જી. આર. નંબર",
    "જન્મ તારીખ",
    "કુલ હાજરી",
    "કુલ હાજર દિવસ",
  ];

  return (
    <table className="marks-sheet-info-table" style={TABLE_BASE}>
      <colgroup>
        <col style={{ width: "16.666%" }} />
        <col style={{ width: "16.666%" }} />
        <col style={{ width: "16.666%" }} />
        <col style={{ width: "16.666%" }} />
        <col style={{ width: "16.666%" }} />
        <col style={{ width: "16.666%" }} />
      </colgroup>
      <tbody>
        <tr>
          <td colSpan={4} style={{ ...LABEL, fontSize: "11px" }}>
            વિદ્યાર્થીનું નામ :- <strong>{name}</strong>
          </td>
          <td style={{ ...CELL, fontWeight: 700, fontSize: "11px" }}>ધોરણ-{standard}</td>
          <td style={{ ...CELL, fontWeight: 700, fontSize: "11px" }}>વર્ગ - {section}</td>
        </tr>
        <tr>
          {metaLabels.map((label) => (
            <td key={label} style={META_LABEL}>
              {label}
            </td>
          ))}
        </tr>
        <tr>
          <td style={CELL}>
            {editable ? (
              <MarksInput
                value={student.passNumber}
                type="text"
                onChange={(v) => onMetaChange({ passNumber: v })}
              />
            ) : (
              student.passNumber
            )}
          </td>
          <td style={CELL}>{student.rollNumber || ""}</td>
          <td style={CELL}>{student.grNumber || ""}</td>
          <td style={CELL}>{student.dateOfBirth || ""}</td>
          <td style={CELL}>
            {editable ? (
              <MarksInput
                value={student.attendancePresent}
                onChange={(v) => onMetaChange({ attendancePresent: v === "" ? null : Number(v) })}
              />
            ) : (
              displayValue(student.attendancePresent)
            )}
          </td>
          <td style={CELL}>
            {editable ? (
              <MarksInput
                value={student.attendanceTotal}
                onChange={(v) => onMetaChange({ attendanceTotal: v === "" ? null : Number(v) })}
              />
            ) : (
              displayValue(student.attendanceTotal)
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function StudentFooter({
  result,
  percentage,
  rank,
}: {
  result: string;
  percentage: number | null;
  rank: number | null;
}) {
  return (
    <table className="marks-sheet-footer-table" style={{ ...TABLE_BASE, marginTop: "-1px" }}>
      <colgroup>
        <col style={{ width: "33.333%" }} />
        <col style={{ width: "33.333%" }} />
        <col style={{ width: "33.333%" }} />
      </colgroup>
      <tbody>
        <tr>
          <td style={{ ...LABEL, fontWeight: 700 }}>પરિણામ :- {result || "પાસ"}</td>
          <td style={{ ...CELL, textAlign: "left", paddingLeft: "10px", fontWeight: 600 }}>
            ટકાવારી :- {percentage != null ? Number(percentage).toFixed(2) : ""}
          </td>
          <td style={{ ...CELL, textAlign: "left", paddingLeft: "10px", fontWeight: 600 }}>
            રેંક :- {rank ?? ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function isRedRow(kind: MarksSheetExamRowDef["kind"]) {
  return kind === "converted" || kind === "final" || kind === "total";
}

function StudentMarksBlock({
  student,
  config,
  standard,
  section,
  editable,
  onChange,
}: {
  student: MarksSheetStudent;
  config: MarksSheetConfig;
  standard: string;
  section: string;
  editable: boolean;
  onChange: (student: MarksSheetStudent) => void;
}) {
  const { computed, subjectInputs } = student;
  const name = studentName(student);
  const numericCount = config.subjects.filter((s) => s.type === "numeric").length;

  const updateSubject = (code: string, patch: Partial<SubjectMarksInput>) => {
    const nextInputs = subjectInputs.map((s) =>
      s.subject.code === code ? { ...s, ...patch } : s,
    );
    const nextComputed = computeStudentMarksSheet(config, nextInputs);
    onChange({
      ...student,
      subjectInputs: nextInputs,
      computed: nextComputed,
      finalTotal: Number(nextComputed.summaryCells.final) || 0,
      percentage: nextComputed.footer.percentage,
    });
  };

  const updateMeta = (patch: Partial<MarksSheetStudent>) => {
    onChange({ ...student, ...patch });
  };

  const rowMaxTotal = (kind: MarksSheetExamRowDef["kind"]) => {
    const perSubject: Record<string, number> = {
      first: 50,
      second: 50,
      internal: 20,
      annual: 80,
      total: 200,
      converted: 100,
      achievement: 15,
      grace: 10,
      final: 100,
    };
    const per = perSubject[kind];
    return per ? per * numericCount : null;
  };

  const renderRow = (row: MarksSheetExamRowDef) => {
    const redRow = isRedRow(row.kind);
    const rowTotal = computed.summaryCells[row.key] as number | string | null;
    const rowMax = row.maxMarks != null ? row.maxMarks * numericCount : rowMaxTotal(row.kind);
    const rowResult = rowPassFail(
      typeof rowTotal === "number" ? rowTotal : Number(rowTotal) || null,
      rowMax,
    );
    const showResult =
      row.kind === "first" || row.kind === "second" || row.kind === "annual" || row.kind === "final";

    return (
      <tr key={row.key}>
        <td style={LABEL}>{row.label}</td>
        <td style={MAX_COL}>{row.kind === "max" ? "ગુણ" : row.maxMarks ?? ""}</td>
        {config.subjects.map((sub) => {
          const input = subjectInputs.find((s) => s.subject.code === sub.code)!;
          const cells = computed.subjectCells[sub.code];

          if (row.kind === "max") {
            return <td key={sub.code} style={SUBJECT_COL} />;
          }

          if (sub.type === "grade") {
            const showGrade = ["converted", "final"].includes(row.kind);
            return (
              <td
                key={sub.code}
                style={{
                  ...SUBJECT_COL,
                  color: redRow ? RED : undefined,
                  fontWeight: redRow ? 700 : 400,
                }}
              >
                {editable && showGrade ? (
                  <MarksInput
                    value={input.letterGrade}
                    type="text"
                    onChange={(v) => updateSubject(sub.code, { letterGrade: v || null })}
                    width={28}
                  />
                ) : (
                  displayValue(showGrade ? cells[row.key] : "")
                )}
              </td>
            );
          }

          const fieldMap: Record<string, keyof SubjectMarksInput> = {
            first: "first",
            second: "second",
            internal: "internal",
            annual: "annual",
            achievement: "achievement",
            special: "special",
            grace: "grace",
          };
          const field = fieldMap[row.kind];

          if (field) {
            return (
              <td key={sub.code} style={SUBJECT_COL}>
                {editable ? (
                  <MarksInput
                    value={input[field] as number | null}
                    max={row.maxMarks ?? undefined}
                    onChange={(v) =>
                      updateSubject(sub.code, {
                        [field]: v === "" ? null : Number(v),
                      })
                    }
                    width={30}
                  />
                ) : (
                  displayValue(cells[row.key])
                )}
              </td>
            );
          }

          return (
            <td
              key={sub.code}
              style={{
                ...SUBJECT_COL,
                color: redRow ? RED : undefined,
                fontWeight: redRow ? 700 : 400,
              }}
            >
              {displayValue(cells[row.key])}
            </td>
          );
        })}
        <td style={{ ...SUMMARY_COL, color: RED, fontWeight: 700 }}>
          {row.kind === "max" ? "" : displayValue(rowTotal)}
        </td>
        <td
          style={{
            ...SUMMARY_COL,
            color: rowResult ? RED : undefined,
            fontWeight: rowResult ? 700 : 400,
          }}
        >
          {showResult ? rowResult : row.kind === "final" ? computed.footer.result || "" : ""}
        </td>
        <td style={SUMMARY_COL}>
          {row.kind === "final" ? displayValue(computed.footer.rank) : ""}
        </td>
      </tr>
    );
  };

  return (
    <div className="marks-sheet-block" style={{ marginBottom: "24px", breakInside: "avoid" }}>
      <StudentInfoHeader
        name={name}
        standard={standard}
        section={section}
        student={student}
        editable={editable}
        onMetaChange={updateMeta}
      />

      <table className="marks-sheet-table" style={{ ...TABLE_BASE, marginTop: "-1px" }}>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...LABEL, textAlign: "center" }}>
              વિષય
            </td>
            {config.subjects.map((sub) => (
              <td key={sub.code} style={{ ...SUBJECT_COL, padding: "6px 2px", height: "84px" }}>
                <VerticalLabel>{sub.name}</VerticalLabel>
              </td>
            ))}
            <td style={{ ...SUMMARY_COL, padding: "6px 2px", height: "84px" }}>
              <VerticalLabel height={70}>કુલ ગુણ</VerticalLabel>
            </td>
            <td style={{ ...SUMMARY_COL, padding: "6px 2px", height: "84px" }}>
              <VerticalLabel height={70}>પરિણામ</VerticalLabel>
            </td>
            <td style={{ ...SUMMARY_COL, padding: "6px 2px", height: "84px" }}>
              <VerticalLabel height={50}>ક્રમ</VerticalLabel>
            </td>
          </tr>
          {config.examRows.map((row) => renderRow(row))}
        </tbody>
      </table>

      <StudentFooter
        result={computed.footer.result || "પાસ"}
        percentage={computed.footer.percentage}
        rank={computed.footer.rank}
      />
    </div>
  );
}

export function ClassMarksSheetView({
  students,
  config,
  standard,
  section,
  editable = true,
  onStudentsChange,
}: {
  students: MarksSheetStudent[];
  config: MarksSheetConfig;
  standard: string;
  section: string;
  editable?: boolean;
  onStudentsChange?: (students: MarksSheetStudent[]) => void;
}) {
  const handleStudentChange = (idx: number, updated: MarksSheetStudent) => {
    if (!onStudentsChange) return;
    const next = students.map((s, i) => (i === idx ? updated : s));
    const ranked = assignSheetRanks(
      next.map((s) => ({
        ...s,
        finalTotal: Number(s.computed.summaryCells.final) || 0,
        percentage: s.computed.footer.percentage,
      })),
    );
    onStudentsChange(
      ranked.map((s) => ({
        ...s,
        computed: {
          ...s.computed,
          footer: { ...s.computed.footer, rank: s.rank },
          summaryCells: { ...s.computed.summaryCells, rank: s.rank },
        },
      })),
    );
  };

  return (
    <div className="marks-sheet-bundle">
      {students.map((st, idx) => (
        <StudentMarksBlock
          key={st.id}
          student={st}
          config={config}
          standard={standard}
          section={section}
          editable={editable}
          onChange={(updated) => handleStudentChange(idx, updated)}
        />
      ))}
      <style jsx global>{`
        .marks-sheet-info-table td,
        .marks-sheet-table td,
        .marks-sheet-footer-table td {
          box-sizing: border-box;
        }
        .marks-sheet-input:focus {
          background: #fffde7;
          outline: 1px solid #f59e0b;
        }
        @media print {
          .marks-sheet-block {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 18px;
          }
          .marks-sheet-input {
            border: none !important;
            outline: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
