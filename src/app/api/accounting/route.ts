import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { DEFAULT_ACCOUNTS, getFinancialYearDates } from "@/lib/accounting";

export async function GET() {
  try {
    const session = await requireAccountingAuth();
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
      include: { _count: { select: { vouchers: true, accounts: true } } },
    });

    const allFy = await prisma.financialYear.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { startDate: "desc" },
    });

    const voucherStats = fy
      ? await prisma.voucher.groupBy({
          by: ["auditStatus"],
          where: { schoolId: session.schoolId, financialYearId: fy.id },
          _count: true,
          _sum: { totalAmount: true },
        })
      : [];

    const recentVouchers = fy
      ? await prisma.voucher.findMany({
          where: { schoolId: session.schoolId, financialYearId: fy.id },
          orderBy: { voucherDate: "desc" },
          take: 5,
          include: { lines: { include: { account: true } } },
        })
      : [];

    return NextResponse.json({ financialYear: fy, allFinancialYears: allFy, voucherStats, recentVouchers });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to load accounting" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const { label, action } = await request.json();

    if (action === "init_accounts" && label) {
      const fy = await prisma.financialYear.findFirst({
        where: { schoolId: session.schoolId, label },
      });
      if (!fy) return NextResponse.json({ error: "Financial year not found" }, { status: 404 });

      const existing = await prisma.account.count({ where: { financialYearId: fy.id } });
      if (existing > 0) return NextResponse.json({ error: "Accounts already initialized" }, { status: 400 });

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
    });

    return NextResponse.json(fy);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
