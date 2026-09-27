import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";

/**
 * Full accounting pack for CA handoff (print / Save as PDF).
 * Admin & clerk prepare the pack; CA may also open it for their active school.
 */
export async function GET() {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        udiseCode: true,
        address: true,
        district: true,
        taluka: true,
        phone: true,
      },
    });

    const settings = await prisma.schoolSettings.findFirst({
      where: { schoolId },
      select: { schoolName: true, academicYear: true },
    });

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!fy) {
      return NextResponse.json({
        school: null,
        financialYear: null,
        trialBalance: [],
        vouchers: [],
        totals: null,
        statements: null,
      });
    }

    const accounts = await prisma.account.findMany({
      where: { schoolId, financialYearId: fy.id, isActive: true },
      orderBy: [{ groupType: "asc" }, { code: "asc" }],
    });

    const lines = await prisma.voucherLine.findMany({
      where: { voucher: { schoolId, financialYearId: fy.id, isPosted: true } },
    });

    const balances = new Map<string, { debit: number; credit: number }>();
    for (const acc of accounts) {
      balances.set(acc.id, {
        debit:
          acc.openingBalance > 0 && acc.balanceType === "debit"
            ? acc.openingBalance
            : 0,
        credit:
          acc.openingBalance > 0 && acc.balanceType === "credit"
            ? acc.openingBalance
            : 0,
      });
    }
    for (const line of lines) {
      const b = balances.get(line.accountId) || { debit: 0, credit: 0 };
      b.debit += line.debit;
      b.credit += line.credit;
      balances.set(line.accountId, b);
    }

    const trialBalance = accounts.map((acc) => {
      const b = balances.get(acc.id) || { debit: 0, credit: 0 };
      const net = b.debit - b.credit;
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        groupType: acc.groupType,
        totalDebit: b.debit,
        totalCredit: b.credit,
        closingDebit: net > 0 ? net : 0,
        closingCredit: net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalDebit = trialBalance.reduce((s, a) => s + a.closingDebit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.closingCredit, 0);

    const income = trialBalance
      .filter((a) => a.groupType === "income")
      .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
    const expenses = trialBalance
      .filter((a) => a.groupType === "expenses")
      .reduce((s, a) => s + a.closingDebit - a.closingCredit, 0);
    const assets = trialBalance
      .filter((a) => a.groupType === "assets")
      .reduce((s, a) => s + a.closingDebit - a.closingCredit, 0);
    const liabilities = trialBalance
      .filter((a) => a.groupType === "liabilities")
      .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
    const capital = trialBalance
      .filter((a) => a.groupType === "capital")
      .reduce((s, a) => s + a.closingCredit - a.closingDebit, 0);
    const surplus = income - expenses;

    const vouchers = await prisma.voucher.findMany({
      where: { schoolId, financialYearId: fy.id },
      orderBy: [{ voucherDate: "asc" }, { voucherNo: "asc" }],
      include: {
        lines: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { id: "asc" },
        },
        createdBy: { select: { name: true } },
      },
      take: 2000,
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      school: {
        name: settings?.schoolName || school?.name || session.accountingSchoolName || "",
        udiseCode: school?.udiseCode || "",
        address: school?.address || "",
        district: school?.district || "",
        taluka: school?.taluka || "",
        phone: school?.phone || "",
      },
      financialYear: {
        id: fy.id,
        label: fy.label,
        auditStatus: fy.auditStatus,
        isLocked: fy.isLocked,
        submittedAt: fy.submittedAt,
        startDate: fy.startDate,
        endDate: fy.endDate,
      },
      trialBalance,
      totals: { totalDebit, totalCredit },
      statements: {
        income,
        expenses,
        surplus,
        assets,
        liabilities,
        capital,
        assetSide: assets,
        fundSide: liabilities + capital + surplus,
      },
      vouchers: vouchers.map((v) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        voucherType: v.voucherType,
        voucherDate: v.voucherDate,
        partyName: v.partyName,
        narration: v.narration,
        totalAmount: v.totalAmount,
        auditStatus: v.auditStatus,
        createdBy: v.createdBy?.name || "",
        lines: v.lines.map((l) => ({
          accountCode: l.account.code,
          accountName: l.account.name,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      })),
      counts: {
        accounts: accounts.length,
        vouchers: vouchers.length,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed to build CA pack" }, { status: 500 });
  }
}
