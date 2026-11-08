import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { ACCOUNT_GROUPS, getGroupBalanceType, openingOnSide } from "@/lib/accounting";

type Ctx = { params: Promise<{ id: string }> };

function resolveAccountType(groupType: string, name: string) {
  const lower = name.toLowerCase();
  if (groupType === "assets" && lower.includes("bank")) return "bank";
  if (groupType === "assets" && lower.includes("cash")) return "cash";
  if (groupType === "income") return "fee";
  if (groupType === "expenses") return "general";
  if (groupType === "liabilities") return "payable";
  if (groupType === "capital") return "fund";
  return "general";
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const { id } = await ctx.params;
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!fy) return NextResponse.json({ error: "Active financial year not set" }, { status: 400 });

    const account = await prisma.account.findFirst({
      where: { id, schoolId, financialYearId: fy.id },
    });
    if (!account) return NextResponse.json({ error: "Ledger not found" }, { status: 404 });

    const lines = await prisma.voucherLine.findMany({
      where: { accountId: account.id, voucher: { schoolId, financialYearId: fy.id, isPosted: true } },
      include: {
        voucher: {
          select: {
            id: true,
            voucherNo: true,
            voucherDate: true,
            voucherType: true,
            narration: true,
            partyName: true,
          },
        },
      },
    });

    lines.sort((a, b) => {
      const byDate = +new Date(a.voucher.voucherDate) - +new Date(b.voucher.voucherDate);
      if (byDate !== 0) return byDate;
      return a.voucher.voucherNo.localeCompare(b.voucher.voucherNo);
    });

    const open = openingOnSide(account.openingBalance, account.balanceType);
    let running = open.debit - open.credit;
    const statement = lines.map((line) => {
      running += line.debit - line.credit;
      const side = running > 0.004 ? "debit" : running < -0.004 ? "credit" : "debit";
      return {
        id: line.id,
        voucherId: line.voucher.id,
        voucherNo: line.voucher.voucherNo,
        voucherDate: line.voucher.voucherDate,
        voucherType: line.voucher.voucherType,
        partyName: line.voucher.partyName,
        narration: line.description || line.voucher.narration,
        debit: line.debit,
        credit: line.credit,
        balance: Math.round(Math.abs(running) * 100) / 100,
        balanceSide: side,
      };
    });

    return NextResponse.json({
      account,
      openingDebit: open.debit,
      openingCredit: open.credit,
      lines: statement,
      financialYear: fy,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const { id } = await ctx.params;
    const body = await request.json();

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy) return NextResponse.json({ error: "Active financial year not set" }, { status: 400 });
    if (fy.isLocked) {
      return NextResponse.json({ error: "Financial year locked", code: "FY_LOCKED" }, { status: 400 });
    }

    const existing = await prisma.account.findFirst({
      where: { id, schoolId: session.schoolId, financialYearId: fy.id },
    });
    if (!existing) return NextResponse.json({ error: "Ledger not found" }, { status: 404 });

    const name = body.name != null ? String(body.name).trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "Account name required", code: "NAME_REQUIRED" }, { status: 400 });
    }

    const groupType = body.groupType != null ? String(body.groupType) : existing.groupType;
    if (!ACCOUNT_GROUPS.some((g) => g.value === groupType)) {
      return NextResponse.json({ error: "Invalid group", code: "BAD_GROUP" }, { status: 400 });
    }

    const code = body.code != null ? String(body.code).trim() : existing.code;
    if (!code) {
      return NextResponse.json({ error: "Account code required", code: "CODE_REQUIRED" }, { status: 400 });
    }

    let opening = existing.openingBalance;
    if (body.openingBalance != null && body.openingBalance !== "") {
      const n = Number(body.openingBalance);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Opening amount must be 0 or more", code: "BAD_OPENING" }, { status: 400 });
      }
      opening = Math.round(n * 100) / 100;
    }

    const balanceType =
      body.balanceType === "credit" || body.balanceType === "debit"
        ? body.balanceType
        : groupType !== existing.groupType
          ? getGroupBalanceType(groupType)
          : existing.balanceType;

    const peers = await prisma.account.findMany({
      where: { schoolId: session.schoolId, financialYearId: fy.id, NOT: { id } },
      select: { code: true, name: true },
    });
    if (peers.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: "Account with this name already exists", code: "DUPLICATE_NAME" }, { status: 400 });
    }
    if (peers.some((a) => a.code === code)) {
      return NextResponse.json({ error: `Account code ${code} already used`, code: "DUPLICATE_CODE" }, { status: 400 });
    }

    const accountType =
      groupType !== existing.groupType ? resolveAccountType(groupType, name) : existing.accountType;

    const account = await prisma.account.update({
      where: { id },
      data: { name, code, groupType, balanceType, openingBalance: opening, accountType },
    });

    return NextResponse.json({ account, message: "Ledger saved" });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to update ledger" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const { id } = await ctx.params;

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy) return NextResponse.json({ error: "Active financial year not set" }, { status: 400 });
    if (fy.isLocked) {
      return NextResponse.json({ error: "Financial year locked", code: "FY_LOCKED" }, { status: 400 });
    }

    const existing = await prisma.account.findFirst({
      where: { id, schoolId: session.schoolId, financialYearId: fy.id },
    });
    if (!existing) return NextResponse.json({ error: "Ledger not found" }, { status: 404 });

    const used = await prisma.voucherLine.count({ where: { accountId: id } });
    if (used > 0) {
      return NextResponse.json(
        { error: "Ledger has vouchers", code: "HAS_VOUCHERS" },
        { status: 400 },
      );
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete ledger" }, { status: 500 });
  }
}
