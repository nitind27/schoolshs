"use client";

import {
  computeAvgPercent,
  computeRowTotal,
  DAILY_ATTENDANCE_ROWS,
  sumGrandTotals,
  type DailyAttendanceBookMeta,
  type DailyAttendanceBookRow,
  type GenderCounts,
} from "@/lib/certificates/daily-attendance-book";

/** A4 portrait — one sheet = one printed page (fits inside 5mm @page margins) */
const A4 = {
  pageW: "210mm",
  pageH: "297mm",
  margin: "5mm",
  contentW: "200mm",
  /** Must stay ≤ 297mm − 2×5mm (= 287mm). Use 284mm slack so footer never spills. */
  contentH: "284mm",
  metaH: "13.5mm",
  hdr1H: "6.5mm",
  hdr2H: "4.2mm",
  rowH: "6.55mm",
  totH: "5.5mm",
  footH: "13mm",
} as const;

function BG({ v }: { v: number | string }) {
  return <span className="dab-num">{v === 0 || v === "" ? "\u00a0" : v}</span>;
}

function EditableBG({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly || !onChange) return <BG v={value} />;
  return (
    <input
      type="number"
      min={0}
      className="dab-inp"
      value={value || ""}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
    />
  );
}

function PairCells({
  counts,
  onChange,
  readOnly,
}: {
  counts: GenderCounts;
  onChange?: (c: GenderCounts) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      <td className="dab-c">
        <EditableBG
          value={counts.boys}
          readOnly={readOnly}
          onChange={onChange ? (n) => onChange({ ...counts, boys: n }) : undefined}
        />
      </td>
      <td className="dab-c">
        <EditableBG
          value={counts.girls}
          readOnly={readOnly}
          onChange={onChange ? (n) => onChange({ ...counts, girls: n }) : undefined}
        />
      </td>
    </>
  );
}

function updateRow(row: DailyAttendanceBookRow, patch: Partial<DailyAttendanceBookRow>): DailyAttendanceBookRow {
  const next = { ...row, ...patch };
  if (patch.present || patch.absent) {
    next.total = {
      boys: next.present.boys + next.absent.boys,
      girls: next.present.girls + next.absent.girls,
    };
  }
  next.rowTotal = computeRowTotal(next);
  return next;
}

