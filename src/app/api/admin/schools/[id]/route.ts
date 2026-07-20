import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { normalizeFeatureList } from "@/lib/school-features";
import { parseDate, parseDecimal } from "@/lib/admin-school";
import { Prisma } from "@/generated/prisma/client";

const schoolInclude = {
  _count: { select: { students: true, users: true, classes: true, staff: true, payments: true } },
  users: {
    where: { role: "school_admin" },
    select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true },
  },
  subscription: true,
  settings: true,
  payments: { orderBy: { paymentDate: "desc" as const }, take: 20 },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const school = await prisma.school.findUnique({ where: { id }, include: schoolInclude });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
    return NextResponse.json(school);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.school.findUnique({ where: { id }, include: { subscription: true } });
    if (!existing) return NextResponse.json({ error: "School not found" }, { status: 404 });

    if (body.code) {
      const code = String(body.code).trim().toUpperCase().replace(/\s/g, "");
      const dup = await prisma.school.findFirst({ where: { code, NOT: { id } } });
      if (dup) return NextResponse.json({ error: "School code already exists" }, { status: 409 });
    }

    if (body.udiseCode) {
      const udise = String(body.udiseCode).trim();
      const dup = await prisma.school.findFirst({ where: { udiseCode: udise, NOT: { id } } });
      if (dup) return NextResponse.json({ error: "UDISE code already exists" }, { status: 409 });
    }

    const schoolData: Prisma.SchoolUpdateInput = {};
    const scalarFields = [
      "name", "code", "district", "taluka", "city", "pincode", "address",
      "phone", "alternatePhone", "email", "website", "principalName",
      "schoolType", "boardAffiliation", "udiseCode", "isActive",
    ] as const;

    for (const field of scalarFields) {
      if (body[field] !== undefined) {
        if (field === "code") schoolData.code = String(body.code).trim().toUpperCase().replace(/\s/g, "");
        else if (field === "isActive") schoolData.isActive = Boolean(body.isActive);
        else schoolData[field] = body[field] || null;
      }
    }

    const subData: Prisma.SchoolSubscriptionUpdateInput = {};
    if (body.planName !== undefined) subData.planName = String(body.planName);
    if (body.contractNumber !== undefined) subData.contractNumber = body.contractNumber || null;
    if (body.contractValue !== undefined) {
      const v = parseDecimal(body.contractValue);
      subData.contractValue = v != null ? new Prisma.Decimal(v) : null;
    }
    if (body.contractStartDate !== undefined) subData.contractStartDate = parseDate(body.contractStartDate);
    if (body.contractEndDate !== undefined) subData.contractEndDate = parseDate(body.contractEndDate);
    if (body.contractNotes !== undefined) subData.contractNotes = body.contractNotes || null;
    if (body.contractDocumentPath !== undefined) subData.contractDocumentPath = body.contractDocumentPath || null;
    if (body.enabledFeatures !== undefined) subData.enabledFeatures = normalizeFeatureList(body.enabledFeatures);
    if (body.paymentStatus !== undefined) subData.paymentStatus = String(body.paymentStatus);
    if (body.totalAmount !== undefined) {
      const v = parseDecimal(body.totalAmount);
      subData.totalAmount = v != null ? new Prisma.Decimal(v) : null;
    }
    if (body.paidAmount !== undefined) {
      const v = parseDecimal(body.paidAmount);
      if (v != null) subData.paidAmount = new Prisma.Decimal(v);
    }
    if (body.nextDueDate !== undefined) subData.nextDueDate = parseDate(body.nextDueDate);

    const school = await prisma.$transaction(async (tx) => {
      await tx.school.update({ where: { id }, data: schoolData });

      if (Object.keys(subData).length) {
        if (existing.subscription) {
          await tx.schoolSubscription.update({ where: { schoolId: id }, data: subData });
        } else {
          await tx.schoolSubscription.create({
            data: {
              schoolId: id,
              planName: String(body.planName || "standard"),
              enabledFeatures: normalizeFeatureList(body.enabledFeatures),
              ...subData,
            } as Prisma.SchoolSubscriptionCreateInput,
          });
        }
      }

      if (body.logoPath !== undefined) {
        await tx.schoolSettings.upsert({
          where: { schoolId: id },
          create: { schoolId: id, schoolName: existing.name, logoPath: body.logoPath || null },
          update: { logoPath: body.logoPath || null },
        });
      }

      return tx.school.findUniqueOrThrow({ where: { id }, include: schoolInclude });
    });

    return NextResponse.json(school);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}
