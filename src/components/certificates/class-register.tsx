"use client";

import type { ClassRegisterRow } from "@/lib/certificates/types";
import { GUJARATI_MONTHS } from "@/lib/certificates/types";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const ROWS = 43;

/**
 * Legal portrait 8.5in × 14in (215.9 × 355.6 mm).
 * Left + right each print as one Legal sheet (joinable).
 */
const LEGAL = {
  margin: "3mm",
  w: "209.9mm",
  h: "349.6mm",
  padY: "3mm",
  padX: "3.5mm",
} as const;

/** Shared row geometry so left/right sheets line up when pages are joined. */
const ROW_H = "7.2mm";
const HDR1_H = "8mm";
const HDR2_H = "6mm";
const FOOT_H = "5.5mm";

function padRows(rows: ClassRegisterRow[]): ClassRegisterRow[] {
  const out = [...rows];
  while (out.length < ROWS) {
    const n = out.length + 1;
    out.push({
      grNumber: "",
      caste: "",
      category: "",
      dob: "",
      schoolFee: "",
      termFee: "",
      admissionFee: "",
      otherFee: "",
      totalFee: "",
      serial: n,
      name: "",
      attendance: Array(31).fill(null),
      monthTotal: "",
      prevTotal: "",
      cumulative: "",
      note: "",
    });
  }
  return out.slice(0, ROWS);
}

/**
 * Open-book Class Register:
 * Screen — left | right joined (flex) so rows line up.
 * Print — each side on its own Legal portrait sheet (joinable).
 */