export function DailyAttendanceBookView({
  meta,
  rows,
  editable = false,
  onChange,
  onMetaChange,
}: {
  meta: DailyAttendanceBookMeta;
  rows: DailyAttendanceBookRow[];
  editable?: boolean;
  onChange?: (rows: DailyAttendanceBookRow[]) => void;
  onMetaChange?: (meta: DailyAttendanceBookMeta) => void;
}) {
  const displayRows = rows.slice(0, DAILY_ATTENDANCE_ROWS);
  while (displayRows.length < DAILY_ATTENDANCE_ROWS) {
    displayRows.push({
      serial: displayRows.length + 1,
      classId: null,
      standard: "",
      section: "",
      stream: "",
      isEmpty: true,
      present: { boys: 0, girls: 0 },
      absent: { boys: 0, girls: 0 },
      total: { boys: 0, girls: 0 },
      newAdmission: { boys: 0, girls: 0 },
      leftSchool: { boys: 0, girls: 0 },
      rowTotal: 0,
      teacherSign: "",
    });
  }
  const totals = sumGrandTotals(displayRows.filter((r) => !r.isEmpty));
  const avgPct = meta.avgPercent ?? computeAvgPercent(totals);

  const patchRow = (idx: number, patch: Partial<DailyAttendanceBookRow>) => {
    if (!onChange) return;
    const next = displayRows.map((r, i) => (i === idx ? updateRow(r, patch) : r));
    onChange(next);
  };

  const [dd, mm, yy] = meta.dateDisplay.split("/");

  return (
    <div className="dab-root dab-print">
      <div className="dab-paper">
        <div className="dab-sheet">
          {/* Header — gray bar + dark pill overlay (centered, clear side space) */}
          <div className="dab-banner">
            <div className="dab-ban-bar">
              <div className="dab-ban-l">
                <div className="dab-ban-line">
                  <span className="dab-ban-lbl">તારીખ/Date :</span>
                  <span className="dab-ban-date">
                    <span className="dab-uline dab-uline-sm">{dd || ""}</span>
                    <span>/</span>
                    <span className="dab-uline dab-uline-sm">{mm || ""}</span>
                    <span>/</span>
                    <span>20</span>
                    <span className="dab-uline dab-uline-sm">{yy?.slice(-2) || ""}</span>
                  </span>
                </div>
                <div className="dab-ban-line">
                  <span className="dab-ban-lbl">વાર/Day :</span>
                  <span className="dab-uline dab-uline-grow">{meta.dayOfWeekGu || meta.dayOfWeek || ""}</span>
                </div>
              </div>

              <div className="dab-ban-gap" aria-hidden />

              <div className="dab-ban-r">
                <div className="dab-ban-line">
                  <span className="dab-ban-lbl">કાર્યદિવસ/ Working Day :</span>
                  {editable && onMetaChange ? (
                    <input
                      type="number"
                      min={0}
                      className="dab-inp dab-inp-uline"
                      value={meta.workingDay ?? ""}
                      onChange={(e) =>
                        onMetaChange({
                          ...meta,
                          workingDay: parseInt(e.target.value, 10) || null,
                          grandTotals: meta.grandTotals,
                        })
                      }
                    />
                  ) : (
                    <span className="dab-uline dab-uline-grow">{meta.workingDay ?? ""}</span>
                  )}
                </div>
                <div className="dab-ban-line">
                  <span className="dab-ban-lbl">પાળી/ Shift :</span>
                  {editable && onMetaChange ? (
                    <input
                      className="dab-inp dab-inp-uline dab-inp-txt"
                      value={meta.shift}
                      onChange={(e) =>
                        onMetaChange({ ...meta, shift: e.target.value, grandTotals: meta.grandTotals })
                      }
                    />
                  ) : (
                    <span className="dab-uline dab-uline-grow">{meta.shift || ""}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="dab-ban-c">
              <div className="dab-title-gu">દૈનિક હાજરી નોંધ</div>
              <div className="dab-title-en">Daily Attendance Book</div>
            </div>
          </div>

          <table className="dab-tbl">
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "5.5%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr className="dab-h1">
                <th colSpan={2} className="dab-th">
                  શ્રેણી
                  <br />
                  Std.
                </th>
                <th colSpan={2} className="dab-th">
                  હાજર
                  <br />
                  Present
                </th>
                <th colSpan={2} className="dab-th">
                  ગેરહાજર
                  <br />
                  Absent
                </th>
                <th colSpan={2} className="dab-th">
                  કુલ
                  <br />
                  Total
                </th>
                <th colSpan={2} className="dab-th">
                  નવા દાખલ
                  <br />
                  New Adm.
                </th>
                <th colSpan={2} className="dab-th">
                  શાળા છોડી
                  <br />
                  Left
                </th>
                <th rowSpan={2} className="dab-th dab-th-tot">
                  કુલ
                  <br />
                  Total
                </th>
                <th rowSpan={2} className="dab-th dab-th-sign">
                  શિક્ષકની સહી
                  <br />
                  Tr. Sign
                </th>
              </tr>
              <tr className="dab-h2">
                <th className="dab-th">Std.</th>
                <th className="dab-th">Class</th>
                <th className="dab-th">Boys</th>
                <th className="dab-th">Girls</th>
                <th className="dab-th">Boys</th>
                <th className="dab-th">Girls</th>
                <th className="dab-th">Boys</th>
                <th className="dab-th">Girls</th>
                <th className="dab-th">Boys</th>
                <th className="dab-th">Girls</th>
                <th className="dab-th">Boys</th>
                <th className="dab-th">Girls</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, idx) => (
                <tr key={idx} className="dab-r">
                  <td className="dab-c dab-std">{r.standard}</td>
                  <td className="dab-c dab-cls">{r.section}</td>
                  <PairCells
                    counts={r.present}
                    readOnly={!editable || r.isEmpty}
                    onChange={(c) =>
                      patchRow(idx, {
                        present: c,
                        total: { boys: c.boys + r.absent.boys, girls: c.girls + r.absent.girls },
                      })
                    }
                  />
                  <PairCells
                    counts={r.absent}
                    readOnly={!editable || r.isEmpty}
                    onChange={(c) =>
                      patchRow(idx, {
                        absent: c,
                        total: { boys: r.present.boys + c.boys, girls: r.present.girls + c.girls },
                      })
                    }
                  />
                  <PairCells counts={r.total} readOnly />
                  <PairCells
                    counts={r.newAdmission}
                    readOnly={!editable || r.isEmpty}
                    onChange={(c) => patchRow(idx, { newAdmission: c })}
                  />
                  <PairCells
                    counts={r.leftSchool}
                    readOnly={!editable || r.isEmpty}
                    onChange={(c) => patchRow(idx, { leftSchool: c })}
                  />
                  <td className="dab-c dab-rowtot">
                    <BG v={r.isEmpty ? "" : r.rowTotal || computeRowTotal(r)} />
                  </td>
                  {/* Blank for manual signature on paper */}
                  <td className="dab-sign">&nbsp;</td>
                </tr>
              ))}
              <tr className="dab-totrow">
                <td colSpan={2} className="dab-totlbl">
                  કુલ Total
                </td>
                <td className="dab-c">
                  <BG v={totals.present.boys} />
                </td>
                <td className="dab-c">
                  <BG v={totals.present.girls} />
                </td>
                <td className="dab-c">
                  <BG v={totals.absent.boys} />
                </td>
                <td className="dab-c">
                  <BG v={totals.absent.girls} />
                </td>
                <td className="dab-c">
                  <BG v={totals.total.boys} />
                </td>
                <td className="dab-c">
                  <BG v={totals.total.girls} />
                </td>
                <td className="dab-c">
                  <BG v={totals.newAdmission.boys} />
                </td>
                <td className="dab-c">
                  <BG v={totals.newAdmission.girls} />
                </td>
                <td className="dab-c">
                  <BG v={totals.leftSchool.boys} />
                </td>
                <td className="dab-c">
                  <BG v={totals.leftSchool.girls} />
                </td>
                <td className="dab-c dab-rowtot">
                  <BG v={totals.rowTotal} />
                </td>
                <td className="dab-sign">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          <div className="dab-foot">
            <div className="dab-avg">
              <div className="dab-avg-lbl">
                સરાસરી ટકા.
                <br />
                Ave. Per (%)
              </div>
              <div className="dab-avg-form">
                <span>(Present × 100) / Total =</span>
                <span className="dab-avg-val">{avgPct != null ? avgPct.toFixed(1) : ""}</span>
                <span>%</span>
              </div>
            </div>
            <div className="dab-prin">
              <div className="dab-prin-line" />
              <div className="dab-prin-lbl">Principal sign. / આચાર્યની સહી</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dab-root {
          font-family: "Noto Sans Gujarati", "Noto Sans", Arial, sans-serif;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .dab-paper {
          width: ${A4.pageW};
          margin: 0 auto;
          background: #f1f5f9;
          padding: ${A4.margin};
          box-sizing: border-box;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }
        .dab-sheet {
          width: ${A4.contentW};
          height: ${A4.contentH};
          box-sizing: border-box;
          border: 1.5px solid #000;
          background: #fff;
          padding: 1.5mm;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .dab-banner {
          position: relative;
          height: ${A4.metaH};
          flex-shrink: 0;
          margin-bottom: 1.5mm;
          border: 1.6px solid #000;
          background: #e4e4e4;
          box-sizing: border-box;
          overflow: visible;
        }
        .dab-ban-bar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 58mm minmax(0, 1fr);
          align-items: center;
          height: 100%;
          width: 100%;
        }
        .dab-ban-gap {
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .dab-ban-l,
        .dab-ban-r {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.4mm;
          min-width: 0;
          font-size: 6.5pt;
          font-weight: 600;
          color: #111;
          z-index: 1;
        }
        .dab-ban-l {
          padding: 1.2mm 2.5mm 1.2mm 2.8mm;
        }
        .dab-ban-r {
          padding: 1.2mm 2.8mm 1.2mm 2.5mm;
        }
        .dab-ban-c {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 56mm;
          height: calc(100% - 1.4mm);
          padding: 0 5mm;
          background: #2a2a2a;
          color: #fff;
          border-radius: 999px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 3;
          box-sizing: border-box;
          border: 1px solid #111;
          box-shadow: 0 0 0 0.4mm #e4e4e4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          pointer-events: none;
        }
        .dab-title-gu {
          font-size: 8.5pt;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .dab-title-en {
          font-size: 6pt;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
        }
        .dab-ban-line {
          display: flex;
          align-items: baseline;
          gap: 1.2mm;
          width: 100%;
          line-height: 1.25;
          min-width: 0;
        }
        .dab-ban-lbl {
          flex-shrink: 0;
          white-space: nowrap;
        }
        .dab-ban-date {
          display: inline-flex;
          align-items: baseline;
          gap: 0.5mm;
          flex: 1;
          min-width: 0;
        }
        .dab-uline {
          display: inline-block;
          border-bottom: 1px solid #222;
          min-height: 1.15em;
          line-height: 1.15;
          padding: 0 1px;
          text-align: center;
          font-weight: 700;
        }
        .dab-uline-sm {
          min-width: 4.5mm;
        }
        .dab-uline-grow {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
          padding-left: 1mm;
        }
        .dab-inp-uline {
          flex: 1;
          min-width: 8mm;
          max-width: 100%;
          height: auto !important;
          border: none !important;
          border-bottom: 1px solid #222 !important;
          background: transparent !important;
          border-radius: 0;
          padding: 0 1px !important;
          font-size: 6.5pt;
          font-weight: 700;
        }
        .dab-tbl {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 6pt;
          flex: 1 1 auto;
          min-height: 0;
        }
        .dab-tbl th,
        .dab-tbl td {
          border: 1px solid #000;
          padding: 0;
          vertical-align: middle;
          text-align: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        .dab-th {
          background: #555;
          color: #fff;
          font-weight: 700;
          font-size: 5.5pt;
          line-height: 1.1;
          padding: 0.3mm 0 !important;
        }
        .dab-h1 .dab-th {
          height: ${A4.hdr1H};
        }
        .dab-h2 .dab-th {
          background: #666;
          height: ${A4.hdr2H};
          font-size: 5pt;
        }
        .dab-std,
        .dab-cls {
          font-weight: 700;
        }
        .dab-r > td {
          height: ${A4.rowH};
          max-height: ${A4.rowH};
        }
        .dab-rowtot {
          font-weight: 800;
        }
        .dab-sign {
          padding: 0 !important;
          background: #fff;
        }
        .dab-num {
          display: block;
          font-weight: 700;
          font-size: 6.5pt;
          line-height: 1;
        }
        .dab-inp {
          width: 100%;
          border: none;
          background: #fffbeb;
          text-align: center;
          font-size: 6.5pt;
          font-weight: 700;
          padding: 0;
          height: 100%;
          -moz-appearance: textfield;
        }
        .dab-inp::-webkit-outer-spin-button,
        .dab-inp::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .dab-inp-sm {
          width: 2.8em;
          display: inline-block;
          border-bottom: 1px solid #000;
          height: auto;
          background: #fffbeb;
        }
        .dab-inp-txt {
          background: transparent !important;
          text-align: left;
          width: auto;
          min-width: 12mm;
        }
        .dab-totrow td {
          height: ${A4.totH};
          font-weight: 800;
          background: #eee;
        }
        .dab-totlbl {
          text-align: center !important;
          font-weight: 800;
          font-size: 6.5pt;
          background: #ccc !important;
        }
        .dab-foot {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          margin-top: 1.5mm;
          gap: 3mm;
          height: ${A4.footH};
          flex-shrink: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .dab-avg {
          flex: 1;
          border: 1.5px solid #000;
          display: flex;
          overflow: hidden;
        }
        .dab-avg-lbl {
          background: #555;
          color: #fff;
          font-weight: 700;
          font-size: 5.5pt;
          padding: 1mm 2mm;
          text-align: center;
          line-height: 1.15;
          width: 22mm;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dab-avg-form {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2mm;
          font-size: 6.5pt;
          font-weight: 700;
          padding: 1mm;
        }
        .dab-avg-val {
          border: 1.5px solid #000;
          min-width: 14mm;
          min-height: 8mm;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9pt;
          padding: 0 2mm;
        }
        .dab-prin {
          width: 52mm;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .dab-prin-line {
          border-bottom: 1px solid #000;
          flex: 1;
          min-height: 8mm;
          margin-bottom: 1mm;
        }
        .dab-prin-lbl {
          font-size: 6pt;
          font-weight: 700;
        }

        @media print {
          @page dab-a4 {
            size: A4 portrait;
            margin: 5mm;
          }
          .dab-root {
            page: dab-a4;
          }
          .dab-root,
          .dab-root * {
            visibility: visible !important;
          }
          .dab-paper {
            width: ${A4.contentW} !important;
            height: ${A4.contentH} !important;
            max-height: ${A4.contentH} !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .dab-sheet {
            width: ${A4.contentW} !important;
            height: ${A4.contentH} !important;
            max-height: ${A4.contentH} !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            padding: 1.2mm !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .dab-foot {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .dab-inp {
            background: transparent !important;
            border: none !important;
            -webkit-appearance: none;
          }
          .dab-inp-uline {
            border: none !important;
            border-bottom: 1px solid #222 !important;
            background: transparent !important;
          }
          .dab-banner {
            background: #e0e0e0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dab-ban-l,
          .dab-ban-r {
            background: #e4e4e4 !important;
          }
          .dab-ban-c {
            background: #2c2c2c !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dab-th,
          .dab-avg-lbl {
            background: #555 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dab-h2 .dab-th {
            background: #666 !important;
          }
          .dab-totrow td {
            background: #eee !important;
          }
          .dab-totlbl {
            background: #ccc !important;
          }
          .dab-r > td {
            height: ${A4.rowH} !important;
            max-height: ${A4.rowH} !important;
          }
        }
      `}</style>
    </div>
  );
}
