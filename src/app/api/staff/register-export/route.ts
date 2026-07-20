import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { registerDates } from "@/lib/staff-register";

export const dynamic = "force-dynamic";

const HEADERS = [
  "#",
  "Emp. No",
  "Name of Employee",
  "Designation",
  "Bank Account No.",
  "PAN No",
  "GPF/CPF No.",
  "Date of Birth",
  "Joining Date",
  "Retire Date",
  "Mobile No",
  "Aadhaar No",
  "First Higher Grade",
  "Second Higher Grade",
  "Third Higher Grade",
  "Qualification",
  "Pay Level / Scale",
];

export async function GET() {
  try {
    const session = await requireSchoolAuth();

    const [staff, school] = await Promise.all([
      prisma.staff.findMany({
        where: { schoolId: session.schoolId, isActive: true },
        orderBy: [{ designation: "asc" }, { firstName: "asc" }],
      }),
      prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { name: true },
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = school?.name || "School";
    wb.created = new Date();
    const ws = wb.addWorksheet("Staff Register");

    ws.mergeCells(1, 1, 1, HEADERS.length);
    const title = ws.getCell(1, 1);
    title.value = `STAFF SERVICE REGISTER — ${school?.name || ""}`;
    title.font = { bold: true, size: 13 };
    title.alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, HEADERS.length);
    ws.getCell(2, 1).value = `Generated: ${new Date().toLocaleString("en-IN")} · Total staff: ${staff.length}`;
    ws.getCell(2, 1).font = { size: 9, color: { argb: "FF64748B" } };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    const headerRow = ws.getRow(4);
    HEADERS.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    headerRow.height = 26;

    staff.forEach((s, idx) => {
      const { retireDate, higherGrades } = registerDates(s.dateOfBirth, s.dateOfJoining);
      const values = [
        idx + 1,
        s.employeeId || "",
        `${s.firstName} ${s.lastName}`.trim(),
        s.designation,
        s.bankAccount || "",
        s.panNumber || "",
        s.gpfCpfNo || "",
        s.dateOfBirth || "",
        s.dateOfJoining || "",
        retireDate,
        s.mobileNumber || "",
        s.aadhaarNumber || "",
        higherGrades[0],
        higherGrades[1],
        higherGrades[2],
        s.qualification || "",
        s.payLevel || "",
      ];
      const row = ws.getRow(5 + idx);
      values.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { size: 9 };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        if (idx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
    });

    const widths = [5, 10, 28, 16, 16, 13, 16, 12, 12, 12, 13, 15, 12, 12, 12, 16, 20];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const dateTag = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="staff-service-register-${dateTag}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to export staff register" }, { status: 500 });
  }
}
