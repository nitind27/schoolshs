import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  SLIP_ALL_FIELDS,
  SLIP_DEDUCTION_FIELDS,
  SLIP_SALARY_FIELDS,
  currentSlipFy,
  emptySlipValues,
  grossPay,
  netPay,
  slipFyMonths,
  slipMonthLabel,
  totalDeduction,
  type SlipFieldKey,
} from "@/lib/salary-slip";
import { registerDates } from "@/lib/staff-register";

export const dynamic = "force-dynamic";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" },
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId") || "";
    const financialYear = searchParams.get("fy") || currentSlipFy();

    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });

    const [staff, dbRows, school] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } }),
      prisma.staffSalarySlipRow.findMany({
        where: { staffId, schoolId: session.schoolId, financialYear },
      }),
      prisma.school.findUnique({ where: { id: session.schoolId }, select: { name: true, address: true } }),
    ]);

    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const byMonth = new Map(dbRows.map((r) => [r.month, r]));
    const months = slipFyMonths(financialYear);
    const { retireDate } = registerDates(staff.dateOfBirth, staff.dateOfJoining);

    const headers = [
      "MONTH/YEAR",
      ...SLIP_SALARY_FIELDS.map((f) => f.label),
      "GROSS PAY",
      ...SLIP_DEDUCTION_FIELDS.map((f) => f.label),
      "TOTAL DEDU.",
      "NET PAY",
    ];

    const wb = new ExcelJS.Workbook();
    wb.creator = school?.name || "School";
    const ws = wb.addWorksheet("Salary Slip");

    // Title block
    ws.mergeCells(1, 1, 1, headers.length);
    ws.getCell(1, 1).value = school?.name || "";
    ws.getCell(1, 1).font = { bold: true, size: 13 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, headers.length);
    ws.getCell(2, 1).value =
      `STATEMENT OF EMPLOYEE INCOME OF SALARY & ANNUAL DEDUCTION & PERSONAL DETAILS — FINANCIAL YEAR: ${financialYear}`;
    ws.getCell(2, 1).font = { bold: true, size: 10 };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    // Employee detail rows
    const details: [string, string][] = [
      ["NAME OF EMPLOYEE", `${staff.firstName} ${staff.lastName}`.trim()],
      ["DESIGNATION", staff.designation || ""],
      ["EMPLOYEE NO.", staff.employeeId || ""],
      ["BANK ACCOUNT NO.", staff.bankAccount || ""],
      ["GPF/CPF NO.", staff.gpfCpfNo || ""],
      ["PAN NO.", staff.panNumber || ""],
      ["BIRTH DATE", staff.dateOfBirth || ""],
      ["JOINING DATE", staff.dateOfJoining || ""],
      ["RETIREMENT DATE", retireDate || ""],
      ["AADHAR CARD", staff.aadhaarNumber || ""],
      ["MOBILE NO", staff.mobileNumber || ""],
    ];
    let r = 4;
    for (let i = 0; i < details.length; i += 2) {
      const row = ws.getRow(r);
      row.getCell(1).value = details[i][0];
      row.getCell(1).font = { bold: true, size: 9 };
      row.getCell(2).value = details[i][1];
      row.getCell(2).font = { size: 9 };
      if (details[i + 1]) {
        row.getCell(4).value = details[i + 1][0];
        row.getCell(4).font = { bold: true, size: 9 };
        row.getCell(5).value = details[i + 1][1];
        row.getCell(5).font = { size: 9 };
      }
      r++;
    }
    r += 1;

    // Table header
    const headerRow = ws.getRow(r);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 8 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 26;
    r++;

    const totals = emptySlipValues();
    for (const { month, year } of months) {
      const dbRow = byMonth.get(month);
      const values = emptySlipValues();
      for (const f of SLIP_ALL_FIELDS) {
        values[f.key] = Number(dbRow?.[f.key]) || 0;
        totals[f.key] += values[f.key];
      }
      const cells = [
        slipMonthLabel(month, year),
        ...SLIP_SALARY_FIELDS.map((f) => values[f.key]),
        grossPay(values),
        ...SLIP_DEDUCTION_FIELDS.map((f) => values[f.key]),
        totalDeduction(values),
        netPay(values),
      ];
      const row = ws.getRow(r);
      cells.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { size: 8 };
        cell.border = thinBorder;
        if (i > 0) cell.numFmt = "#,##0";
      });
      r++;
    }

    // TOTAL row
    const totalCells = [
      "TOTAL",
      ...SLIP_SALARY_FIELDS.map((f) => totals[f.key]),
      grossPay(totals),
      ...SLIP_DEDUCTION_FIELDS.map((f) => totals[f.key]),
      totalDeduction(totals),
      netPay(totals),
    ];
    const totalRow = ws.getRow(r);
    totalCells.forEach((val, i) => {
      const cell = totalRow.getCell(i + 1);
      cell.value = val;
      cell.font = { bold: true, size: 8 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      cell.border = thinBorder;
      if (i > 0) cell.numFmt = "#,##0";
    });

    ws.getColumn(1).width = 12;
    for (let i = 2; i <= headers.length; i++) ws.getColumn(i).width = 10;

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const empTag = (staff.employeeId || staff.firstName).replace(/[^\w-]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="salary-slip-${empTag}-${financialYear}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to export salary slip" }, { status: 500 });
  }
}
