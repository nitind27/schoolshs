import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["ca"]);
    const { voucherId, auditStatus, auditRemarks } = await request.json();

    if (!voucherId || !auditStatus) {
      return NextResponse.json({ error: "voucherId and auditStatus required" }, { status: 400 });
    }

    const existing = await prisma.voucher.findFirst({
      where: { id: voucherId, schoolId: session.accountingSchoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Voucher not found for this school" }, { status: 404 });
    }

    const fy = await prisma.financialYear.findFirst({
      where: { id: existing.financialYearId, schoolId: session.accountingSchoolId },
    });
    if (!fy || (fy.auditStatus !== "submitted" && fy.auditStatus !== "in_review" && fy.auditStatus !== "verified")) {
      if (fy?.auditStatus === "open" || fy?.auditStatus === "pending") {
        return NextResponse.json({ error: "School has not submitted books to CA yet" }, { status: 400 });
      }
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

    if (fy) {
      await prisma.financialYear.update({
        where: { id: fy.id, schoolId: session.accountingSchoolId },
        data: { auditStatus: "in_review" },
      });

      const pending = await prisma.voucher.count({
        where: { schoolId: session.accountingSchoolId, financialYearId: fy.id, auditStatus: "pending" },
      });
      if (pending === 0) {
        await prisma.financialYear.update({
          where: { id: fy.id, schoolId: session.accountingSchoolId },
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
