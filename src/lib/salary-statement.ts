/** Annual salary statement — shared constants & helpers (page + APIs) */

import { staffWorkedInMonth } from "@/lib/salary-slip";

export const SALARY_CATEGORIES = [
  "secondary",
  "higher_secondary",
  "non_teaching",
  "peon",
] as const;

export type SalaryCategory = (typeof SALARY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SalaryCategory, string> = {
  secondary: "Secondary Teaching",
  higher_secondary: "Higher Secondary Teaching",
  non_teaching: "Non-Teaching Staff",
  peon: "Peon",
};

export type SalarySchoolBand = "primary" | "secondary" | "higher_secondary" | "k12";

/** Map School.schoolType (set when super-admin creates the school) to statement bands. */
export function salarySchoolBand(schoolType?: string | null): SalarySchoolBand {
  const raw = String(schoolType || "").trim().toLowerCase();
  if (!raw) return "k12";
  if (raw.includes("ઉચ્ચતર") || raw.includes("higher secondary") || raw.includes("higher-secondary")) {
    return "higher_secondary";
  }
  if (
    raw.includes("પ્રાથમિક") ||
    raw === "primary" ||
    (raw.includes("primary") && !raw.includes("secondary"))
  ) {
    return "primary";
  }
  if (raw === "secondary" || raw.includes("માધ્યમિક") || raw.includes("madhyamik")) {
    return "secondary";
  }
  if (raw === "k-12" || raw === "k12" || raw === "college") return "k12";
  if (raw.includes("secondary") && !raw.includes("higher")) return "secondary";
  return "k12";
}

/** Which statement sections this school should show. */
export function visibleSalaryCategories(schoolType?: string | null): SalaryCategory[] {
  const band = salarySchoolBand(schoolType);
  if (band === "primary") return ["secondary", "non_teaching", "peon"];
  if (band === "secondary") return ["secondary", "non_teaching", "peon"];
  if (band === "higher_secondary") return ["secondary", "higher_secondary", "non_teaching", "peon"];
  return [...SALARY_CATEGORIES];
}

export function salaryCategoryI18nKey(category: SalaryCategory, schoolType?: string | null): string {
  if (category === "secondary" && salarySchoolBand(schoolType) === "primary") {
    return "salaryStatement.cat_primary";
  }
  return `salaryStatement.cat_${category}`;
}

export function salaryCategoryDisplayLabel(
  category: SalaryCategory,
  schoolType?: string | null,
): string {
  if (category === "secondary" && salarySchoolBand(schoolType) === "primary") {
    return "Primary Teaching";
  }
  return CATEGORY_LABELS[category];
}

/** Allowance columns in statement order (same as the official PDF format) */
export const SALARY_FIELDS = [
  { key: "basic", label: "BASIC" },
  { key: "da", label: "D.A." },
  { key: "hra", label: "H.R.A." },
  { key: "ma", label: "M.A." },
  { key: "fpa", label: "FPA" },
  { key: "hndA", label: "Hnd.A." },
  { key: "suA", label: "SU.A." },
  { key: "caA", label: "Ca.A" },
  { key: "wa", label: "W.A." },
  { key: "prA", label: "Pr.A." },
  { key: "bonus", label: "BONUS" },
  { key: "daArrears", label: "D.A. Arrears" },
  { key: "salaryArrears", label: "Salary Arrears" },
] as const;

export type SalaryFieldKey = (typeof SALARY_FIELDS)[number]["key"];

export interface StatementRow {
  category: SalaryCategory;
  month: number;
  year: number;
  values: Record<SalaryFieldKey, number>;
}

/** Financial year "2023-24" → 12 {month, year} entries from March to February */
export function fyMonths(financialYear: string): { month: number; year: number }[] {
  const startYear = Number(financialYear.slice(0, 4)) || new Date().getFullYear();
  const out: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((2 + i) % 12) + 1; // Mar (3) … Feb (2)
    out.push({ month: m, year: m >= 3 ? startYear : startYear + 1 });
  }
  return out;
}

