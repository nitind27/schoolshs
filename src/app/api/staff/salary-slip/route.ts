import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { SLIP_ALL_FIELDS, currentSlipFy, type SlipFieldKey } from "@/lib/salary-slip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId") || "";
    const financialYear = searchParams.get("fy") || currentSlipFy();

    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });

    const [staff, rows] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } }),
      prisma.staffSalarySlipRow.findMany({
        where: { staffId, schoolId: session.schoolId, financialYear },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
    ]);

    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    return NextResponse.json({ financialYear, staff, rows });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch salary slip", rows: [] }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const staffId = String(body.staffId || "");
    const financialYear = String(body.financialYear || "").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });
    if (!/^\d{4}-\d{2}$/.test(financialYear)) {
      return NextResponse.json({ error: "Invalid financial year" }, { status: 400 });
    }

    const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const ops = [];
    for (const row of rows) {
      const month = Number(row.month);
      const year = Number(row.year);
      if (month < 1 || month > 12 || !year) continue;

      const values: Partial<Record<SlipFieldKey, number>> = {};
      for (const f of SLIP_ALL_FIELDS) {
        values[f.key] = Number(row.values?.[f.key]) || 0;
      }

      ops.push(
        prisma.staffSalarySlipRow.upsert({
          where: {
            staffId_financialYear_month: { staffId, financialYear, month },
          },
          create: { schoolId: session.schoolId, staffId, financialYear, month, year, ...values },
          update: { year, ...values },
        }),
      );
    }

    await prisma.$transaction(ops);
    return NextResponse.json({ success: true, saved: ops.length });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save salary slip" }, { status: 500 });
  }
}
