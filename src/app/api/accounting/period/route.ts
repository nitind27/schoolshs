import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import {
  defaultFyMonth,
  fyDateRange,
  isCashOrBankAccount,
  openingOnSide,
  parseIsoDay,
} from "@/lib/accounting";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const { searchParams } = new URL(request.url);

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!fy) {
      return NextResponse.json({ financialYear: null, vouchers: [], income: [], expenses: [], cashBank: [] });
    }

    const fallback = defaultFyMonth(fy.label);
    const fromStr = searchParams.get("from") || fallback.from;
    const toStr = searchParams.get("to") || fallback.to;
    const from = parseIsoDay(fromStr, false);
    const to = parseIsoDay(toStr, true);
    if (!from || !to || from > to) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const accounts = await prisma.account.findMany({
      where: { schoolId, financialYearId: fy.id, isActive: true },
      orderBy: { code: "asc" },
    });

    const lines = await prisma.voucherLine.findMany({
      where: {
        voucher: {
          schoolId,
          financialYearId: fy.id,
          isPosted: true,
          voucherDate: { lte: to },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
        voucher: {
          select: {
            id: true,
            voucherNo: true,
            voucherDate: true,
            voucherType: true,
            partyName: true,
            narration: true,
            totalAmount: true,
            auditStatus: true,
          },
        },
      },
    });

    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    const cashMove = new Map<string, { before: number; moneyIn: number; moneyOut: number }>();

    for (const acc of accounts) {
      if (!isCashOrBankAccount(acc)) continue;
      const open = openingOnSide(acc.openingBalance, acc.balanceType);
      cashMove.set(acc.id, { before: open.debit - open.credit, moneyIn: 0, moneyOut: 0 });
    }

    const voucherMap = new Map<
      string,
      {
        id: string;
        voucherNo: string;
        voucherDate: Date;
        voucherType: string;
        partyName: string | null;
        narration: string;
        totalAmount: number;
        auditStatus: string;
      }
    >();

    let receipts = 0;
    let payments = 0;

    for (const line of lines) {
      const when = new Date(line.voucher.voucherDate);
      const inPeriod = when >= from;
      const acc = accountById.get(line.accountId);

      if (inPeriod && !voucherMap.has(line.voucher.id)) {
        voucherMap.set(line.voucher.id, line.voucher);
        if (line.voucher.voucherType === "receipt") receipts += line.voucher.totalAmount;
        if (line.voucher.voucherType === "payment") payments += line.voucher.totalAmount;
      }

      if (acc && isCashOrBankAccount(acc)) {
        const bucket = cashMove.get(acc.id);
        if (bucket) {
          if (inPeriod) {
            bucket.moneyIn += line.debit;
            bucket.moneyOut += line.credit;
          } else {
            bucket.before += line.debit - line.credit;
          }
        }
      }

      if (!inPeriod || !acc) continue;
      if (acc.groupType === "income") {
        incomeMap.set(acc.id, (incomeMap.get(acc.id) || 0) + line.credit - line.debit);
      }
      if (acc.groupType === "expenses") {
        expenseMap.set(acc.id, (expenseMap.get(acc.id) || 0) + line.debit - line.credit);
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;

    const income = accounts
      .filter((a) => incomeMap.has(a.id) && Math.abs(incomeMap.get(a.id) || 0) > 0.004)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, amount: round(incomeMap.get(a.id) || 0) }))
      .sort((a, b) => b.amount - a.amount);

    const expenses = accounts
      .filter((a) => expenseMap.has(a.id) && Math.abs(expenseMap.get(a.id) || 0) > 0.004)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, amount: round(expenseMap.get(a.id) || 0) }))
      .sort((a, b) => b.amount - a.amount);

    const cashBank = accounts
      .filter((a) => cashMove.has(a.id))
      .map((a) => {
        const m = cashMove.get(a.id)!;
        const end = m.before + m.moneyIn - m.moneyOut;
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          accountType: a.accountType,
          start: round(m.before),
          moneyIn: round(m.moneyIn),
          moneyOut: round(m.moneyOut),
          end: round(end),
        };
      });

    const incomeTotal = round(income.reduce((s, a) => s + a.amount, 0));
    const expenseTotal = round(expenses.reduce((s, a) => s + a.amount, 0));
    const negativeCash = cashBank.find((a) => a.end < -0.004) || null;
    const year = fyDateRange(fy.label);

    const vouchers = [...voucherMap.values()]
      .sort((a, b) => +new Date(b.voucherDate) - +new Date(a.voucherDate) || b.voucherNo.localeCompare(a.voucherNo))
      .slice(0, 80);

    return NextResponse.json({
      financialYear: { id: fy.id, label: fy.label },
      from: fromStr,
      to: toStr,
      yearFrom: year?.from || null,
      yearTo: year?.to || null,
      receipts: round(receipts),
      payments: round(payments),
      income,
      expenses,
      incomeTotal,
      expenseTotal,
      cashBank,
      vouchers,
      voucherCount: voucherMap.size,
      negativeCash,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load period" }, { status: 500 });
  }
}
