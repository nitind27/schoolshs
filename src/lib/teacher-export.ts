import ExcelJS from "exceljs";

export type TeacherExportSheet = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
};

export type TeacherExportPayload = {
  type: string;
  title: string;
  schoolName: string;
  teacherName: string;
  filterSummary: string;
  generatedAt: string;
  sheets: TeacherExportSheet[];
};

/** Minimal landscape PDF table (Helvetica) — no extra deps. Prefer format=json + Flutter pdf for complex sheets. */
export function buildSimpleTablePdf(payload: TeacherExportPayload): Buffer {
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 36;
  const fontSize = 8;
  const lineH = 11;

  function escapePdf(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  const contentParts: string[] = [];
  let y = pageHeight - margin;

  const startPage = () => {
    y = pageHeight - margin;
    contentParts.push("BT");
    contentParts.push(`/F1 ${fontSize + 2} Tf`);
    contentParts.push(`1 0 0 1 ${margin} ${y} Tm (${escapePdf(payload.title)}) Tj`);
    y -= lineH + 2;
    contentParts.push(`/F1 ${fontSize} Tf`);
    contentParts.push(
      `1 0 0 1 ${margin} ${y} Tm (${escapePdf(`${payload.schoolName} · ${payload.teacherName} · ${payload.filterSummary}`)}) Tj`,
    );
    y -= lineH + 4;
  };

  const ensureSpace = (need: number) => {
    if (y - need < margin) {
      contentParts.push("ET");
      y = pageHeight - margin;
      contentParts.push("BT");
      contentParts.push(`/F1 ${fontSize} Tf`);
    }
  };

  startPage();

  for (const sheet of payload.sheets) {
    ensureSpace(lineH * 3);
    contentParts.push(`/F1 ${fontSize + 1} Tf`);
    contentParts.push(`1 0 0 1 ${margin} ${y} Tm (${escapePdf(sheet.name)}) Tj`);
    y -= lineH + 2;
    contentParts.push(`/F1 ${fontSize} Tf`);

    const colCount = Math.max(sheet.headers.length, 1);
    const usable = pageWidth - margin * 2;
    const colW = Math.min(90, Math.floor(usable / colCount));

    const drawRow = (cells: (string | number | null)[]) => {
      ensureSpace(lineH);
      let x = margin;
      for (let i = 0; i < colCount; i++) {
        const raw = String(cells[i] ?? "").slice(0, 28);
        contentParts.push(`1 0 0 1 ${x} ${y} Tm (${escapePdf(raw)}) Tj`);
        x += colW;
      }
      y -= lineH;
    };

    drawRow(sheet.headers);
    for (const row of sheet.rows) {
      drawRow(row);
    }
    y -= lineH;
  }

  contentParts.push("ET");
  const stream = contentParts.join("\n");
  const streamBuf = Buffer.from(stream, "utf8");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n`,
  );
  objects.push(
    `4 0 obj<< /Length ${streamBuf.length} >>stream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function buildTeacherExcelBuffer(payload: TeacherExportPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = payload.schoolName;
  wb.created = new Date(payload.generatedAt);

  for (const sheet of payload.sheets) {
    const safeName = sheet.name.replace(/[\\/*?:[\]]/g, "-").slice(0, 31);
    const ws = wb.addWorksheet(safeName || "Report");

    ws.mergeCells(1, 1, 1, Math.max(sheet.headers.length, 1));
    const title = ws.getCell(1, 1);
    title.value = `${payload.title} — ${payload.schoolName}`;
    title.font = { bold: true, size: 12, color: { argb: "FF047857" } };

    ws.mergeCells(2, 1, 2, Math.max(sheet.headers.length, 1));
    ws.getCell(2, 1).value =
      `${payload.teacherName} · ${payload.filterSummary} · ${new Date(payload.generatedAt).toLocaleString("en-IN")}`;
    ws.getCell(2, 1).font = { size: 9, color: { argb: "FF64748B" } };

    const headerRow = ws.getRow(4);
    sheet.headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    headerRow.height = 22;

    sheet.rows.forEach((row, idx) => {
      const r = ws.getRow(5 + idx);
      row.forEach((val, i) => {
        r.getCell(i + 1).value = val ?? "";
        r.getCell(i + 1).font = { size: 9 };
        if (idx % 2 === 1) {
          r.getCell(i + 1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0FDF4" },
          };
        }
      });
    });

    sheet.headers.forEach((_, i) => {
      ws.getColumn(i + 1).width = 14;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function teacherExportFilename(payload: TeacherExportPayload, ext: string): string {
  const date = new Date(payload.generatedAt).toISOString().slice(0, 10);
  return `teacher_${payload.type}_${date}.${ext}`;
}
