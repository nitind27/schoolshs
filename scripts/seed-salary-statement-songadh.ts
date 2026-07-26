/**
 * Seed Annual Salary Statement dummy data for SONGADH001
 * Usage: npx tsx scripts/seed-salary-statement-songadh.ts
 */
import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { createPrismaClient } from "../src/lib/prisma-factory";
import {
  SALARY_CATEGORIES,
  currentFinancialYear,
  emptyValues,
  fyMonths,
  type SalaryCategory,
  type SalaryFieldKey,
} from "../src/lib/salary-statement";

const SCHOOL_CODE = "SONGADH001";

/** Realistic base monthly packages by staff category (₹) */
const CATEGORY_BASE: Record<
  SalaryCategory,
  { basic: number; daPct: number; hra: number; ma: number; extras: Partial<Record<SalaryFieldKey, number>> }
> = {
  secondary: {
    basic: 44900,
    daPct: 0.42,
    hra: 3600,
    ma: 300,
    extras: { fpa: 500, wa: 200, prA: 150 },
  },
  higher_secondary: {
    basic: 53100,
    daPct: 0.42,
    hra: 4500,
    ma: 300,
    extras: { fpa: 700, hndA: 400, wa: 250, prA: 200 },
  },
  non_teaching: {
    basic: 25500,
    daPct: 0.42,
    hra: 2200,
    ma: 300,
    extras: { caA: 600, wa: 150 },
  },
  peon: {
    basic: 18000,
    daPct: 0.42,
    hra: 1500,
    ma: 300,
    extras: { wa: 100, suA: 200 },
  },
};

function round(n: number): number {
  return Math.round(n);
}

function valuesForMonth(category: SalaryCategory, monthIndex: number): Record<SalaryFieldKey, number> {
  const cfg = CATEGORY_BASE[category];
  const values = emptyValues();

  // Slight month-to-month variation so totals look real
  const bump = 1 + ((monthIndex % 5) - 2) * 0.005;

  values.basic = round(cfg.basic * bump);
  values.da = round(values.basic * cfg.daPct);
  values.hra = cfg.hra;
  values.ma = cfg.ma;

  for (const [k, v] of Object.entries(cfg.extras)) {
    values[k as SalaryFieldKey] = Number(v) || 0;
  }

  // Bonus in Diwali month (Oct = 10) and March year-end feel
  if (monthIndex === 7) values.bonus = round(values.basic * 0.5); // Oct in FY Mar-start index 7
  if (monthIndex === 11) values.daArrears = round(values.da * 0.15); // Feb
  if (monthIndex === 0) values.salaryArrears = round(values.basic * 0.08); // Mar

  return values;
}

async function main() {
  const prisma = createPrismaClient();
  try {
    const schools = await prisma.$queryRawUnsafe<{ id: string; name: string; code: string }[]>(
      `SELECT id, name, code FROM school WHERE UPPER(code) = UPPER(?) LIMIT 1`,
      SCHOOL_CODE,
    );
    const schoolRow = schools[0] || null;

    if (!schoolRow) {
      console.error(`School not found for code ${SCHOOL_CODE}`);
      process.exit(1);
    }

    const financialYear = currentFinancialYear();
    const months = fyMonths(financialYear);

    console.log(`Seeding Annual Salary Statement for ${schoolRow.code} (${schoolRow.name})`);
    console.log(`Financial year: ${financialYear}`);

    let saved = 0;
    for (const category of SALARY_CATEGORIES) {
      for (let i = 0; i < months.length; i++) {
        const { month, year } = months[i];
        const values = valuesForMonth(category, i);
        await prisma.salaryStatementRow.upsert({
          where: {
            schoolId_financialYear_category_month: {
              schoolId: schoolRow.id,
              financialYear,
              category,
              month,
            },
          },
          create: {
            schoolId: schoolRow.id,
            financialYear,
            category,
            month,
            year,
            ...values,
          },
          update: {
            year,
            ...values,
          },
        });
        saved++;
      }
      console.log(`  ✓ ${category}: 12 months`);
    }

    console.log(`Done. Upserted ${saved} rows (${SALARY_CATEGORIES.length} categories × 12 months).`);
    console.log(`Open /staff/salary-statement and select FY ${financialYear}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
