import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  IT_80C_FIELDS,
  IT_OTHER_DED_FIELDS,
  assessmentYear,
  computeIncomeTax,
  emptyItForm,
  type ItFormData,
} from "@/lib/income-tax";
import { currentSlipFy } from "@/lib/salary-slip";

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

    const [staff, form, school] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } }),
      prisma.staffIncomeTaxForm.findUnique({
        where: { staffId_financialYear: { staffId, financialYear } },
      }),
      prisma.school.findUnique({ where: { id: session.schoolId }, select: { name: true } }),
    ]);
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    let data: ItFormData = emptyItForm();
    if (form?.dataJson) {
      try {
        const parsed = JSON.parse(form.dataJson);
        data = { numbers: parsed.numbers || {}, texts: parsed.texts || {} };
      } catch { /* empty form */ }
    }
    const c = computeIncomeTax(data);
    const num = (k: string) => Number(data.numbers[k as keyof typeof data.numbers]) || 0;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Income Tax");
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 58;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 14;

    let r = 1;
    const title = (text: string, size = 12) => {
      ws.mergeCells(r, 1, r, 4);
      ws.getCell(r, 1).value = text;
      ws.getCell(r, 1).font = { bold: true, size };
      ws.getCell(r, 1).alignment = { horizontal: "center" };
      r++;
    };
    const line = (no: string, label: string, amount?: number, total?: number, bold = false) => {
      ws.getCell(r, 1).value = no;
      ws.getCell(r, 2).value = label;
      if (amount != null) { ws.getCell(r, 3).value = amount; ws.getCell(r, 3).numFmt = "#,##0"; }
      if (total != null) { ws.getCell(r, 4).value = total; ws.getCell(r, 4).numFmt = "#,##0"; }
      for (let col = 1; col <= 4; col++) {
        ws.getCell(r, col).border = thinBorder;
        ws.getCell(r, col).font = { size: 9, bold };
      }
      r++;
    };

    title(school?.name || "", 13);
    title("આવકવેરાની ગણતરી દર્શાવતું પત્રક (STATEMENT OF INCOME TAX COMPUTATION)", 10);
    title(`નાણાંકીય વર્ષ ${financialYear} · આકારણી વર્ષ ${assessmentYear(financialYear)}`, 10);
    r++;

    line("", `કર્મચારીનું નામ: ${staff.firstName} ${staff.lastName}`, undefined, undefined, true);
    line("", `હોદ્દો: ${staff.designation} · PAN: ${staff.panNumber || "—"} · જન્મ તારીખ: ${staff.dateOfBirth || "—"} · મોબાઈલ: ${staff.mobileNumber || "—"}`);
    if (data.texts.fatherName) line("", `પિતાનું નામ: ${data.texts.fatherName}`);
    if (data.texts.address) line("", `સરનામું: ${data.texts.address}`);
    if (data.texts.bankBranch) line("", `બેંક/શાખા: ${data.texts.bankBranch}`);
    r++;

    line("૧", "પગારની આવક", undefined, c.salaryIncome, true);
    line("૨", "બાદ: વાહનભથ્થું u/s 10(14)", num("vehicleAllowance"));
    line("", "બાદ: વ્યવસાયવેરો u/s 16(i)", num("professionalTax"));
    line("", "બાદ: સ્ટાન્ડર્ડ ડિડક્શન u/s 16", num("standardDeduction"));
    line("", "કુલ", undefined, c.salaryDeductionsTotal, true);
    line("૩", "મકાન લોન વ્યાજ u/s 24 (Rs.2,00,000 સુધી)", undefined, c.housingLoanInterest);
    line("૪", "કુલ (૨+૩ બાદ પછી)", undefined, c.incomeAfterHousing, true);
    line("૫", "અન્ય આવક (NSC વ્યાજ + બચત + FD + અન્ય)", undefined, c.otherIncomeTotal);
    line("૬", "ગ્રોસ ટોટલ આવક (૪+૫)", undefined, c.grossTotalIncome, true);

    line("૭", "ડિડક્શન ચેપ્ટર VI-A (80C વગેરે, મહત્તમ Rs.1,50,000)", undefined, undefined, true);
    IT_80C_FIELDS.forEach((f, i) => line("", `(${i + 1}) ${f.labelGu}`, num(f.key)));
    line("", "કુલ 80C (મહત્તમ 1,50,000)", undefined, c.ded80CTotal, true);
    IT_OTHER_DED_FIELDS.forEach((f) => line("", f.labelGu, num(f.key)));
    line("", "કુલ (બી થી જી)", undefined, c.dedOtherTotal, true);
    line("", "કુલ ડિડક્શન VI-A", undefined, c.deductionVIATotal, true);

    line("૮", "ચોખ્ખી કરપાત્ર આવક (૬-૭)", undefined, c.netTaxableIncome, true);
    line("૯", "કુલ કરપાત્ર આવક પુરા દશ રૂપિયામાં", undefined, c.roundedTaxable, true);

    line("૧૦", "ટેક્સ ગણતરી (સ્લેબ પ્રમાણે):", undefined, undefined, true);
    const slabLabels = ["3,00,000 to 6,00,000 — 5%", "6,00,000 to 9,00,000 — 10%", "9,00,000 to 12,00,000 — 15%", "12,00,000 to 15,00,000 — 20%", "> 15,00,000 — 30%"];
    c.slabTaxes.forEach((s, i) => line("", slabLabels[i], s.amount));
    line("", "કર રાહત (87A)", undefined, c.rebate87A);
    line("૧૧", "ભરવાપાત્ર ઇન્કમટેક્ષ", undefined, c.taxBeforeRebate - c.rebate87A, true);
    line("૧૨", "એજ્યુકેશન સેસ ૪%", undefined, c.cess);
    line("૧૩", "કુલ ભરવાપાત્ર ટેક્ષ (૧૧+૧૨)", undefined, c.totalTaxPayable, true);
    line("૧૪", "વર્ષ દરમ્યાન થયેલ કપાત (TDS)", undefined, c.tdsPaid);
    line("૧૫", c.refundOrPayable >= 0 ? "રિફંડ પાત્ર રકમ (૧૪-૧૩) — Paid Extra TDS" : "બાકી ભરવાપાત્ર રકમ (૧૩-૧૪)", undefined, Math.abs(c.refundOrPayable), true);

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const empTag = (staff.employeeId || staff.firstName).replace(/[^\w-]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="income-tax-${empTag}-${financialYear}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to export income tax form" }, { status: 500 });
  }
}
