"use client";

import type { ClassRegisterRow } from "@/lib/certificates/types";
import { GUJARATI_MONTHS } from "@/lib/certificates/types";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const ROWS = 43;

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
 * Open-book Class Register: LEFT (fees/name) | RIGHT (31-day attendance)
 * as ONE table so each student is a single continuous horizontal row.
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
      <div className="cr-sheet">
        <table className="cr-tbl">
          <thead>
            <tr className="cr-h1">
              <th rowSpan={2} className="cr-w-gr">જ.ર. નં.</th>
              <th rowSpan={2} className="cr-w-caste">જ્ઞાતિ</th>
              <th rowSpan={2} className="cr-w-dob">જન્મ તારીખ</th>
              <th colSpan={5} className="cr-fee-group">મળેલ ફી</th>
              <th rowSpan={2} className="cr-w-ser">ક્ર.</th>
              <th rowSpan={2} className="cr-w-name">વિદ્યાર્થીનું નામ</th>
              <th rowSpan={2} className="cr-fold" aria-hidden />
              <th colSpan={31 + 1 + 3 + 1} className="cr-att-hdr">
                માહે <u>{monthName}</u>
                {" · "}હાજરી
                {" · "}ધોરણ <u>{standard || "—"}</u>
                {" · "}વર્ગ <u>{section || "—"}</u>
              </th>
            </tr>
            <tr className="cr-h2">
              <th className="cr-fee">શાળા</th>
              <th className="cr-fee">સત્ર</th>
              <th className="cr-fee">દાખલ</th>
              <th className="cr-fee">અન્ય</th>
              <th className="cr-fee">કુલ</th>
              {DAYS.map((d) => (
                <th key={d} className="cr-day">{d}</th>
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
              <tr key={r.serial}>
                <td>{r.grNumber}</td>
                <td className="cr-c">{r.caste}</td>
                <td>{r.dob}</td>
                <td className="cr-c">{r.schoolFee}</td>
                <td className="cr-c">{r.termFee}</td>
                <td className="cr-c">{r.admissionFee}</td>
                <td className="cr-c">{r.otherFee}</td>
                <td className="cr-c">{r.totalFee}</td>
                <td className="cr-c">{r.serial}</td>
                <td className="cr-name">{r.name}</td>
                <td className="cr-fold" aria-hidden />
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
              <td colSpan={10} className="cr-foot-lbl">
                કુલ સરવાળો રૂ. ___________
              </td>
              <td className="cr-fold" aria-hidden />
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

      <style jsx global>{`
        .cr-root {
          --cr-row-h: 3.4mm;
          --cr-hdr-h: 9mm;
          width: 100%;
          font-family: "Noto Sans Gujarati", "Shruti", "Times New Roman", serif;
          color: #000;
          background: #fff;
        }
        .cr-sheet {
          width: 297mm;
          min-height: 210mm;
          max-width: 100%;
          margin: 0 auto;
          background: #fff;
          box-sizing: border-box;
          padding: 3mm;
          overflow: hidden;
        }
        .cr-tbl {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 5.5pt;
          line-height: 1.05;
        }
        .cr-tbl th,
        .cr-tbl td {
          border: 0.35pt solid #000;
          padding: 0 0.4mm;
          vertical-align: middle;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          height: var(--cr-row-h);
          max-height: var(--cr-row-h);
        }
        .cr-tbl thead th {
          height: auto;
          max-height: none;
          background: #f3f4f6;
          font-weight: 700;
          text-align: center;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .cr-h1 th {
          font-size: 6pt;
          padding: 1mm 0.5mm;
        }
        .cr-h2 th {
          font-size: 5pt;
          padding: 0.6mm 0.2mm;
        }
        .cr-fee-group,
        .cr-att-hdr {
          font-size: 6.5pt !important;
          letter-spacing: 0.02em;
        }
        .cr-c { text-align: center; }
        .cr-name {
          text-align: left;
          font-size: 5.5pt;
          padding-left: 0.8mm !important;
        }
        .cr-fold {
          width: 2.2mm !important;
          min-width: 2.2mm;
          max-width: 2.2mm;
          padding: 0 !important;
          border-left: 1.2pt solid #000 !important;
          border-right: 1.2pt solid #000 !important;
          background: #e8e8e8 !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .cr-day {
          width: 3.6mm !important;
          min-width: 3.2mm;
          text-align: center;
          font-size: 5pt;
          padding: 0 !important;
        }
        .cr-w-gr { width: 9mm; }
        .cr-w-caste { width: 7mm; }
        .cr-w-dob { width: 12mm; }
        .cr-fee { width: 5.5mm; }
        .cr-w-ser { width: 5mm; }
        .cr-w-name { width: 28mm; }
        .cr-w-sum { width: 7mm; font-size: 4.5pt !important; }
        .cr-w-note { width: 8mm; }
        .cr-foot-lbl {
          text-align: left;
          font-weight: 600;
          font-size: 6pt;
          padding-left: 1mm !important;
        }

        @media screen {
          .cr-sheet {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            border: 1px solid #cbd5e1;
            border-radius: 2px;
            overflow-x: auto;
          }
        }

        @media print {
          @page {
            size: A4 landscape !important;
            margin: 4mm !important;
          }

          .cr-root,
          .cr-root * {
            visibility: visible !important;
          }

          .cr-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
            z-index: 99999 !important;
          }

          .cr-sheet {
            width: 289mm !important;
            min-height: 202mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
          }

          .print-landscape-wide {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
