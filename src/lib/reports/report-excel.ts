import ExcelJS from "exceljs";
import type { ReportPayload } from "./types";

const HEADER_BG = "FF1D4ED8";
const BORDER = "FFCBD5E1";

function styleHeader(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  });
  row.height = 24;
}

function styleData(row: ExcelJS.Row, alt: boolean): void {
  row.eachCell((cell) => {
    cell.font = { size: 9 };
    cell.alignment = { vertical: "middle", wrapText: true };
    if (alt) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    }
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  });
  row.height = 16;
}

export async function buildReportExcelBuffer(payload: ReportPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = payload.schoolName;
  wb.created = new Date(payload.generatedAt);

  for (const sheet of payload.sheets) {
    const safeName = sheet.name.replace(/[\\/*?:[\]]/g, "-").slice(0, 31);
    const ws = wb.addWorksheet(safeName || "Report");

    ws.mergeCells(1, 1, 1, Math.max(sheet.headers.length, 1));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `${payload.title} — ${payload.schoolName}`;
    titleCell.font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
    ws.getRow(1).height = 22;

    ws.mergeCells(2, 1, 2, Math.max(sheet.headers.length, 1));
    const metaCell = ws.getCell(2, 1);
    metaCell.value = `Generated: ${new Date(payload.generatedAt).toLocaleString("en-IN")}  |  Filters: ${payload.filterSummary}`;
    metaCell.font = { size: 9, color: { argb: "FF64748B" } };
    ws.getRow(2).height = 18;

    const headerRow = ws.getRow(4);
    sheet.headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });
    styleHeader(headerRow);

    sheet.rows.forEach((row, idx) => {
      const r = ws.getRow(5 + idx);
      row.forEach((val, i) => {
        r.getCell(i + 1).value = val ?? "";
      });
      styleData(r, idx % 2 === 1);
    });

    sheet.headers.forEach((h, i) => {
      ws.getColumn(i + 1).width = Math.min(28, Math.max(10, h.length + 4));
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function buildReportCsv(payload: ReportPayload): string {
  const sheet = payload.sheets[0];
  if (!sheet) return "";
  const escape = (v: string | number | null) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [sheet.headers.map(escape).join(",")];
  for (const row of sheet.rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

export function reportFilename(payload: ReportPayload, ext: string): string {
  const date = new Date(payload.generatedAt).toISOString().slice(0, 10);
  const slug = payload.type.replace(/_/g, "-");
  return `${slug}_${date}.${ext}`;
}