export function monthLabel(month: number, year: number): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[month - 1]}-${String(year).slice(2)}`;
}

export function rowTotal(values: Record<SalaryFieldKey, number>): number {
  return SALARY_FIELDS.reduce((sum, f) => sum + (Number(values[f.key]) || 0), 0);
}

export function emptyValues(): Record<SalaryFieldKey, number> {
  return Object.fromEntries(SALARY_FIELDS.map((f) => [f.key, 0])) as Record<SalaryFieldKey, number>;
}

/** Current financial year label, e.g. "2025-26" (FY starts in March per statement format) */
export function currentFinancialYear(): string {
  const now = new Date();
  const y = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function fyOptions(count = 6): string[] {
  const current = Number(currentFinancialYear().slice(0, 4));
  return Array.from({ length: count }, (_, i) => {
    const y = current - i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
}

function n(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export type StatementStaffSource = {
  designation?: string | null;
  department?: string | null;
  dateOfJoining?: string | null;
  retirementDate?: string | null;
  dateOfBirth?: string | null;
  monthlySalary?: number | null;
  da?: number | null;
  hra?: number | null;
  ma?: number | null;
  fpa?: number | null;
  hndA?: number | null;
  suA?: number | null;
  caA?: number | null;
  wa?: number | null;
  prA?: number | null;
  bonus?: number | null;
  daArrears?: number | null;
  salaryArrears?: number | null;
};

/** Map designation / department onto the 4 statement categories */
export function staffSalaryStatementCategory(
  staff: StatementStaffSource,
  schoolType?: string | null,
): SalaryCategory {
  const band = salarySchoolBand(schoolType);
  const d = String(staff.designation || "").trim().toLowerCase();
  const dept = String(staff.department || "").trim().toLowerCase();
  const blob = `${d} ${dept}`;

  if (/\bpeon\b|\bpuen\b|પટાવાળ|watchman|security|sweeper|driver/.test(blob)) return "peon";

  const nonTeaching =
    /\bclerk\b|accountant|librarian|lab assistant|computer operator|typist|receptionist|\badmin\b|store keeper/.test(d);
  const teaching =
    /teacher|principal|head master|headmistress|head teacher|\bhm\b|supervisor|lecturer|shikshak|acharya/.test(d);
  if (nonTeaching && !teaching) return "non_teaching";

  if (band === "primary" || band === "secondary") return teaching || !d ? "secondary" : "non_teaching";
  if (band === "higher_secondary") {
    if (/higher secondary|higher-secondary|\bh\.?\s*s\.?\b|\b11\b|\b12\b|\bhsc\b|ઉચ્ચતર/.test(blob)) {
      return "higher_secondary";
    }
    if (teaching || !d) return "secondary";
    return "non_teaching";
  }

  if (/higher secondary|higher-secondary|\bh\.?\s*s\.?\b|\b11\b|\b12\b|\bhsc\b|ઉચ્ચતર/.test(blob)) {
    return "higher_secondary";
  }
  if (teaching || !d) return "secondary";
  return "non_teaching";
}

export function staffToStatementValues(staff: StatementStaffSource): Record<SalaryFieldKey, number> {
  return {
    basic: n(staff.monthlySalary),
    da: n(staff.da),
    hra: n(staff.hra),
    ma: n(staff.ma),
    fpa: n(staff.fpa),
    hndA: n(staff.hndA),
    suA: n(staff.suA),
    caA: n(staff.caA),
    wa: n(staff.wa),
    prA: n(staff.prA),
    bonus: n(staff.bonus),
    daArrears: n(staff.daArrears),
    salaryArrears: n(staff.salaryArrears),
  };
}

export function addStatementValues(
  a: Record<SalaryFieldKey, number>,
  b: Record<SalaryFieldKey, number>,
): Record<SalaryFieldKey, number> {
  const out = emptyValues();
  for (const f of SALARY_FIELDS) {
    out[f.key] = Math.round((n(a[f.key]) + n(b[f.key])) * 100) / 100;
  }
  return out;
}

export function isStatementRowEmpty(row: Partial<Record<SalaryFieldKey, number | null>> | null | undefined): boolean {
  if (!row) return true;
  return SALARY_FIELDS.every((f) => !n(row[f.key]));
}

export function emptyStaffCounts(): Record<SalaryCategory, number> {
  return { secondary: 0, higher_secondary: 0, non_teaching: 0, peon: 0 };
}

/**
 * Category × month grid: saved non-empty rows win; otherwise sum of staff
 * salaries in that category for months they actually worked.
 */
export function buildStatementYearRows(
  financialYear: string,
  staffList: StatementStaffSource[],
  saved: ReadonlyArray<{ category: string; month: number } & Partial<Record<SalaryFieldKey, number | null>>>,
  schoolType?: string | null,
) {
  const months = fyMonths(financialYear);
  const categories = visibleSalaryCategories(schoolType);
  const computed = new Map<string, Record<SalaryFieldKey, number>>();
  const staffCounts = emptyStaffCounts();
  const monthCounts = new Map<string, number>();

  for (const staff of staffList) {
    const category = staffSalaryStatementCategory(staff, schoolType);
    staffCounts[category] += 1;
    const pay = staffToStatementValues(staff);
    if (isStatementRowEmpty(pay)) continue;
    for (const { month, year } of months) {
      if (!staffWorkedInMonth(staff, month, year)) continue;
      const key = `${category}:${month}`;
      computed.set(key, addStatementValues(computed.get(key) || emptyValues(), pay));
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    }
  }

  const savedMap = new Map(saved.map((r) => [`${r.category}:${r.month}`, r]));
  const rows = categories.flatMap((category) =>
    months.map(({ month, year }) => {
      const key = `${category}:${month}`;
      const existing = savedMap.get(key);
      const savedValues = existing
        ? (Object.fromEntries(SALARY_FIELDS.map((f) => [f.key, n(existing[f.key])])) as Record<SalaryFieldKey, number>)
        : emptyValues();
      const auto = computed.get(key) || emptyValues();
      const values = isStatementRowEmpty(savedValues) ? auto : savedValues;
      return {
        category,
        month,
        year,
        ...values,
        staffCount: monthCounts.get(key) || 0,
      };
    }),
  );

  return { rows, staffCounts };
}
