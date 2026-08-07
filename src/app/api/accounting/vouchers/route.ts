import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { getVoucherPrefix, VOUCHER_TYPES } from "@/lib/accounting";

const ALLOWED_TYPES = new Set<string>(VOUCHER_TYPES.map((v) => v.value));

export async function GET(request: NextRequest) {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const { searchParams } = new URL(request.url);
    const fyId = searchParams.get("financialYearId");
    const type = searchParams.get("type");
    const auditStatus = searchParams.get("auditStatus");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));

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
        orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
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

type LineInput = {
  accountId?: string;
  debit?: number;
  credit?: number;
  description?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
    });
    if (!fy) {
      return NextResponse.json({ error: "Active financial year not set" }, { status: 400 });
    }
    if (fy.isLocked) {
      return NextResponse.json(
        { error: "Financial year is locked — cannot post vouchers" },
        { status: 400 },
      );
    }

    const {
      voucherType,
      voucherDate,
      narration,
      referenceNo,
      partyName,
      paymentMode,
      chequeNo,
      bankName,
      billNo,
      billDate,
      gstin,
      lines,
    } = body as {
      voucherType?: string;
      voucherDate?: string;
      narration?: string;
      referenceNo?: string;
      partyName?: string;
      paymentMode?: string;
      chequeNo?: string;
      bankName?: string;
      billNo?: string;
      billDate?: string;
      gstin?: string;
      lines?: LineInput[];
    };

    if (!voucherType || !ALLOWED_TYPES.has(voucherType)) {
      return NextResponse.json(
        { error: "Valid voucher type required (receipt/payment/journal/contra)" },
        { status: 400 },
      );
    }
    if (!voucherDate || !/^\d{4}-\d{2}-\d{2}/.test(String(voucherDate))) {
      return NextResponse.json({ error: "Valid voucher date required" }, { status: 400 });
    }

    const vDate = new Date(voucherDate);
    if (Number.isNaN(vDate.getTime())) {
      return NextResponse.json({ error: "Invalid voucher date" }, { status: 400 });
    }
    const fyStart = new Date(fy.startDate);
    const fyEnd = new Date(fy.endDate);
    fyEnd.setHours(23, 59, 59, 999);
    if (vDate < fyStart || vDate > fyEnd) {
      return NextResponse.json(
        {
          error: `Voucher date must be within FY ${fy.label} (${fyStart.toISOString().slice(0, 10)} → ${fyEnd.toISOString().slice(0, 10)})`,
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json(
        { error: "Minimum 2 ledger entries required (double entry)" },
        { status: 400 },
      );
    }

    const normalized: { accountId: string; debit: number; credit: number; description: string | null }[] = [];
    for (const raw of lines) {
      const accountId = String(raw.accountId || "").trim();
      const debit = Math.round((Number(raw.debit) || 0) * 100) / 100;
      const credit = Math.round((Number(raw.credit) || 0) * 100) / 100;
      if (!accountId) {
        return NextResponse.json({ error: "Every line must have an account" }, { status: 400 });
      }
      if (debit < 0 || credit < 0) {
        return NextResponse.json({ error: "Debit/Credit cannot be negative" }, { status: 400 });
      }
      if (debit > 0 && credit > 0) {
        return NextResponse.json(
          { error: "A line cannot have both debit and credit" },
          { status: 400 },
        );
      }
      if (debit === 0 && credit === 0) {
        return NextResponse.json(
          { error: "Each line must have either debit or credit amount" },
          { status: 400 },
        );
      }
      normalized.push({
        accountId,
        debit,
        credit,
        description: raw.description?.trim() || null,
      });
    }

    const accountIds = [...new Set(normalized.map((l) => l.accountId))];
    const validAccounts = await prisma.account.count({
      where: {
        id: { in: accountIds },
        schoolId: session.schoolId,
        financialYearId: fy.id,
        isActive: true,
      },
    });
    if (validAccounts !== accountIds.length) {
      return NextResponse.json(
        { error: "Invalid or inactive account selected for this financial year" },
        { status: 400 },
      );
    }

    const totalDebit = normalized.reduce((s, l) => s + l.debit, 0);
    const totalCredit = normalized.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: "Debit and Credit must be equal" }, { status: 400 });
    }
    if (totalDebit <= 0) {
      return NextResponse.json({ error: "Voucher amount must be greater than zero" }, { status: 400 });
    }

    const prefix = getVoucherPrefix(voucherType);
    const fyTag = fy.label.replace("-", "");

    // Retry on unique voucherNo collision under concurrency
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const voucher = await prisma.$transaction(async (tx) => {
          const count = await tx.voucher.count({
            where: {
              schoolId: session.schoolId,
              financialYearId: fy.id,
              voucherType,
            },
          });
          const voucherNo = `${prefix}/${fyTag}/${String(count + 1 + attempt).padStart(4, "0")}`;

          return tx.voucher.create({
            data: {
              schoolId: session.schoolId,
              financialYearId: fy.id,
              voucherNo,
              voucherType,
              voucherDate: vDate,
              narration: String(narration || "").trim(),
              totalAmount: totalDebit,
              referenceNo: referenceNo?.trim() || null,
              partyName: partyName?.trim() || null,
              paymentMode: paymentMode || null,
              chequeNo: chequeNo?.trim() || null,
              bankName: bankName?.trim() || null,
              billNo: billNo?.trim() || null,
              billDate: billDate ? new Date(billDate) : null,
              gstin: gstin?.trim() || null,
              isPosted: true,
              createdById: session.userId,
              lines: {
                create: normalized.map((l) => ({
                  accountId: l.accountId,
                  debit: l.debit,
                  credit: l.credit,
                  description: l.description,
                })),
              },
            },
            include: { lines: { include: { account: true } } },
          });
        });
        return NextResponse.json(voucher);
      } catch (err) {
        lastError = err;
        const code = (err as { code?: string })?.code;
        if (code === "P2002") continue;
        throw err;
      }
    }

    console.error("[voucher create] numbering failed", lastError);
    return NextResponse.json(
      { error: "Could not generate unique voucher number — try again" },
      { status: 500 },
    );
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create voucher" }, { status: 500 });
  }
}
