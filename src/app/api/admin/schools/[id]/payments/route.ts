import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { parseDate } from "@/lib/admin-school";
import { Prisma } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const payments = await prisma.schoolPayment.findMany({
      where: { schoolId: id },
      orderBy: { paymentDate: "desc" },
    });
    return NextResponse.json({ payments });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: { subscription: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.schoolPayment.create({
        data: {
          schoolId: id,
          amount: new Prisma.Decimal(amount),
          paymentDate: parseDate(body.paymentDate) ?? new Date(),
          paymentMethod: body.paymentMethod || null,
          referenceNo: body.referenceNo || null,
          notes: body.notes || null,
          receivedBy: body.receivedBy || "Super Admin",
        },
      });

      const sub = school.subscription;
      const prevPaid = sub ? Number(sub.paidAmount) : 0;
      const newPaid = prevPaid + amount;
      const total = sub?.totalAmount != null ? Number(sub.totalAmount) : null;

      let paymentStatus = "partial";
      if (total != null && newPaid >= total) paymentStatus = "paid";
      else if (newPaid <= 0) paymentStatus = "pending";

      await tx.schoolSubscription.upsert({
        where: { schoolId: id },
        create: {
          schoolId: id,
          paidAmount: new Prisma.Decimal(newPaid),
          paymentStatus,
          enabledFeatures: [],
        },
        update: {
          paidAmount: new Prisma.Decimal(newPaid),
          paymentStatus,
        },
      });

      return created;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
