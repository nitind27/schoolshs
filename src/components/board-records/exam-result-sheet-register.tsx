"use client";

import { Fragment } from "react";
import {
  chunkExamResultSheetPages,
  yearShortPair,
  type ExamResultSheetMeta,
  type ExamResultSheetRow,
  type ExamResultSubjectCol,
} from "@/lib/board-records/exam-result-sheet";

const FONT = '"Noto Sans Gujarati", "Noto Sans", Arial, sans-serif';

/** A4 landscape — one spread = one printed sheet (297×210mm, 4mm margin) */
const A4 = {
  pageW: "297mm",
  pageH: "210mm",
  margin: "4mm",
  contentW: "289mm",
  contentH: "202mm",
  bannerH: "9mm",
  colHdrH: "10mm",
  subHdrH: "6mm",
  /** 8 students × 4 sub-rows = 32 lines in body */
  rowH: "5.5mm",
} as const;

/** Column weight ratios (table width = 100% of A4 content) */
const COL = {
  sr: 22,
  sur: 70,
  nm: 70,
  fath: 78,
  gr: 52,
  dob: 58,
  ctr: 48,
  seat: 56,
  lab: 88,
  sub: 22,
  agg: 26,
} as const;

function colPct(weight: number, total: number) {
  return `${((weight / total) * 100).toFixed(4)}%`;
}

const MARK_LABELS: { key: "board" | "school" | "total" | "grade"; text: string }[] = [
  { key: "board", text: "Board Marks=80" },
  { key: "school", text: "School Marks=20" },
  { key: "total", text: "Total Marks=100" },
  { key: "grade", text: "Subject Grade=" },
];

