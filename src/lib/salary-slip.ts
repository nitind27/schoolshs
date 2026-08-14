/** Per-employee salary slip — shared constants & helpers (page + APIs) */

import { parseDMY, staffServiceDates } from "@/lib/staff-register";

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

/** Staff profile fields used to auto-fill a monthly slip row */
export type StaffPaySource = {
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
  conveyance?: number | null;
  pfDeduction?: number | null;
  professionalTax?: number | null;
  incomeTax?: number | null;
  dateOfJoining?: string | null;
  retirementDate?: string | null;
  designation?: string | null;
  dateOfBirth?: string | null;
};

function n(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/** Map Add Staff salary / deductions onto the slip columns */
export function slipValuesFromStaff(staff: StaffPaySource): Record<SlipFieldKey, number> {
  return {
    basic: n(staff.monthlySalary),
    da: n(staff.da),
    hra: n(staff.hra),
    mediAll: n(staff.ma),
    daArrears: n(staff.daArrears),
    salaryArrears: n(staff.salaryArrears),
    otherArrears: n(staff.bonus) + n(staff.suA) + n(staff.prA) + n(staff.conveyance),
    cashAll: n(staff.caA),
    washAll: n(staff.wa),
    fpAll: n(staff.fpa),
    phAll: n(staff.hndA),
    gpfCpf: n(staff.pfDeduction),
    iTax: n(staff.incomeTax),
    pTax: n(staff.professionalTax),
    gruInsu: 0,
    otherDed: 0,
  };
}

export function isSlipRowEmpty(row: Partial<Record<SlipFieldKey, number | null>> | null | undefined): boolean {
  if (!row) return true;
  return SLIP_ALL_FIELDS.every((f) => !n(row[f.key]));
}

/** Staff is on payroll for this calendar month (joining / retirement). */
export function staffWorkedInMonth(staff: StaffPaySource, month: number, year: number): boolean {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const join = parseDMY(staff.dateOfJoining);
  if (join && join > monthEnd) return false;
  const retire = parseDMY(staff.retirementDate) || parseDMY(staffServiceDates(staff).retireDate);
  if (retire && retire < monthStart) return false;
  return true;
}

export function valuesFromSlipRow(row: object): Record<SlipFieldKey, number> {
  const rec = row as Record<string, unknown>;
  const values = emptySlipValues();
  for (const f of SLIP_ALL_FIELDS) values[f.key] = n(rec[f.key]);
  return values;
}

/**
 * 12 FY months: saved (non-empty) rows win; otherwise fill from staff salary
 * for months the employee actually worked.
 */
export function buildSlipYearRows(
  financialYear: string,
  staff: StaffPaySource,
  saved: ReadonlyArray<{ month: number }>,
) {
  const defaults = slipValuesFromStaff(staff);
  const byMonth = new Map(saved.map((r) => [Number(r.month), r]));
  return slipFyMonths(financialYear).map(({ month, year }) => {
    const existing = byMonth.get(month);
    const savedValues = existing ? valuesFromSlipRow(existing) : null;
    const values =
      savedValues && !isSlipRowEmpty(savedValues)
        ? savedValues
        : staffWorkedInMonth(staff, month, year)
          ? { ...defaults }
          : emptySlipValues();
    return { month, year, ...values };
  });
}
