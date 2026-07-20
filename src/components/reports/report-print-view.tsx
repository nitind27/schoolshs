"use client";

import type { ReportPayload } from "@/lib/reports/types";

export function ReportPrintView({ data }: { data: ReportPayload | null }) {
  if (!data) return null;

  return (
    <div className="report-print-root hidden print:block">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .report-print-root, .report-print-root * { visibility: visible !important; }
          .report-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 12mm;
            background: white;
            color: #000;
          }
          .no-print { display: none !important; }
        }
        @page { size: A4 landscape; margin: 10mm; }
      `}</style>

      <header style={{ marginBottom: 16, borderBottom: "2px solid #1d4ed8", paddingBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{data.schoolName}</h1>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 0" }}>{data.title}</h2>
        <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>
          {new Date(data.generatedAt).toLocaleString("en-IN")} · {data.filterSummary}
        </p>
      </header>

      {data.sheets.map((sheet) => (
        <section key={sheet.name} style={{ marginBottom: 24, breakInside: "avoid" }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#1e40af" }}>{sheet.name}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
            <thead>
              <tr>
                {sheet.headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "4px 6px",
                      background: "#1d4ed8",
                      color: "#fff",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ border: "1px solid #e2e8f0", padding: "3px 6px" }}>
                      {cell ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