export function ClassRegisterView({
  rows,
  month,
  standard,
  section,
}: {
  rows: ClassRegisterRow[];
  month: string;
  standard: string;
  section: string;
}) {
  const data = padRows(rows);
  const monthName = GUJARATI_MONTHS[parseInt(month, 10) - 1] || month;

  return (
    <div className="cr-root">
      <div className="cr-screen-label no-print">
        પાનું 1–2 — જોડેલું (ડાબું | જમણું) · Print: Legal 8.5×14 in · Portrait · જોડો ત્યારે હરોળ મેળ ખાય
      </div>

      <div className="cr-spread-join">
        {/* ── LEFT page ── */}
        <div className="cr-sheet cr-left-sheet">
          <div className="cr-page-marker no-print">1 · ડાબું</div>
          <table className="cr-tbl cr-left-tbl">
            <colgroup>
              <col className="cr-col-gr" />
              <col className="cr-col-caste" />
              <col className="cr-col-dob" />
              <col className="cr-col-fee" />
              <col className="cr-col-fee" />
              <col className="cr-col-fee" />
              <col className="cr-col-fee" />
              <col className="cr-col-fee" />
              <col className="cr-col-ser" />
              <col className="cr-col-name" />
            </colgroup>
            <thead>
              <tr className="cr-h1">
                <th rowSpan={2} className="cr-w-gr">
                  જ.ર. નં.
                </th>
                <th rowSpan={2} className="cr-w-caste">
                  જ્ઞાતિ
                </th>
                <th rowSpan={2} className="cr-w-dob">
                  જન્મ તારીખ
                </th>
                <th colSpan={5} className="cr-fee-group">
                  મળેલ ફી
                </th>
                <th rowSpan={2} className="cr-w-ser">
                  ક્ર.
                </th>
                <th rowSpan={2} className="cr-w-name">
                  વિદ્યાર્થીનું નામ
                </th>
              </tr>
              <tr className="cr-h2">
                <th className="cr-fee">શાળા</th>
                <th className="cr-fee">સત્ર</th>
                <th className="cr-fee">દાખલ</th>
                <th className="cr-fee">અન્ય</th>
                <th className="cr-fee">કુલ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={`L-${r.serial}`}>
                  <td>{r.grNumber}</td>
                  <td className="cr-c">{r.caste}</td>
                  <td>{r.dob}</td>
                  <td className="cr-c cr-fee-cell">{r.schoolFee}</td>
                  <td className="cr-c cr-fee-cell">{r.termFee}</td>
                  <td className="cr-c cr-fee-cell">{r.admissionFee}</td>
                  <td className="cr-c cr-fee-cell">{r.otherFee}</td>
                  <td className="cr-c cr-fee-cell">{r.totalFee}</td>
                  <td className="cr-c">{r.serial}</td>
                  <td className="cr-name">{r.name}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} className="cr-foot-lbl">
                  કુલ સરવાળો રૂ. ___________
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="cr-join-fold" aria-hidden />

        {/* ── RIGHT page ── */}
        <div className="cr-sheet cr-right-sheet">
          <div className="cr-page-marker no-print">2 · જમણું</div>
          <table className="cr-tbl cr-right-tbl">
            <thead>
              <tr className="cr-h1">
                <th colSpan={31 + 1 + 3 + 1} className="cr-att-hdr">
                  માહે <u>{monthName}</u>
                  {" · "}હાજરી
                  {" · "}ધોરણ <u>{standard || "—"}</u>
                  {" · "}વર્ગ <u>{section || "—"}</u>
                </th>
              </tr>
              <tr className="cr-h2">
                {DAYS.map((d) => (
                  <th key={d} className="cr-day">
                    {d}
                  </th>
                ))}
                <th className="cr-w-ser">ક્ર.</th>
                <th className="cr-w-sum">આ માસ</th>
                <th className="cr-w-sum">ગત માસ</th>
                <th className="cr-w-sum">કુલ</th>
                <th className="cr-w-note">નોંધ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={`R-${r.serial}`}>
                  {DAYS.map((d) => (
                    <td key={d} className="cr-day cr-c">
                      {r.attendance[d - 1] || ""}
                    </td>
                  ))}
                  <td className="cr-c">{r.serial}</td>
                  <td className="cr-c">{r.monthTotal}</td>
                  <td className="cr-c">{r.prevTotal}</td>
                  <td className="cr-c">{r.cumulative}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {DAYS.map((d) => (
                  <td key={d} className="cr-day cr-c">
                    {d}
                  </td>
                ))}
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .cr-root {
          --cr-row-h: ${ROW_H};
          --cr-hdr1-h: ${HDR1_H};
          --cr-hdr2-h: ${HDR2_H};
          --cr-foot-h: ${FOOT_H};
          --cr-page-w: ${LEGAL.w};
          --cr-page-h: ${LEGAL.h};
          width: 100%;
          font-family: "Noto Sans Gujarati", "Shruti", "Times New Roman", serif;
          color: #000;
          background: #fff;
        }

        .cr-screen-label {
          display: none;
        }

        .cr-page-marker {
          display: none;
        }

        .cr-spread-join {
          width: 100%;
        }

        .cr-join-fold {
          display: none;
        }

        .cr-sheet {
          width: var(--cr-page-w);
          height: var(--cr-page-h);
          max-width: 100%;
          margin: 0 auto 16px;
          background: #fff;
          box-sizing: border-box;
          padding: ${LEGAL.padY} ${LEGAL.padX};
          overflow: hidden;
        }

        .cr-tbl {
          width: 100%;
          height: calc(var(--cr-page-h) - 6mm);
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.5pt;
          line-height: 1.1;
        }

        .cr-tbl th,
        .cr-tbl td {
          border: 0.35pt solid #000;
          padding: 0 0.6mm;
          vertical-align: middle;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          height: var(--cr-row-h);
          max-height: var(--cr-row-h);
          box-sizing: border-box;
        }

        .cr-tbl thead .cr-h1 th {
          height: var(--cr-hdr1-h);
          max-height: var(--cr-hdr1-h);
          background: #f3f4f6;
          font-weight: 700;
          text-align: center;
          font-size: 8pt;
          padding: 0.6mm 0.5mm;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .cr-tbl thead .cr-h2 th {
          height: var(--cr-hdr2-h);
          max-height: var(--cr-hdr2-h);
          background: #f3f4f6;
          font-weight: 700;
          text-align: center;
          font-size: 6.5pt;
          padding: 0.4mm 0.2mm;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .cr-tbl tfoot td {
          height: var(--cr-foot-h);
          max-height: var(--cr-foot-h);
        }

        /* Legal left sheet: GR / caste / DOB readable; fees tight; name largest */
        .cr-left-tbl .cr-col-gr { width: 14mm; }
        .cr-left-tbl .cr-col-caste { width: 24mm; }
        .cr-left-tbl .cr-col-dob { width: 20mm; }
        .cr-left-tbl .cr-col-fee { width: 8mm; }
        .cr-left-tbl .cr-col-ser { width: 8mm; }
        .cr-left-tbl .cr-col-name { width: auto; }

        .cr-fee-group {
          width: 40mm !important;
          max-width: 40mm !important;
          font-size: 7.5pt !important;
          letter-spacing: 0;
          padding: 0.4mm 0 !important;
        }
        .cr-att-hdr {
          font-size: 9pt !important;
          letter-spacing: 0.02em;
        }

        .cr-c {
          text-align: center;
        }

        .cr-name {
          text-align: left;
          font-size: 8.5pt;
          padding-left: 1.2mm !important;
        }

        .cr-day {
          width: 4.6mm !important;
          min-width: 4.2mm;
          text-align: center;
          font-size: 6pt;
          padding: 0 !important;
        }

        .cr-w-gr {
          width: 14mm;
          font-size: 7.5pt;
        }
        .cr-w-caste {
          width: 24mm;
          font-size: 7pt;
        }
        .cr-w-dob {
          width: 20mm;
          font-size: 7pt;
        }
        .cr-fee,
        .cr-fee-cell {
          width: 8mm !important;
          max-width: 8mm !important;
          font-size: 5.5pt !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .cr-w-ser {
          width: 8mm;
        }
        .cr-w-name {
          width: auto !important;
        }
        .cr-w-sum {
          width: 11mm;
          font-size: 6pt !important;
        }
        .cr-w-note {
          width: 14mm;
        }

        .cr-foot-lbl {
          text-align: left;
          font-weight: 600;
          font-size: 8pt;
          padding-left: 1.5mm !important;
        }

        @media screen {
          .cr-root {
            padding: 8px 12px 24px;
            box-sizing: border-box;
            background: #e8ecf0;
            border-radius: 12px;
          }

          .cr-screen-label {
            display: block;
            text-align: center;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            margin: 0 auto 10px;
            letter-spacing: 0.02em;
          }

          .cr-page-marker {
            display: block;
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 2mm;
          }

          .cr-spread-join {
            display: flex;
            flex-direction: row;
            align-items: stretch;
            justify-content: center;
            width: max-content;
            max-width: none;
            margin: 0 auto;
            overflow-x: auto;
          }

          .cr-spread-join .cr-sheet {
            margin: 0 !important;
            max-width: none;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
            border: 1px solid #cbd5e1;
          }

          .cr-left-sheet {
            border-right: none !important;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
            padding-right: 2mm;
          }

          .cr-right-sheet {
            border-left: none !important;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            padding-left: 2mm;
          }

          .cr-join-fold {
            display: block;
            width: 2.4mm;
            min-width: 2.4mm;
            align-self: stretch;
            background: linear-gradient(
              90deg,
              #c5d8e0,
              #e8f2f6 40%,
              #e8f2f6 60%,
              #c5d8e0
            );
            box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.08);
          }
        }

        @media print {
          @page {
            size: 8.5in 14in !important;
            margin: ${LEGAL.margin} !important;
          }
          @page cr-legal {
            size: 8.5in 14in;
            margin: ${LEGAL.margin};
          }

          .cr-root,
          .cr-root * {
            visibility: visible !important;
          }

          .print-area:has(.cr-print-wrap),
          .cr-print-wrap,
          .cr-root {
            width: ${LEGAL.w} !important;
            max-width: ${LEGAL.w} !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            background: #fff !important;
          }

          .cr-spread-join {
            display: block !important;
            width: ${LEGAL.w} !important;
            max-width: ${LEGAL.w} !important;
            margin: 0 !important;
          }

          .cr-join-fold {
            display: none !important;
          }

          .cr-sheet {
            page: cr-legal;
            width: ${LEGAL.w} !important;
            height: ${LEGAL.h} !important;
            min-height: ${LEGAL.h} !important;
            max-height: ${LEGAL.h} !important;
            max-width: ${LEGAL.w} !important;
            margin: 0 !important;
            padding: ${LEGAL.padY} ${LEGAL.padX} !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .cr-left-sheet {
            padding: ${LEGAL.padY} 1.5mm ${LEGAL.padY} ${LEGAL.padX} !important;
          }

          .cr-right-sheet {
            padding: ${LEGAL.padY} ${LEGAL.padX} ${LEGAL.padY} 1.5mm !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-landscape-wide {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
