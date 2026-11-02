import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import { getVoucherPrefix } from "@/lib/accounting";
import {
  parseVoucherInput,
  voucherDateInFy,
  type VoucherBody,
} from "@/lib/accounting-voucher-input";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAccountingAuth();
    const schoolId = session.accountingSchoolId;
    const { searchParams } = new URL(request.url);
    const fyId = searchParams.get("financialYearId");
    const type = searchParams.get("type");
    const auditStatus = searchParams.get("auditStatus");
    const q = String(searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));

    const fy = fyId
      ? await prisma.financialYear.findFirst({ where: { id: fyId, schoolId } })
      : await prisma.financialYear.findFirst({ where: { schoolId, isActive: true } });

    if (!fy) {
      return NextResponse.json({
        vouchers: [],
        financialYear: null,
        total: 0,
        page,
        limit,
        canWrite: false,
      });
    }

    const canWrite =
      (session.role === "school_admin" || session.role === "clerk") && !fy.isLocked;

    const where = {
      schoolId,
      financialYearId: fy.id,
      ...(type ? { voucherType: type } : {}),
      ...(auditStatus ? { auditStatus } : {}),
      ...(q
        ? {
            OR: [
              { voucherNo: { contains: q } },
              { partyName: { contains: q } },
              { narration: { contains: q } },
              { billNo: { contains: q } },
            ],
          }
        : {}),
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

    return NextResponse.json({
      vouchers,
      financialYear: fy,
      total,
      page,
      limit,
      canWrite,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as VoucherBody;
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

    const parsed = parseVoucherInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const input = parsed.value;
    const dateError = voucherDateInFy(input.voucherDate, fy);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
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

    const prefix = getVoucherPrefix(input.voucherType);
    const fyTag = fy.label.replace("-", "");

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const voucher = await prisma.$transaction(async (tx) => {
          const count = await tx.voucher.count({
            where: {
              schoolId: session.schoolId,
              financialYearId: fy.id,
              voucherType: input.voucherType,
            },
          });
          const voucherNo = `${prefix}/${fyTag}/${String(count + 1 + attempt).padStart(4, "0")}`;

          return tx.voucher.create({
            data: {
              schoolId: session.schoolId,
              financialYearId: fy.id,
              voucherNo,
              voucherType: input.voucherType,
              voucherDate: input.voucherDate,
              narration: input.narration,
              totalAmount: input.totalAmount,
              referenceNo: input.referenceNo,
              partyName: input.partyName,
              paymentMode: input.paymentMode,
              chequeNo: input.chequeNo,
              bankName: input.bankName,
              billNo: input.billNo,
              billDate: input.billDate,
              gstin: input.gstin,
              isPosted: true,
              createdById: session.userId,
              lines: {
                create: input.lines.map((l) => ({
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
