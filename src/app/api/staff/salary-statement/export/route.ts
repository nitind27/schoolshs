import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  SALARY_CATEGORIES,
  SALARY_FIELDS,
  currentFinancialYear,
  emptyValues,
  fyMonths,
  monthLabel,
  rowTotal,
  type SalaryCategory,
  type SalaryFieldKey,
} from "@/lib/salary-statement";

export const dynamic = "force-dynamic";

const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get("fy") || currentFinancialYear();

    const [dbRows, school] = await Promise.all([
      prisma.salaryStatementRow.findMany({
        where: { schoolId: session.schoolId, financialYear },
      }),
      prisma.school.findUnique({ where: { id: session.schoolId }, select: { name: true } }),
    ]);

    const byKey = new Map(dbRows.map((r) => [`${r.category}:${r.month}`, r]));
    const months = fyMonths(financialYear);
    const headers = ["MONTH", ...SALARY_FIELDS.map((f) => f.label), "TOTAL"];

    const wb = new ExcelJS.Workbook();
    wb.creator = school?.name || "School";
    wb.created = new Date();

    const grandTotals = emptyValues();

    const writeHeaderRow = (ws: ExcelJS.Worksheet, rowNo: number) => {
      const row = ws.getRow(rowNo);
      headers.forEach((h, i) => {
        const cell = row.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
        cell.fill = HEAD_FILL;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = thinBorder;
      });
      row.height = 24;
    };

    // One sheet per category
    const categoryTotals: Record<SalaryCategory, Record<SalaryFieldKey, number>> = {
      secondary: emptyValues(),
      higher_secondary: emptyValues(),
      non_teaching: emptyValues(),
      peon: emptyValues(),
    };

    for (const category of SALARY_CATEGORIES) {
      const ws = wb.addWorksheet(CATEGORY_LABELS[category].slice(0, 31));

      ws.mergeCells(1, 1, 1, headers.length);
      const title = ws.getCell(1, 1);
      title.value = `ANNUAL STATEMENT ${financialYear} — ${CATEGORY_LABELS[category].toUpperCase()} — ${school?.name || ""}`;
      title.font = { bold: true, size: 12 };
      title.alignment = { horizontal: "center" };

      writeHeaderRow(ws, 3);

      months.forEach(({ month, year }, idx) => {
        const dbRow = byKey.get(`${category}:${month}`);
        const values = emptyValues();
        for (const f of SALARY_FIELDS) {
          values[f.key] = Number(dbRow?.[f.key]) || 0;
          categoryTotals[category][f.key] += values[f.key];
        }
        const row = ws.getRow(4 + idx);
        const cells = [monthLabel(month, year), ...SALARY_FIELDS.map((f) => values[f.key]), rowTotal(values)];
        cells.forEach((val, i) => {
          const cell = row.getCell(i + 1);
          cell.value = val;
          cell.font = { size: 9 };
          cell.border = thinBorder;
          if (i > 0) cell.numFmt = "#,##0";
        });
      });

      // Category TOTAL row
      const totalRow = ws.getRow(4 + months.length);
      const totals = categoryTotals[category];
      const totalCells = ["TOTAL", ...SALARY_FIELDS.map((f) => totals[f.key]), rowTotal(totals)];
      totalCells.forEach((val, i) => {
        const cell = totalRow.getCell(i + 1);
        cell.value = val;
        cell.font = { bold: true, size: 9 };
        cell.fill = TOTAL_FILL;
        cell.border = thinBorder;
        if (i > 0) cell.numFmt = "#,##0";
      });

      ws.getColumn(1).width = 12;
      for (let i = 2; i <= headers.length; i++) ws.getColumn(i).width = 11;

      for (const f of SALARY_FIELDS) grandTotals[f.key] += totals[f.key];
    }

    // Summary sheet
    const ws = wb.addWorksheet("Total Summary");
    ws.mergeCells(1, 1, 1, headers.length);
    const title = ws.getCell(1, 1);
    title.value = `ANNUAL STATEMENT ${financialYear} — TOTAL SUMMARY — ${school?.name || ""}`;
    title.font = { bold: true, size: 12 };
    title.alignment = { horizontal: "center" };

    const sHeaders = ["DETAIL", ...SALARY_FIELDS.map((f) => f.label), "TOTAL"];
    const headerRow = ws.getRow(3);
    sHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = HEAD_FILL;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 24;

    SALARY_CATEGORIES.forEach((category, idx) => {
      const totals = categoryTotals[category];
      const row = ws.getRow(4 + idx);
      const cells = [CATEGORY_LABELS[category], ...SALARY_FIELDS.map((f) => totals[f.key]), rowTotal(totals)];
      cells.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { size: 9 };
        cell.border = thinBorder;
        if (i > 0) cell.numFmt = "#,##0";
      });
    });

    const gRow = ws.getRow(4 + SALARY_CATEGORIES.length);
    const gCells = ["GRAND TOTAL", ...SALARY_FIELDS.map((f) => grandTotals[f.key]), rowTotal(grandTotals)];
    gCells.forEach((val, i) => {
      const cell = gRow.getCell(i + 1);
      cell.value = val;
      cell.font = { bold: true, size: 10 };
      cell.fill = TOTAL_FILL;
      cell.border = thinBorder;
      if (i > 0) cell.numFmt = "#,##0";
    });
    ws.getColumn(1).width = 24;
    for (let i = 2; i <= sHeaders.length; i++) ws.getColumn(i).width = 11;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="salary-statement-${financialYear}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to export salary statement" }, { status: 500 });
  }
}
