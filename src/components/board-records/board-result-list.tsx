"use client";

import type { BoardResultListConfig } from "@/lib/board-records/result-list-config";
import type { BoardResultListRow } from "@/lib/board-records/result-list-data";
import { recomputeBoardRow } from "@/lib/board-records/result-list-data";

const BORDER = "1px solid #000";

const CELL: React.CSSProperties = {
  border: BORDER,
  padding: "3px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9.5px",
  lineHeight: 1.25,
  boxSizing: "border-box",
};

const HDR: React.CSSProperties = {
  ...CELL,
  fontWeight: 700,
  fontSize: "9px",
  padding: "4px 3px",
};

const NAME_CELL: React.CSSProperties = {
  ...CELL,
  textAlign: "left",
  paddingLeft: "6px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  fontSize: "9.5px",
};

function VerticalHdr({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "8.5px",
        fontWeight: 700,
        margin: "0 auto",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function CellInput({
  value,
  onChange,
  type = "text",
  width = "100%",
  readOnly = false,
}: {
  value: string | number | null;
  onChange?: (v: string) => void;
  type?: "text" | "number";
  width?: string;
  readOnly?: boolean;
}) {
  if (readOnly) return <span>{value ?? ""}</span>;
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className="board-result-input"
      style={{
        width,
        maxWidth: "100%",
        border: "none",
        background: "transparent",
        textAlign: "center",
        fontSize: "9.5px",
        padding: 0,
        outline: "none",
      }}
    />
  );
}

function NameParts({ row }: { row: BoardResultListRow }) {
  if (row.isEmpty) return null;
  return (
    <span>
      <span style={{ display: "inline-block", minWidth: "72px" }}>{row.surname}</span>
      <span style={{ display: "inline-block", minWidth: "88px", paddingLeft: "8px" }}>
        {row.firstName}
      </span>
      <span style={{ display: "inline-block", paddingLeft: "8px" }}>{row.fatherName}</span>
    </span>
  );
}

export function BoardResultListTable({
  rows,
  config,
  classInfo,
  editable,
  onRowsChange,
}: {
  rows: BoardResultListRow[];
  config: BoardResultListConfig;
  classInfo: { name: string; standard: string; section: string; stream?: string | null };
  editable: boolean;
  onRowsChange?: (rows: BoardResultListRow[]) => void;
}) {
  const updateRow = (idx: number, patch: Partial<BoardResultListRow>) => {
    if (!onRowsChange) return;
    const next = rows.map((r, i) => {
      if (i !== idx || r.isEmpty) return r;
      const merged = recomputeBoardRow({ ...r, ...patch }, config);
      if (patch.subjects) {
        const total = Object.values(merged.subjects).reduce<number>((s, v) => s + (Number(v) || 0), 0);
        merged.totalMarks = total || null;
      }
      return merged;
    });
    onRowsChange(next);
  };

  const updateSubject = (idx: number, code: string, value: string) => {
    const row = rows[idx];
    if (row.isEmpty) return;
    const subjects = { ...row.subjects, [code]: value === "" ? null : Number(value) };
    updateRow(idx, { subjects });
  };

  const streamLabel = classInfo.stream ? ` ${classInfo.stream}` : "";

  return (
    <div className="board-result-list-block">
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "12px",
          marginBottom: "6px",
          fontFamily: '"Noto Sans Gujarati", Arial, sans-serif',
        }}
      >
        ધોરણ {classInfo.standard}
        {streamLabel} — વર્ગ {classInfo.section} — બોર્ડ પરિણામ યાદી
      </div>

      <table
        className="board-result-list-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontFamily: '"Noto Sans Gujarati", Arial, sans-serif',
          color: "#000",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...HDR, width: "28px" }}>ક્રમ</th>
            <th style={{ ...HDR, width: "48px" }}>જી.આર.</th>
            <th style={{ ...HDR, width: "62px" }}>જન્મતારીખ</th>
            <th style={{ ...HDR, width: "40px" }}>જાતિ</th>
            <th style={{ ...HDR, width: "220px" }}>વિદ્યાર્થીનું નામ</th>
            <th style={{ ...HDR, width: "68px" }}>બેઠક નંબર</th>
            {config.subjects.map((sub) => (
              <th key={sub.code} style={{ ...HDR, width: "34px", padding: "4px 2px" }}>
                <VerticalHdr>{sub.label}</VerticalHdr>
              </th>
            ))}
            <th style={{ ...HDR, width: "44px" }}>મેળવેલ ગુણ</th>
            <th style={{ ...HDR, width: "44px" }}>રેન્ક</th>
            <th style={{ ...HDR, width: "36px" }}>ગ્રેડ</th>
            <th style={{ ...HDR, width: "44px" }}>ટકા</th>
            <th style={{ ...HDR, width: "44px" }}>પરિણામ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id}>
              <td style={CELL}>{row.serial}</td>
              <td style={CELL}>{row.grNumber}</td>
              <td style={{ ...CELL, fontSize: "8.5px" }}>{row.dateOfBirth}</td>
              <td style={CELL}>{row.caste}</td>
              <td style={NAME_CELL}>
                <NameParts row={row} />
              </td>
              <td style={CELL}>
                {editable && !row.isEmpty ? (
                  <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
                    <CellInput
                      value={row.seatPrefix}
                      onChange={(v) => updateRow(idx, { seatPrefix: v.toUpperCase() })}
                      width="18px"
                    />
                    <CellInput
                      value={row.seatNumber}
                      onChange={(v) =>
                        updateRow(idx, {
                          seatNumber: v.replace(/\D/g, "").slice(0, config.standard === "12" ? 6 : 7),
                        })
                      }
                      width="42px"
                    />
                  </span>
                ) : (
                  row.seatDisplay
                )}
              </td>
              {config.subjects.map((sub) => (
                <td key={sub.code} style={CELL}>
                  {editable && !row.isEmpty ? (
                    <CellInput
                      type="number"
                      value={row.subjects[sub.code]}
                      onChange={(v) => updateSubject(idx, sub.code, v)}
                    />
                  ) : (
                    row.subjects[sub.code] ?? ""
                  )}
                </td>
              ))}
              <td style={CELL}>
                {editable && !row.isEmpty ? (
                  <CellInput
                    type="number"
                    value={row.totalMarks}
                    onChange={(v) => updateRow(idx, { totalMarks: v === "" ? null : Number(v) })}
                  />
                ) : (
                  row.totalMarks ?? ""
                )}
              </td>
              <td style={CELL}>
                {editable && !row.isEmpty ? (
                  <CellInput
                    type="number"
                    value={row.rankScore}
                    onChange={(v) => updateRow(idx, { rankScore: v === "" ? null : Number(v) })}
                  />
                ) : (
                  row.rankScore != null ? Number(row.rankScore).toFixed(2) : ""
                )}
              </td>
              <td style={CELL}>{row.grade}</td>
              <td style={CELL}>
                {editable && !row.isEmpty ? (
                  <CellInput
                    type="number"
                    value={row.percentage}
                    onChange={(v) => updateRow(idx, { percentage: v === "" ? null : Number(v) })}
                  />
                ) : (
                  row.percentage != null ? Number(row.percentage).toFixed(2) : ""
                )}
              </td>
              <td style={CELL}>
                {editable && !row.isEmpty ? (
                  <CellInput value={row.result} onChange={(v) => updateRow(idx, { result: v })} />
                ) : (
                  row.result
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx global>{`
        .board-result-input:focus {
          background: #fffde7;
          outline: 1px solid #f59e0b;
        }
        @media print {
          .board-result-list-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .board-result-input {
            border: none !important;
            outline: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
