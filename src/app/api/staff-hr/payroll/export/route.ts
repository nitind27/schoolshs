import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { MONTH_NAMES } from "@/lib/staff-hr";

export const dynamic = "force-dynamic";

const HEAD_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF065F46" },
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" },
};
const PAID_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD1FAE5" },
};
const PENDING_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" },
};
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

const HEADERS = [
  "#",
  "Emp. ID",
  "Staff Name",
  "Designation",
  "Working Days",
  "Present",
  "Absent",
  "Gross Salary (₹)",
  "Deductions (₹)",
  "Net Salary (₹)",
  "Bank Account",
  "IFSC",
  "Status",
  "Paid On",
];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    if (!month || month < 1 || month > 12 || !year) {
      return NextResponse.json({ error: "Valid month and year required" }, { status: 400 });
    }

    const [payrolls, school] = await Promise.all([
      prisma.staffPayroll.findMany({
        where: { schoolId: session.schoolId, month, year },
        include: {
          staff: {
            select: {
              employeeId: true,
              firstName: true,
              lastName: true,
              firstNameGu: true,
              lastNameGu: true,
              designation: true,
              bankAccount: true,
              ifscCode: true,
            },
          },
        },
        orderBy: { staff: { firstName: "asc" } },
      }),
      prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { name: true },
      }),
    ]);

    if (payrolls.length === 0) {
      return NextResponse.json({ error: "No payroll data for this month" }, { status: 404 });
    }

    const monthLabel = MONTH_NAMES[month - 1] || String(month);
    const period = `${monthLabel} ${year}`;
    const schoolName = school?.name || "School";

    const wb = new ExcelJS.Workbook();
    wb.creator = schoolName;
    wb.created = new Date();
    const ws = wb.addWorksheet("Payroll");

    const colCount = HEADERS.length;

    ws.mergeCells(1, 1, 1, colCount);
    const title = ws.getCell(1, 1);
    title.value = schoolName;
    title.font = { bold: true, size: 14 };
    title.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(2, 1, 2, colCount);
    const sub = ws.getCell(2, 1);
    sub.value = `MONTHLY STAFF PAYROLL SHEET — ${period}`;
    sub.font = { bold: true, size: 11 };
    sub.alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(3, 1, 3, colCount);
    const meta = ws.getCell(3, 1);
    meta.value = `Generated: ${new Date().toLocaleString("en-IN")}`;
    meta.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
    meta.alignment = { horizontal: "center" };

    const headerRow = ws.getRow(5);
    HEADERS.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = HEAD_FILL;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 22;

    let totalGross = 0;
    let totalDed = 0;
    let totalNet = 0;
    let paidCount = 0;
    let pendingCount = 0;

    payrolls.forEach((p, idx) => {
      const nameEn = `${p.staff.firstName} ${p.staff.lastName}`.trim();
      const nameGu = [p.staff.firstNameGu, p.staff.lastNameGu].filter(Boolean).join(" ").trim();
      const displayName = nameGu ? `${nameEn} (${nameGu})` : nameEn;
      const status = p.paymentStatus === "paid" ? "Paid" : "Pending";
      if (status === "Paid") paidCount += 1;
      else pendingCount += 1;

      totalGross += p.grossSalary;
      totalDed += p.deductions;
      totalNet += p.netSalary;

      const row = ws.getRow(6 + idx);
      const values: (string | number)[] = [
        idx + 1,
        p.staff.employeeId || "",
        displayName,
        p.staff.designation || "",
        p.workingDays,
        p.presentDays,
        p.absentDays,
        Math.round(p.grossSalary * 100) / 100,
        Math.round(p.deductions * 100) / 100,
        Math.round(p.netSalary * 100) / 100,
        p.staff.bankAccount || "",
        p.staff.ifscCode || "",
        status,
        p.paidAt ? p.paidAt.toLocaleDateString("en-IN") : "",
      ];

      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = thinBorder;
        cell.alignment = {
          vertical: "middle",
          horizontal: i === 0 || (i >= 4 && i <= 6) ? "center" : i >= 7 && i <= 9 ? "right" : "left",
        };
        if (i >= 7 && i <= 9 && typeof v === "number") {
          cell.numFmt = "#,##0.00";
        }
        if (i === 12) {
          cell.fill = status === "Paid" ? PAID_FILL : PENDING_FILL;
          cell.font = { bold: true, size: 9 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    const totalRowNo = 6 + payrolls.length;
    const totalRow = ws.getRow(totalRowNo);
    const totalValues: (string | number)[] = [
      "",
      "",
      "TOTAL",
      "",
      "",
      "",
      "",
      Math.round(totalGross * 100) / 100,
      Math.round(totalDed * 100) / 100,
      Math.round(totalNet * 100) / 100,
      "",
      "",
      `Paid: ${paidCount} | Pending: ${pendingCount}`,
      "",
    ];
    totalValues.forEach((v, i) => {
      const cell = totalRow.getCell(i + 1);
      cell.value = v;
      cell.border = thinBorder;
      cell.fill = TOTAL_FILL;
      cell.font = { bold: true, size: 9 };
      if (i >= 7 && i <= 9 && typeof v === "number") {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });

    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 18;
    ws.getColumn(5).width = 12;
    ws.getColumn(6).width = 10;
    ws.getColumn(7).width = 10;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 14;
    ws.getColumn(10).width = 14;
    ws.getColumn(11).width = 18;
    ws.getColumn(12).width = 14;
    ws.getColumn(13).width = 12;
    ws.getColumn(14).width = 12;

    ws.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const fileTag = `${year}-${String(month).padStart(2, "0")}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="staff-payroll-${fileTag}.xlsx"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("Payroll excel export error:", e);
    return NextResponse.json({ error: "Failed to export payroll" }, { status: 500 });
  }
}
