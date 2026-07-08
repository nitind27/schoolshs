import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["ca", "school_admin"]);
    const { voucherId, auditStatus, auditRemarks } = await request.json();

    if (!voucherId || !auditStatus) {
      return NextResponse.json({ error: "voucherId and auditStatus required" }, { status: 400 });
    }

    const voucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        auditStatus,
        auditRemarks,
        auditedAt: new Date(),
        auditedBy: session.name,
      },
    });

    const fy = await prisma.financialYear.findUnique({ where: { id: voucher.financialYearId } });
    if (fy) {
      const pending = await prisma.voucher.count({
        where: { financialYearId: fy.id, auditStatus: "pending" },
      });
      if (pending === 0) {
        await prisma.financialYear.update({
          where: { id: fy.id },
          data: { auditStatus: "verified" },
        });
      }
    }

    return NextResponse.json(voucher);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
