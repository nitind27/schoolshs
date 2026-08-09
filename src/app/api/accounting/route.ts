import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { DEFAULT_ACCOUNTS, getFinancialYearDates } from "@/lib/accounting";

export async function GET() {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isActive: true },
      include: { _count: { select: { vouchers: true, accounts: true } } },
    });

    const allFyRaw = await prisma.financialYear.findMany({
      where: { schoolId },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { vouchers: true, accounts: true } } },
    });

    const allFinancialYears = allFyRaw.map((y) => ({
      id: y.id,
      label: y.label,
      isActive: y.isActive,
      isLocked: y.isLocked,
      auditStatus: y.auditStatus,
      accounts: y._count.accounts,
      vouchers: y._count.vouchers,
    }));

    const voucherStats = fy
      ? await prisma.voucher.groupBy({
          by: ["auditStatus"],
          where: { schoolId, financialYearId: fy.id },
          _count: true,
          _sum: { totalAmount: true },
        })
      : [];

    const recentVouchers = fy
      ? await prisma.voucher.findMany({
          where: { schoolId, financialYearId: fy.id },
          orderBy: { voucherDate: "desc" },
          take: 5,
          include: { lines: { include: { account: true } } },
        })
      : [];

    const pendingFlagged = fy
      ? await prisma.voucher.count({
          where: {
            schoolId,
            financialYearId: fy.id,
            auditStatus: { in: ["flagged", "query"] },
          },
        })
      : 0;

    return NextResponse.json({
      financialYear: fy,
      allFinancialYears,
      voucherStats,
      recentVouchers,
      pendingFlagged,
      school: {
        id: schoolId,
        name: session.accountingSchoolName || session.schoolName,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to load accounting" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const { label, action, autoInitAccounts } = body as {
      label?: string;
      action?: string;
      autoInitAccounts?: boolean;
    };

    if (action === "init_accounts" && label) {
      const fy = await prisma.financialYear.findFirst({
        where: { schoolId: session.schoolId, label },
      });
      if (!fy) return NextResponse.json({ error: "Financial year not found" }, { status: 404 });

      const existing = await prisma.account.count({ where: { financialYearId: fy.id } });
      if (existing > 0) {
        return NextResponse.json({ error: "Accounts already initialized", count: existing }, { status: 400 });
      }

      await prisma.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a) => ({
          schoolId: session.schoolId,
          financialYearId: fy.id,
          code: a.code,
          name: a.name,
          groupType: a.groupType,
          accountType: a.accountType,
          balanceType: a.balanceType,
        })),
      });

      return NextResponse.json({ success: true, count: DEFAULT_ACCOUNTS.length });
    }

    if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });

    const dates = getFinancialYearDates(label);
    await prisma.financialYear.updateMany({
      where: { schoolId: session.schoolId },
      data: { isActive: false },
    });

    const fy = await prisma.financialYear.upsert({
      where: { schoolId_label: { schoolId: session.schoolId, label } },
      create: {
        schoolId: session.schoolId,
        label,
        startDate: dates.startDate,
        endDate: dates.endDate,
        isActive: true,
      },
      update: { isActive: true },
      include: { _count: { select: { accounts: true, vouchers: true } } },
    });

    let accountsInitialized = 0;
    // New / empty FY → auto create standard ledgers so screen is not blank
    if (autoInitAccounts !== false && fy._count.accounts === 0) {
      await prisma.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a) => ({
          schoolId: session.schoolId,
          financialYearId: fy.id,
          code: a.code,
          name: a.name,
          groupType: a.groupType,
          accountType: a.accountType,
          balanceType: a.balanceType,
        })),
      });
      accountsInitialized = DEFAULT_ACCOUNTS.length;
    }

    const refreshed = await prisma.financialYear.findUnique({
      where: { id: fy.id },
      include: { _count: { select: { accounts: true, vouchers: true } } },
    });

    return NextResponse.json({
      ...refreshed,
      accountsInitialized,
      message:
        accountsInitialized > 0
          ? `FY ${label} activated · ${accountsInitialized} standard ledgers created`
          : `FY ${label} is now active`,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
