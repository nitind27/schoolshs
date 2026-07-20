import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { getVoucherPrefix } from "@/lib/accounting";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const { searchParams } = new URL(request.url);
    const fyId = searchParams.get("financialYearId");
    const type = searchParams.get("type");
    const auditStatus = searchParams.get("auditStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const fy = fyId
      ? await prisma.financialYear.findFirst({ where: { id: fyId, schoolId } })
      : await prisma.financialYear.findFirst({ where: { schoolId, isActive: true } });

    if (!fy) return NextResponse.json({ vouchers: [], financialYear: null, total: 0, page, limit });

    const where = {
      schoolId,
      financialYearId: fy.id,
      ...(type ? { voucherType: type } : {}),
      ...(auditStatus ? { auditStatus } : {}),
    };

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        orderBy: { voucherDate: "desc" },
        include: {
          lines: { include: { account: true } },
          createdBy: { select: { name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.voucher.count({ where }),
    ]);

    return NextResponse.json({ vouchers, financialYear: fy, total, page, limit });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy || fy.isLocked) return NextResponse.json({ error: "Financial year locked or missing" }, { status: 400 });

    const { voucherType, voucherDate, narration, referenceNo, partyName, paymentMode, chequeNo, bankName, billNo, billDate, gstin, lines } = body;

    if (!lines?.length || lines.length < 2) {
      return NextResponse.json({ error: "Minimum 2 ledger entries required (double entry)" }, { status: 400 });
    }

    const accountIds = [...new Set(lines.map((l: { accountId: string }) => l.accountId))] as string[];
    const validAccounts = await prisma.account.count({
      where: {
        id: { in: accountIds },
        schoolId: session.schoolId,
        financialYearId: fy.id,
      },
    });
    if (validAccounts !== accountIds.length) {
      return NextResponse.json({ error: "Invalid account selected for this school" }, { status: 400 });
    }

    const totalDebit = lines.reduce((s: number, l: { debit?: number }) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s: number, l: { credit?: number }) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: "Debit and Credit must be equal" }, { status: 400 });
    }

    const prefix = getVoucherPrefix(voucherType);
    const count = await prisma.voucher.count({ where: { schoolId: session.schoolId, financialYearId: fy.id, voucherType } });
    const voucherNo = `${prefix}/${fy.label.replace("-", "")}/${String(count + 1).padStart(4, "0")}`;

    const voucher = await prisma.voucher.create({
      data: {
        schoolId: session.schoolId,
        financialYearId: fy.id,
        voucherNo,
        voucherType,
        voucherDate: new Date(voucherDate),
        narration,
        totalAmount: totalDebit,
        referenceNo,
        partyName,
        paymentMode,
        chequeNo,
        bankName,
        billNo,
        billDate: billDate ? new Date(billDate) : null,
        gstin,
        createdById: session.userId,
        lines: {
          create: lines.map((l: { accountId: string; debit?: number; credit?: number; description?: string }) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    return NextResponse.json(voucher);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create voucher" }, { status: 500 });
  }
}
