import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";
import {
  parseVoucherInput,
  voucherDateInFy,
  type VoucherBody,
} from "@/lib/accounting-voucher-input";

const voucherInclude = {
  lines: { include: { account: true } },
  createdBy: { select: { name: true } },
  financialYear: {
    select: { id: true, label: true, isLocked: true, startDate: true, endDate: true },
  },
} as const;

function canWriteRole(role: string) {
  return role === "school_admin" || role === "clerk";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAccountingAuth();
    const { id } = await params;
    const voucher = await prisma.voucher.findFirst({
      where: { id, schoolId: session.accountingSchoolId },
      include: voucherInclude,
    });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }
    const locked = Boolean(voucher.financialYear.isLocked);
    return NextResponse.json({
      voucher,
      financialYear: voucher.financialYear,
      canWrite: canWriteRole(session.role) && !locked,
      isLocked: locked,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const voucher = await prisma.voucher.findFirst({
      where: { id, schoolId: session.schoolId },
      include: { financialYear: true },
    });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }
    if (voucher.financialYear.isLocked) {
      return NextResponse.json(
        { error: "Financial year is locked — cannot edit vouchers" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as VoucherBody;
    const parsed = parseVoucherInput({
      ...body,
      voucherType: body.voucherType || voucher.voucherType,
    });
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const input = parsed.value;
    const dateError = voucherDateInFy(input.voucherDate, voucher.financialYear);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const validAccounts = await prisma.account.count({
      where: {
        id: { in: accountIds },
        schoolId: session.schoolId,
        financialYearId: voucher.financialYearId,
        isActive: true,
      },
    });
    if (validAccounts !== accountIds.length) {
      return NextResponse.json(
        { error: "Invalid or inactive account selected for this financial year" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.voucherLine.deleteMany({ where: { voucherId: voucher.id } });
      return tx.voucher.update({
        where: { id: voucher.id },
        data: {
          voucherType: input.voucherType || voucher.voucherType,
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
          auditStatus: "pending",
          auditRemarks: null,
          auditedAt: null,
          auditedBy: null,
          lines: {
            create: input.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: voucherInclude,
      });
    });

    return NextResponse.json({
      voucher: updated,
      resetAudit: voucher.auditStatus !== "pending",
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to update voucher" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAccountingAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const voucher = await prisma.voucher.findFirst({
      where: { id, schoolId: session.schoolId },
      include: { financialYear: { select: { isLocked: true } } },
    });
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }
    if (voucher.financialYear.isLocked) {
      return NextResponse.json(
        { error: "Financial year is locked — cannot delete vouchers" },
        { status: 400 },
      );
    }

    await prisma.voucher.delete({ where: { id: voucher.id } });
    return NextResponse.json({ success: true, id: voucher.id, voucherNo: voucher.voucherNo });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete voucher" }, { status: 500 });
  }
}
