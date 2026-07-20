import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { IT_NUM_FIELDS, IT_TEXT_FIELDS, emptyItForm, type ItFormData } from "@/lib/income-tax";
import { currentSlipFy } from "@/lib/salary-slip";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get("staffId") || "";
    const financialYear = searchParams.get("fy") || currentSlipFy();

    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });

    const [staff, form] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } }),
      prisma.staffIncomeTaxForm.findUnique({
        where: { staffId_financialYear: { staffId, financialYear } },
      }),
    ]);

    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    let data: ItFormData = emptyItForm();
    if (form?.dataJson) {
      try {
        const parsed = JSON.parse(form.dataJson);
        data = { numbers: parsed.numbers || {}, texts: parsed.texts || {} };
      } catch {
        // keep empty form on corrupt json
      }
    }

    return NextResponse.json({ financialYear, staff, data });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch income tax form" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const staffId = String(body.staffId || "");
    const financialYear = String(body.financialYear || "").trim();

    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 });
    if (!/^\d{4}-\d{2}$/.test(financialYear)) {
      return NextResponse.json({ error: "Invalid financial year" }, { status: 400 });
    }

    const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId: session.schoolId } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const numbers: Record<string, number> = {};
    for (const f of IT_NUM_FIELDS) {
      numbers[f.key] = Number(body.data?.numbers?.[f.key]) || 0;
    }
    const texts: Record<string, string> = {};
    for (const f of IT_TEXT_FIELDS) {
      texts[f.key] = String(body.data?.texts?.[f.key] || "").trim();
    }

    const dataJson = JSON.stringify({ numbers, texts });
    await prisma.staffIncomeTaxForm.upsert({
      where: { staffId_financialYear: { staffId, financialYear } },
      create: { schoolId: session.schoolId, staffId, financialYear, dataJson },
      update: { dataJson },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save income tax form" }, { status: 500 });
  }
}
