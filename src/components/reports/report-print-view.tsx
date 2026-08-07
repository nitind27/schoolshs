"use client";

import type { ReportPayload } from "@/lib/reports/types";

export function ReportPrintView({ data }: { data: ReportPayload | null }) {
  if (!data) return null;

  return (
    <div className="report-print-root" aria-hidden>
      <style jsx global>{`
        .report-print-root {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          /* Hide app chrome; keep only the report */
          body * {
            visibility: hidden !important;
          }

          .report-print-root,
          .report-print-root * {
            visibility: visible !important;
          }

          .report-print-root {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: #fff !important;
            color: #000 !important;
            z-index: 99999;
          }

          .no-print,
          .tn-shell,
          .shell-aside,
          .shell-menu-btn,
          .admin-menu-btn,
          .admin-aside,
          .admin-page-footer,
          aside,
          nav,
          [role="dialog"] {
            display: none !important;
            visibility: hidden !important;
          }

          .report-print-section {
            break-inside: auto;
            page-break-inside: auto;
            margin-bottom: 14pt;
          }

          .report-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            font-size: 8pt;
          }

          .report-print-table thead {
            display: table-header-group;
          }

          .report-print-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-print-table th,
          .report-print-table td {
            border: 0.5pt solid #94a3b8;
            padding: 2pt 4pt;
            vertical-align: top;
            word-break: break-word;
          }

          .report-print-table th {
            background: #1d4ed8 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <header
        style={{
          marginBottom: 12,
          borderBottom: "2px solid #1d4ed8",
          paddingBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
          {data.schoolName}
        </h1>
        <h2 style={{ fontSize: 13, fontWeight: 700, margin: "4px 0 0" }}>
          {data.title}
        </h2>
        {data.subtitle ? (
          <p style={{ fontSize: 10, margin: "2px 0 0", color: "#334155" }}>
            {data.subtitle}
          </p>
        ) : null}
        <p style={{ fontSize: 9, color: "#64748b", margin: "4px 0 0" }}>
          {new Date(data.generatedAt).toLocaleString("en-IN")} ·{" "}
          {data.filterSummary}
        </p>
      </header>

      {data.sheets.length === 0 ? (
        <p style={{ fontSize: 11, color: "#64748b" }}>No data for this report.</p>
      ) : (
        data.sheets.map((sheet) => (
          <section key={sheet.name} className="report-print-section">
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 6,
                color: "#1e40af",
              }}
            >
              {sheet.name}
              <span
                style={{
                  marginLeft: 8,
                  fontWeight: 500,
                  color: "#64748b",
                  fontSize: 9,
                }}
              >
                ({sheet.rows.length} row{sheet.rows.length === 1 ? "" : "s"})
              </span>
            </h3>
            <table className="report-print-table">
              <thead>
                <tr>
                  {sheet.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(sheet.headers.length, 1)}
                      style={{ textAlign: "center", color: "#64748b" }}
                    >
                      No rows
                    </td>
                  </tr>
                ) : (
                  sheet.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}
                    >
                      {sheet.headers.map((_, ci) => (
                        <td key={ci}>{row[ci] ?? ""}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
