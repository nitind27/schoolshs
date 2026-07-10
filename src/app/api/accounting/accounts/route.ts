import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { getGroupBalanceType, suggestNextAccountCode } from "@/lib/accounting";

export async function GET() {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.role === "ca" ? session.accountingSchoolId : session.schoolId;
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isActive: true },
    });
    if (!fy) return NextResponse.json({ accounts: [], financialYear: null });

    const accounts = await prisma.account.findMany({
      where: { schoolId, financialYearId: fy.id, isActive: true },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({ accounts, financialYear: fy });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const { name, groupType, code, accountType } = body;

    if (!name?.trim() || !groupType) {
      return NextResponse.json({ error: "Account name and group required" }, { status: 400 });
    }

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy) {
      return NextResponse.json({ error: "Active financial year not set" }, { status: 400 });
    }
    if (fy.isLocked) {
      return NextResponse.json({ error: "Financial year locked — cannot add accounts" }, { status: 400 });
    }

    const existing = await prisma.account.findMany({
      where: { schoolId: session.schoolId, financialYearId: fy.id },
      select: { code: true, name: true },
    });

    const trimmedName = String(name).trim();
    if (existing.some((a) => a.name.toLowerCase() === trimmedName.toLowerCase())) {
      return NextResponse.json({ error: "Account with this name already exists" }, { status: 400 });
    }

    let accountCode = code?.trim();
    if (accountCode) {
      const clash = existing.some((a) => a.code === accountCode);
      if (clash) {
        return NextResponse.json({ error: `Account code ${accountCode} already used` }, { status: 400 });
      }
    } else {
      accountCode = suggestNextAccountCode(groupType, existing.map((a) => a.code));
    }

    const resolvedType =
      accountType ||
      (groupType === "assets" && trimmedName.toLowerCase().includes("bank")
        ? "bank"
        : groupType === "income"
          ? "fee"
          : groupType === "expenses"
            ? "general"
            : groupType === "liabilities"
              ? "payable"
              : "general");

    const account = await prisma.account.create({
      data: {
        schoolId: session.schoolId,
        financialYearId: fy.id,
        code: accountCode,
        name: trimmedName,
        groupType,
        accountType: resolvedType,
        balanceType: getGroupBalanceType(groupType),
      },
    });

    return NextResponse.json({ account, message: "Ledger account added" });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
