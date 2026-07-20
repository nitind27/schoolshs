/** Per-employee salary slip — shared constants & helpers (page + APIs) */

export const SLIP_SALARY_FIELDS = [
  { key: "basic", label: "BASIC" },
  { key: "da", label: "D.A" },
  { key: "hra", label: "H.R.A" },
  { key: "mediAll", label: "MEDI. ALL." },
  { key: "daArrears", label: "DA Arrears" },
  { key: "salaryArrears", label: "Salary Arrears" },
  { key: "otherArrears", label: "Other Arrears" },
  { key: "cashAll", label: "CASH ALL." },
  { key: "washAll", label: "WASH. ALL" },
  { key: "fpAll", label: "F.P. ALL" },
  { key: "phAll", label: "P.H. ALL" },
] as const;

export const SLIP_DEDUCTION_FIELDS = [
  { key: "gpfCpf", label: "GPF/CPF" },
  { key: "iTax", label: "I.TAX" },
  { key: "pTax", label: "P.TAX" },
  { key: "gruInsu", label: "GRU. INSU." },
  { key: "otherDed", label: "OTHER" },
] as const;

export type SlipSalaryKey = (typeof SLIP_SALARY_FIELDS)[number]["key"];
export type SlipDeductionKey = (typeof SLIP_DEDUCTION_FIELDS)[number]["key"];
export type SlipFieldKey = SlipSalaryKey | SlipDeductionKey;

export const SLIP_ALL_FIELDS = [...SLIP_SALARY_FIELDS, ...SLIP_DEDUCTION_FIELDS];

/** Slip FY runs April → March, e.g. "2025-26" → Apr-25 … Mar-26 */
export function slipFyMonths(financialYear: string): { month: number; year: number }[] {
  const startYear = Number(financialYear.slice(0, 4)) || new Date().getFullYear();
  const out: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((3 + i) % 12) + 1; // Apr (4) … Mar (3)
    out.push({ month: m, year: m >= 4 ? startYear : startYear + 1 });
  }
  return out;
}

export function slipMonthLabel(month: number, year: number): string {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[month - 1]}-${String(year).slice(2)}`;
}

export function emptySlipValues(): Record<SlipFieldKey, number> {
  return Object.fromEntries(SLIP_ALL_FIELDS.map((f) => [f.key, 0])) as Record<SlipFieldKey, number>;
}

export function grossPay(values: Record<SlipFieldKey, number>): number {
  return SLIP_SALARY_FIELDS.reduce((sum, f) => sum + (Number(values[f.key]) || 0), 0);
}

export function totalDeduction(values: Record<SlipFieldKey, number>): number {
  return SLIP_DEDUCTION_FIELDS.reduce((sum, f) => sum + (Number(values[f.key]) || 0), 0);
}

export function netPay(values: Record<SlipFieldKey, number>): number {
  return grossPay(values) - totalDeduction(values);
}

/** Slip FY label for today, e.g. "2025-26" (April start) */
export function currentSlipFy(): string {
  const now = new Date();
  const y = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function slipFyOptions(count = 6): string[] {
  const current = Number(currentSlipFy().slice(0, 4));
  return Array.from({ length: count }, (_, i) => {
    const y = current - i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
}
