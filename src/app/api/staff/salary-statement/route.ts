import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  SALARY_CATEGORIES,
  SALARY_FIELDS,
  currentFinancialYear,
  type SalaryCategory,
  type SalaryFieldKey,
} from "@/lib/salary-statement";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get("fy") || currentFinancialYear();

    const rows = await prisma.salaryStatementRow.findMany({
      where: { schoolId: session.schoolId, financialYear },
      orderBy: [{ category: "asc" }, { year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json({ financialYear, rows });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch salary statement", rows: [] }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const financialYear = String(body.financialYear || "").trim();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!/^\d{4}-\d{2}$/.test(financialYear)) {
      return NextResponse.json({ error: "Invalid financial year" }, { status: 400 });
    }

    const ops = [];
    for (const row of rows) {
      const category = String(row.category || "") as SalaryCategory;
      const month = Number(row.month);
      const year = Number(row.year);
      if (!SALARY_CATEGORIES.includes(category) || month < 1 || month > 12 || !year) continue;

      const values: Partial<Record<SalaryFieldKey, number>> = {};
      for (const f of SALARY_FIELDS) {
        values[f.key] = Number(row.values?.[f.key]) || 0;
      }

      ops.push(
        prisma.salaryStatementRow.upsert({
          where: {
            schoolId_financialYear_category_month: {
              schoolId: session.schoolId,
              financialYear,
              category,
              month,
            },
          },
          create: { schoolId: session.schoolId, financialYear, category, month, year, ...values },
          update: { year, ...values },
        }),
      );
    }

    await prisma.$transaction(ops);
    return NextResponse.json({ success: true, saved: ops.length });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save salary statement" }, { status: 500 });
  }
}
