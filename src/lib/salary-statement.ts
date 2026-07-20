/** Annual salary statement — shared constants & helpers (page + APIs) */

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
