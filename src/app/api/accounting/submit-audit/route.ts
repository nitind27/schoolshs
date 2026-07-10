import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAccountingAuth, AuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAccountingAuth(["school_admin"]);
    const { remarks } = await request.json().catch(() => ({}));

    const fy = await prisma.financialYear.findFirst({
      where: { schoolId: session.schoolId, isActive: true },
      include: { _count: { select: { vouchers: true, accounts: true } } },
    });

    if (!fy) {
      return NextResponse.json({ error: "Active financial year not found" }, { status: 404 });
    }
    if (fy._count.accounts === 0) {
      return NextResponse.json({ error: "Initialize chart of accounts before submitting" }, { status: 400 });
    }
    if (fy._count.vouchers === 0) {
      return NextResponse.json({ error: "Add at least one voucher before submitting to CA" }, { status: 400 });
    }
    if (fy.auditStatus === "submitted" || fy.auditStatus === "in_review") {
      return NextResponse.json({ error: "Books already submitted to CA" }, { status: 400 });
    }
    if (fy.auditStatus === "verified") {
      return NextResponse.json({ error: "Financial year already verified by CA" }, { status: 400 });
    }
    if (fy.isLocked && fy.auditStatus !== "returned") {
      return NextResponse.json({ error: "Financial year is locked" }, { status: 400 });
    }

    const draftVouchers = await prisma.voucher.count({
      where: { schoolId: session.schoolId, financialYearId: fy.id, auditStatus: "flagged" },
    });
    if (draftVouchers > 0) {
      return NextResponse.json({
        error: "Resolve flagged vouchers before submitting to CA",
      }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const financialYear = await tx.financialYear.update({
        where: { id: fy.id, schoolId: session.schoolId },
        data: {
          auditStatus: "submitted",
          isLocked: true,
          submittedAt: new Date(),
          submittedById: session.userId,
          submittedRemarks: remarks || null,
        },
      });

      const existingSession = await tx.caAuditSession.findFirst({
        where: {
          schoolId: session.schoolId,
          financialYearId: fy.id,
          status: { in: ["pending_review", "in_progress"] },
        },
      });

      if (existingSession) {
        await tx.caAuditSession.update({
          where: { id: existingSession.id },
          data: { status: "pending_review", completedAt: null },
        });
      } else {
        await tx.caAuditSession.create({
          data: {
            schoolId: session.schoolId,
            financialYearId: fy.id,
            status: "pending_review",
          },
        });
      }

      return financialYear;
    });

    return NextResponse.json({
      success: true,
      financialYear: updated,
      message: "Books submitted to CA portal successfully",
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to submit to CA" }, { status: 500 });
  }
}
