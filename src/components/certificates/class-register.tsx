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
      grNumber: "", caste: "", dob: "", schoolFee: "", termFee: "", admissionFee: "", otherFee: "", totalFee: "",
      serial: n, name: "", attendance: Array(31).fill(null), monthTotal: "", prevTotal: "", cumulative: "", note: "",
    });
  }
  return out.slice(0, ROWS);
}

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
    <div className="cert-page print-landscape-wide" style={{ fontSize: "6px", padding: 2 }}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* Left page — student info & fees */}
        <div style={{ flex: "0 0 48%", borderRight: "1px solid #000" }}>
          <table className="cert-table" style={{ fontSize: "5.5px", width: "100%" }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ width: 28 }}>જ.ર. નં.</th>
                <th rowSpan={2} style={{ width: 22 }}>જ્ઞાતિ</th>
                <th rowSpan={2} style={{ width: 32 }}>જન્મ તારીખ</th>
                <th colSpan={5}>મળેલ ફી</th>
                <th rowSpan={2} style={{ width: 16 }}>ક્ર.</th>
                <th rowSpan={2}>વિદ્યાર્થીનું નામ</th>
              </tr>
              <tr>
                <th>શાળા</th><th>સત્ર</th><th>દાખલ</th><th>અન્ય</th><th>કુલ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.serial}>
                  <td>{r.grNumber}</td>
                  <td>{r.caste}</td>
                  <td>{r.dob}</td>
                  <td>{r.schoolFee}</td>
                  <td>{r.termFee}</td>
                  <td>{r.admissionFee}</td>
                  <td>{r.otherFee}</td>
                  <td>{r.totalFee}</td>
                  <td style={{ textAlign: "center" }}>{r.serial}</td>
                  <td>{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 4, fontSize: "6px" }}>કુલ સરવાળો રૂ. ___________</p>
        </div>

        {/* Right page — attendance grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 12, fontSize: "7px", padding: "2px 4px", borderBottom: "1px solid #000" }}>
            <span>માહે <u>{monthName}</u></span>
            <span>હાજરી</span>
            <span>ધોરણ <u>{standard}</u></span>
            <span>વર્ગ <u>{section}</u></span>
          </div>
          <table className="cert-table" style={{ fontSize: "5px", width: "100%" }}>
            <thead>
              <tr>
                {DAYS.map((d) => (
                  <th key={d} style={{ width: 10, padding: "1px 0", fontSize: "4.5px" }}>{d}</th>
                ))}
                <th style={{ width: 14 }}>ક્ર.</th>
                <th style={{ width: 22 }}>આ માસ હાજરી</th>
                <th style={{ width: 22 }}>ગત માસ</th>
                <th style={{ width: 22 }}>કુલ હાજરી</th>
                <th style={{ width: 20 }}>નોંધ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.serial}>
                  {DAYS.map((d) => (
                    <td key={d} style={{ textAlign: "center", height: 10, fontSize: "4.5px" }}>
                      {r.attendance[d - 1] || ""}
                    </td>
                  ))}
                  <td style={{ textAlign: "center" }}>{r.serial}</td>
                  <td>{r.monthTotal}</td>
                  <td>{r.prevTotal}</td>
                  <td>{r.cumulative}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {DAYS.map((d) => (
                  <td key={d} style={{ textAlign: "center", fontSize: "4.5px" }}>{d}</td>
                ))}
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
