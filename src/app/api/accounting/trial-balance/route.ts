import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAccountingAuth();
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy) return NextResponse.json({ accounts: [], trialBalance: [] });

    const accounts = await prisma.account.findMany({
      where: { schoolId: session.schoolId, financialYearId: fy.id, isActive: true },
      orderBy: { code: "asc" },
    });

    const lines = await prisma.voucherLine.findMany({
      where: { voucher: { schoolId: session.schoolId, financialYearId: fy.id, isPosted: true } },
      include: { account: true },
    });

    const balances = new Map<string, { debit: number; credit: number }>();
    for (const acc of accounts) {
      balances.set(acc.id, { debit: acc.openingBalance > 0 && acc.balanceType === "debit" ? acc.openingBalance : 0, credit: acc.openingBalance > 0 && acc.balanceType === "credit" ? acc.openingBalance : 0 });
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
        ...acc,
        totalDebit: b.debit,
        totalCredit: b.credit,
        closingDebit: net > 0 ? net : 0,
        closingCredit: net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalDebit = trialBalance.reduce((s, a) => s + a.closingDebit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.closingCredit, 0);

    return NextResponse.json({ accounts, trialBalance, totalDebit, totalCredit, financialYear: fy });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