function SidBoxes({ digits }: { digits: string }) {
  const chars = digits.replace(/\D/g, "").padEnd(11, " ").slice(0, 11).split("");
  const groups = [chars.slice(0, 3), chars.slice(3, 6), chars.slice(6, 11)];
  return (
    <span className="ers3-sidboxes">
      {groups.map((g, gi) => (
        <span key={gi} className="ers3-sid-g">
          {gi > 0 ? <span className="ers3-sid-d">-</span> : null}
          {g.map((ch, i) => (
            <span key={i} className="ers3-sid-box">
              {ch.trim()}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

function Val({ v }: { v: string | number | null | undefined }) {
  if (v == null || v === "") return <span>&nbsp;</span>;
  return <>{v}</>;
}

function subjectCell(r: ExamResultSheetRow, key: string, kind: "board" | "school" | "total" | "grade") {
  if (r.isEmpty) return null;
  const d = r.subjects[key];
  if (!d) return null;
  if (kind === "board") return d.board;
  if (kind === "school") return d.school;
  if (kind === "total") return d.total;
  return d.grade;
}

/** One connected register spread — single table so borders align left↔right */
function SpreadTable({
  rows,
  cols,
  meta,
  yearPair,
}: {
  rows: ExamResultSheetRow[];
  cols: ExamResultSubjectCol[];
  meta: ExamResultSheetMeta;
  yearPair: { a: string; b: string };
}) {
  const stdLabel =
    meta.standard === "12"
      ? `Std. : 12 (H.S.C.)${meta.stream ? ` ${meta.stream}` : ""}`
      : "Std. : 10 (S.S.C.)";

  const rightColCount = 1 + cols.length + 4; // label + subjects + 4 aggregates
  const tableWeight =
    COL.sr +
    COL.sur +
    COL.nm +
    COL.fath +
    COL.gr +
    COL.dob +
    COL.ctr +
    COL.seat +
    COL.lab +
    cols.length * COL.sub +
    4 * COL.agg;

  return (
    <table className="ers3-tbl">
      <colgroup>
        <col style={{ width: colPct(COL.sr, tableWeight) }} />
        <col style={{ width: colPct(COL.sur, tableWeight) }} />
        <col style={{ width: colPct(COL.nm, tableWeight) }} />
        <col style={{ width: colPct(COL.fath, tableWeight) }} />
        <col style={{ width: colPct(COL.gr, tableWeight) }} />
        <col style={{ width: colPct(COL.dob, tableWeight) }} />
        <col style={{ width: colPct(COL.ctr, tableWeight) }} />
        <col style={{ width: colPct(COL.seat, tableWeight) }} />
        <col style={{ width: colPct(COL.lab, tableWeight) }} />
        {cols.map((c) => (
          <col key={c.key} style={{ width: colPct(COL.sub, tableWeight) }} />
        ))}
        <col style={{ width: colPct(COL.agg, tableWeight) }} />
        <col style={{ width: colPct(COL.agg, tableWeight) }} />
        <col style={{ width: colPct(COL.agg, tableWeight) }} />
        <col style={{ width: colPct(COL.agg, tableWeight) }} />
      </colgroup>
      {/* Banner — full width, one line across both pages */}
      <thead>
        <tr className="ers3-banner">
          <th colSpan={8} className="ers3-ban-l">
            <div className="ers3-ban-inner">
              <div className="ers3-ban-lft">
                <span className="ers3-std">{stdLabel}</span>
                <span className="ers3-year">
                  YEAR : 20<span className="ers3-ybox">{yearPair.a || "\u00a0\u00a0"}</span>
                  -20
                  <span className="ers3-ybox">{yearPair.b || "\u00a0\u00a0"}</span>
                </span>
              </div>
              <div className="ers3-ban-mid">
                Gujarat Secondary &amp; Higher Secondary Education Board
              </div>
              <div className="ers3-ban-rgt">March / July</div>
            </div>
          </th>
          <th colSpan={rightColCount} className="ers3-ban-r">
            <div className="ers3-ban-inner ers3-ban-inner-r">
              <div>
                <div className="ers3-rt-gu">શિક્ષણ બોર્ડ પરીક્ષાનું પરિણામ પત્રક</div>
                <div className="ers3-rt-en">Education Board Exam. Result Sheet · માર્ચ / જુલાઈ</div>
              </div>
              <table className="ers3-sum">
                <tbody>
                  <tr>
                    <td>Board %</td>
                    <td>{meta.boardPct || ""}</td>
                  </tr>
                  <tr>
                    <td>Center %</td>
                    <td>{meta.centerPct || ""}</td>
                  </tr>
                  <tr>
                    <td>School %</td>
                    <td>{meta.schoolPct || ""}</td>
                  </tr>
                  <tr>
                    <td>School Grade</td>
                    <td>{meta.schoolGrade || ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </th>
        </tr>

        {/* Column headers — one continuous row */}
        <tr className="ers3-colhd">
          <th rowSpan={2} className="ers3-th ers3-sr">
            નં.
            <br />
            Sr.
          </th>
          <th colSpan={3} className="ers3-th">
            વિદ્યાર્થીનું નામ તથા સરનામું
            <br />
            Student&apos;s Name &amp; Address
          </th>
          <th rowSpan={2} className="ers3-th">
            જનરલ રજીસ્ટર
            <br />
            G. R. No.
          </th>
          <th rowSpan={2} className="ers3-th">
            જન્મ તારીખ
            <br />
            Date of Birth
          </th>
          <th rowSpan={2} className="ers3-th">
            પરીક્ષા કેન્દ્ર
            <br />
            Exam Center
          </th>
          <th rowSpan={2} className="ers3-th ers3-join">
            બેઠક નં.
            <br />
            Seat No.
          </th>
          <th rowSpan={2} className="ers3-th ers3-labhd">
            મેળવેલ ગુણ
            <br />
            Obtained Marks
          </th>
          {cols.map((c) => (
            <th key={c.key} rowSpan={2} className="ers3-th ers3-sub">
              <div className="ers3-v">
                {c.labelEn ? `${c.labelEn}${c.boardCode ? ` (${c.boardCode})` : " (  )"}` : "(  )"}
              </div>
            </th>
          ))}
          <th rowSpan={2} className="ers3-th ers3-agg">
            <div className="ers3-v">કુલ ગુણ / Total</div>
          </th>
          <th rowSpan={2} className="ers3-th ers3-agg">
            <div className="ers3-v">પરિણામ % / Result</div>
          </th>
          <th rowSpan={2} className="ers3-th ers3-agg">
            <div className="ers3-v">પર્સન્ટાઈલ</div>
          </th>
          <th rowSpan={2} className="ers3-th ers3-agg">
            <div className="ers3-v">ગ્રેડ / Rank</div>
          </th>
        </tr>
        <tr className="ers3-subhd">
          <th className="ers3-th">અટક / Surname</th>
          <th className="ers3-th">નામ / Name</th>
          <th className="ers3-th">પિતા / Father</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((r) => (
          <Fragment key={r.id}>
            {/* —— Row 1 of 4 —— continuous line across page join */}
            <tr className="ers3-r ers3-r1">
              <td rowSpan={4} className="ers3-td ers3-c ers3-sr">
                {r.isEmpty ? "" : r.serial}
              </td>
              <td className="ers3-td ers3-nm">{r.surname}</td>
              <td className="ers3-td ers3-nm">{r.firstName}</td>
              <td className="ers3-td ers3-nm">{r.fatherName}</td>
              <td className="ers3-td ers3-c">{r.grNumber}</td>
              <td className="ers3-td ers3-c ers3-sm">{r.dateOfBirth}</td>
              <td className="ers3-td ers3-c ers3-sm">
                {r.examCenter || (!r.isEmpty ? meta.examCenter : "")}
              </td>
              <td className="ers3-td ers3-c ers3-join">{r.seatDisplay}</td>
              <td className="ers3-td ers3-lab">{MARK_LABELS[0].text}</td>
              {cols.map((c) => (
                <td key={c.key} className="ers3-td ers3-c ers3-mk">
                  <Val v={subjectCell(r, c.key, "board")} />
                </td>
              ))}
              <td rowSpan={4} className="ers3-td ers3-c ers3-ag">
                <Val v={r.isEmpty ? null : r.totalMarks} />
              </td>
              <td rowSpan={4} className="ers3-td ers3-c ers3-ag ers3-pct">
                <Val v={r.isEmpty ? null : r.resultAndPct} />
              </td>
              <td rowSpan={4} className="ers3-td ers3-c ers3-ag">
                <Val
                  v={
                    r.isEmpty || r.percentile == null
                      ? null
                      : Number(r.percentile).toFixed(2)
                  }
                />
              </td>
              <td rowSpan={4} className="ers3-td ers3-c ers3-ag">
                <Val v={r.isEmpty ? null : r.gradeRank} />
              </td>
            </tr>
            {/* —— Row 2 —— */}
            <tr className="ers3-r ers3-r2">
              <td colSpan={3} className="ers3-td ers3-addr">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td ers3-join">&nbsp;</td>
              <td className="ers3-td ers3-lab">{MARK_LABELS[1].text}</td>
              {cols.map((c) => (
                <td key={c.key} className="ers3-td ers3-c ers3-mk">
                  <Val v={subjectCell(r, c.key, "school")} />
                </td>
              ))}
            </tr>
            {/* —— Row 3 —— */}
            <tr className="ers3-r ers3-r3">
              <td colSpan={3} className="ers3-td ers3-addr">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td">&nbsp;</td>
              <td className="ers3-td ers3-join">&nbsp;</td>
              <td className="ers3-td ers3-lab">{MARK_LABELS[2].text}</td>
              {cols.map((c) => (
                <td key={c.key} className="ers3-td ers3-c ers3-mk">
                  <Val v={subjectCell(r, c.key, "total")} />
                </td>
              ))}
            </tr>
            {/* —— Row 4 — મો. + SID | Subject Grade —— */}
            <tr className="ers3-r ers3-r4">
              <td colSpan={3} className="ers3-td ers3-addr4">
                {!r.isEmpty && (
                  <div className="ers3-addrw">
                    <span className="ers3-addrt">{r.address || "\u00a0"}</span>
                    <span className="ers3-mo">
                      <b>મો.</b> {r.mobile || ""}
                    </span>
                  </div>
                )}
              </td>
              <td colSpan={4} className="ers3-td ers3-sid ers3-join">
                {!r.isEmpty && (
                  <div className="ers3-sidw">
                    <b>SID No. :</b>
                    <SidBoxes digits={r.sidDigits} />
                  </div>
                )}
              </td>
              <td className="ers3-td ers3-lab">{MARK_LABELS[3].text}</td>
              {cols.map((c) => (
                <td key={c.key} className="ers3-td ers3-c ers3-mk">
                  <Val v={subjectCell(r, c.key, "grade")} />
                </td>
              ))}
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

export function ExamResultSheetRegister({
  rows,
  subjects,
  meta,
}: {
  rows: ExamResultSheetRow[];
  subjects: ExamResultSubjectCol[];
  meta: ExamResultSheetMeta;
}) {
  const pages = chunkExamResultSheetPages(rows, subjects);
  const yearPair = yearShortPair(meta.academicYear);

  return (
    <div className="ers3-root">
      <div className="ers3-scroll">
        <div className="ers3-a4-stack">
          {pages.map((pageRows, pi) => (
            <div key={pi} className="ers3-spread">
              <SpreadTable rows={pageRows} cols={subjects} meta={meta} yearPair={yearPair} />
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .ers3-root {
          font-family: ${FONT};
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .ers3-scroll {
          width: 100%;
          overflow-x: auto;
          padding: 8px 0;
        }
        .ers3-a4-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }
        .ers3-spread {
          width: ${A4.contentW};
          height: ${A4.contentH};
          box-sizing: border-box;
          margin: 0;
          border: 1.5px solid #000;
          background: #fff;
          overflow: hidden;
          flex-shrink: 0;
          page-break-after: always;
          break-after: page;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        }
        .ers3-spread:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .ers3-tbl {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 6pt;
          border: none;
        }
        .ers3-tbl th,
        .ers3-tbl td {
          border: 1px solid #000;
          box-sizing: border-box;
          padding: 0 2px;
          vertical-align: middle;
          overflow: hidden;
        }

        /* Top banner — left + right titles share one horizontal border */
        .ers3-banner th {
          border-bottom: 1.5px solid #000;
          height: ${A4.bannerH};
          max-height: ${A4.bannerH};
          background: #fff;
          font-weight: 700;
          padding: 1px 3px !important;
          vertical-align: middle;
        }
        .ers3-ban-l {
          border-right: 2.5px solid #000 !important;
          width: 46%;
        }
        .ers3-ban-r {
          width: 54%;
        }
        .ers3-ban-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }
        .ers3-ban-inner-r {
          align-items: flex-start;
        }
        .ers3-ban-lft {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }
        .ers3-std {
          font-size: 6.5pt;
          font-weight: 800;
        }
        .ers3-year {
          border: 1px solid #000;
          padding: 0 4px;
          font-size: 6.5pt;
          display: inline-block;
          width: fit-content;
        }
        .ers3-ybox {
          display: inline-block;
          min-width: 1.3em;
          border-bottom: 1px solid #000;
          text-align: center;
          margin: 0 1px;
        }
        .ers3-ban-mid {
          font-size: 6.5pt;
          font-weight: 800;
          text-align: center;
          flex: 1;
        }
        .ers3-ban-rgt {
          font-size: 6.5pt;
          font-weight: 700;
          white-space: nowrap;
        }
        .ers3-rt-gu {
          font-size: 7.5pt;
          font-weight: 800;
          line-height: 1.1;
        }
        .ers3-rt-en {
          font-size: 5.5pt;
          font-weight: 700;
        }
        .ers3-sum {
          border-collapse: collapse;
          font-size: 5pt;
          min-width: 28mm;
        }
        .ers3-sum td {
          border: 1px solid #000;
          padding: 0 2px !important;
          height: 3mm;
        }
        .ers3-sum td:first-child {
          font-weight: 700;
          background: #e8e8e8;
          white-space: nowrap;
        }
        .ers3-sum td:last-child {
          min-width: 8mm;
          text-align: center;
          font-weight: 700;
        }

        /* Column headers */
        .ers3-th {
          background: #5a5a5a;
          color: #fff;
          font-weight: 700;
          text-align: center;
          font-size: 5.5pt;
          line-height: 1.1;
          padding: 1px !important;
        }
        .ers3-colhd .ers3-th {
          height: ${A4.colHdrH};
          max-height: ${A4.colHdrH};
        }
        .ers3-subhd .ers3-th {
          height: ${A4.subHdrH};
          max-height: ${A4.subHdrH};
          font-size: 5pt;
        }
        .ers3-labhd {
          padding: 1px 2px !important;
          white-space: normal;
          line-height: 1.1;
          font-size: 5pt;
          border-left: none !important;
          overflow: hidden;
        }
        .ers3-sub {
          padding: 0 !important;
          overflow: hidden;
        }
        .ers3-agg {
          padding: 0 !important;
          overflow: hidden;
        }
        .ers3-v {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          height: calc(${A4.colHdrH} + ${A4.subHdrH} - 2mm);
          margin: 0 auto;
          font-size: 5.5pt;
          font-weight: 700;
        }

        /* Page-join accent (Seat No. | Obtained Marks) — continuous vertical fold */
        .ers3-join {
          border-right: 2.5px solid #000 !important;
        }

        /* Body rows — fixed mm height so left+right share exact lines */
        .ers3-r > td {
          height: ${A4.rowH};
          max-height: ${A4.rowH};
        }
        .ers3-r1 > td {
          border-top: 1.5px solid #000;
        }
        .ers3-r4 > td {
          border-bottom: 1.5px solid #000;
        }
        .ers3-td {
          font-size: 6pt;
        }
        .ers3-c {
          text-align: center;
        }
        .ers3-sm {
          font-size: 5.5pt;
        }
        .ers3-nm {
          text-align: left !important;
          font-weight: 700;
          font-size: 6.5pt;
          padding-left: 2px !important;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .ers3-addr {
          padding: 0 !important;
        }
        .ers3-addr4 {
          padding: 0 !important;
        }
        .ers3-addrw {
          display: flex;
          height: ${A4.rowH};
          align-items: stretch;
        }
        .ers3-addrt {
          flex: 1;
          padding: 0 2px;
          font-size: 5.5pt;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          line-height: ${A4.rowH};
        }
        .ers3-mo {
          flex: 0 0 auto;
          min-width: 18mm;
          border-left: 1px solid #000;
          padding: 0 2px;
          font-size: 5.5pt;
          display: flex;
          align-items: center;
          gap: 1px;
          white-space: nowrap;
        }
        .ers3-sid {
          background: #d4d4d4 !important;
          padding: 0 4px !important;
        }
        .ers3-sidw {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 5.5pt;
          white-space: nowrap;
          height: ${A4.rowH};
        }
        .ers3-sidboxes {
          display: inline-flex;
          align-items: center;
        }
        .ers3-sid-g {
          display: inline-flex;
          align-items: center;
        }
        .ers3-sid-d {
          margin: 0 2px;
          font-weight: 800;
        }
        .ers3-sid-box {
          width: 2.5mm;
          height: 3mm;
          border: 1px solid #000;
          margin-left: -1px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 5.5pt;
          font-weight: 700;
          background: #fff;
          line-height: 1;
        }
        .ers3-lab {
          text-align: left !important;
          font-weight: 700;
          font-size: 4.5pt;
          white-space: nowrap;
          background: #f7f7f7 !important;
          padding: 0 1px !important;
          overflow: hidden;
          box-sizing: border-box;
        }
        .ers3-mk {
          font-weight: 700;
          font-size: 5.5pt;
          padding: 0 !important;
          overflow: hidden;
          box-sizing: border-box;
        }
        .ers3-ag {
          font-weight: 700;
          font-size: 5.5pt;
          overflow: hidden;
          word-break: break-word;
          box-sizing: border-box;
        }
        .ers3-pct {
          font-size: 5pt;
          line-height: 1.1;
          word-break: break-word;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: ${A4.margin};
          }
          .ers3-root,
          .ers3-root * {
            visibility: visible !important;
          }
          .ers3-scroll {
            overflow: visible !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .ers3-a4-stack {
            gap: 0 !important;
            align-items: stretch !important;
          }
          .ers3-spread {
            width: ${A4.contentW} !important;
            height: ${A4.contentH} !important;
            max-width: ${A4.contentW} !important;
            max-height: ${A4.contentH} !important;
            margin: 0 !important;
            border-width: 1px;
            box-shadow: none !important;
            page-break-inside: avoid;
            page-break-after: always;
            break-after: page;
            overflow: hidden !important;
          }
          .ers3-spread:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .ers3-tbl {
            width: 100% !important;
            height: 100% !important;
          }
          .ers3-r > td {
            height: ${A4.rowH} !important;
            max-height: ${A4.rowH} !important;
          }
          .ers3-sid {
            background: #d4d4d4 !important;
          }
          .ers3-th {
            background: #5a5a5a !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
