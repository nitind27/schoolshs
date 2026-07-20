import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  CATEGORY_LABELS,
  SALARY_CATEGORIES,
  SALARY_FIELDS,
  currentFinancialYear,
  fyMonths,
  monthLabel,
  type SalaryCategory,
} from "@/lib/salary-statement";

export const dynamic = "force-dynamic";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get("fy") || currentFinancialYear();
    const category = searchParams.get("category") || "";

    const rows = await prisma.salaryStatementRow.findMany({
      where: {
        schoolId: session.schoolId,
        financialYear,
        ...(category && SALARY_CATEGORIES.includes(category as SalaryCategory) ? { category } : {}),
      },
    });
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true },
    });

    const months = fyMonths(financialYear);
    // month -> field -> sum
    const byMonth = new Map<number, Record<string, number>>();
    for (const row of rows) {
      const acc = byMonth.get(row.month) || {};
      for (const f of SALARY_FIELDS) {
        acc[f.key] = (acc[f.key] || 0) + (Number(row[f.key]) || 0);
      }
      byMonth.set(row.month, acc);
    }

    const catLabel = category && SALARY_CATEGORIES.includes(category as SalaryCategory)
      ? CATEGORY_LABELS[category as SalaryCategory]
      : "All Staff";

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Salary Ledger");
    const colCount = months.length + 2;

    ws.mergeCells(1, 1, 1, colCount);
    ws.getCell(1, 1).value = `SALARY LEDGER ${financialYear} — ${catLabel} — ${school?.name || ""}`;
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };

    // Header: blank | Mar-XX ... Feb-XX | TOTAL
    const headerRow = ws.getRow(3);
    const headers = ["", ...months.map(({ month, year }) => monthLabel(month, year)), "TOTAL"];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder;
    });

    const monthTotals = new Array(months.length).fill(0);
    let grand = 0;

    SALARY_FIELDS.forEach((f, idx) => {
      const row = ws.getRow(4 + idx);
      row.getCell(1).value = f.label;
      row.getCell(1).font = { bold: true, size: 9 };
      row.getCell(1).border = thinBorder;
      let rowTotal = 0;
      months.forEach(({ month }, mi) => {
        const v = byMonth.get(month)?.[f.key] || 0;
        rowTotal += v;
        monthTotals[mi] += v;
        const cell = row.getCell(mi + 2);
        cell.value = v;
        cell.font = { size: 9 };
        cell.numFmt = "#,##0";
        cell.border = thinBorder;
      });
      grand += rowTotal;
      const tCell = row.getCell(colCount);
      tCell.value = rowTotal;
      tCell.font = { bold: true, size: 9 };
      tCell.numFmt = "#,##0";
      tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
      tCell.border = thinBorder;
    });

    const totalRow = ws.getRow(4 + SALARY_FIELDS.length);
    totalRow.getCell(1).value = "TOTAL";
    const totalCells = ["TOTAL", ...monthTotals, grand];
    totalCells.forEach((val, i) => {
      const cell = totalRow.getCell(i + 1);
      cell.value = val;
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      cell.border = thinBorder;
      if (i > 0) cell.numFmt = "#,##0";
    });

    ws.getColumn(1).width = 14;
    for (let i = 2; i <= colCount; i++) ws.getColumn(i).width = 11;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="salary-ledger-${financialYear}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to export salary ledger" }, { status: 500 });
  }
}
