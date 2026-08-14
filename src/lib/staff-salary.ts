/** Staff monthly pay components, % of BASIC, and full-pay totals */

export const STAFF_PAY_AMOUNT_KEYS = [
  "monthlySalary",
  "da",
  "hra",
  "ma",
  "fpa",
  "hndA",
  "suA",
  "caA",
  "wa",
  "prA",
  "bonus",
  "daArrears",
  "salaryArrears",
] as const;

export type StaffPayAmountKey = (typeof STAFF_PAY_AMOUNT_KEYS)[number];

export type StaffSalaryAmounts = Partial<Record<StaffPayAmountKey, number | null | string>>;

export function optionalFloat(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function optionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

export function optionalText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

/** BASIC × percent, rounded to paise */
export function percentAmount(base: number, pct: number): number {
  if (!Number.isFinite(base) || !Number.isFinite(pct)) return 0;
  return Math.round(base * (pct / 100) * 100) / 100;
}

export function computeStaffFullPay(profile: StaffSalaryAmounts): number {
  const sum = STAFF_PAY_AMOUNT_KEYS.reduce((total, key) => total + (Number(profile[key]) || 0), 0);
  return Math.round(sum * 100) / 100;
}

export function applyDaHraFromPercent(input: {
  monthlySalary?: number | null;
  daPercent?: number | null;
  hraPercent?: number | null;
  da?: number | null;
  hra?: number | null;
}) {
  const basic = input.monthlySalary ?? null;
  const daPercent = input.daPercent ?? null;
  const hraPercent = input.hraPercent ?? null;
  let da = input.da ?? null;
  let hra = input.hra ?? null;
  if (basic != null && daPercent != null) da = percentAmount(basic, daPercent);
  if (basic != null && hraPercent != null) hra = percentAmount(basic, hraPercent);
  return { da, hra, daPercent, hraPercent, monthlySalary: basic };
}

export function staffSalaryFields(body: Record<string, unknown>) {
  const monthlySalary = optionalFloat(body.monthlySalary);
  const daPercent = optionalFloat(body.daPercent);
  const hraPercent = optionalFloat(body.hraPercent);
  const derived = applyDaHraFromPercent({
    monthlySalary,
    daPercent,
    hraPercent,
    da: optionalFloat(body.da),
    hra: optionalFloat(body.hra),
  });
  const amounts: Record<StaffPayAmountKey, number | null> = {
    monthlySalary: derived.monthlySalary,
    da: derived.da,
    hra: derived.hra,
    ma: optionalFloat(body.ma),
    fpa: optionalFloat(body.fpa),
    hndA: optionalFloat(body.hndA),
    suA: optionalFloat(body.suA),
    caA: optionalFloat(body.caA),
    wa: optionalFloat(body.wa),
    prA: optionalFloat(body.prA),
    bonus: optionalFloat(body.bonus),
    daArrears: optionalFloat(body.daArrears),
    salaryArrears: optionalFloat(body.salaryArrears),
  };

  return {
    ...amounts,
    daPercent: derived.daPercent,
    hraPercent: derived.hraPercent,
    fullPay: computeStaffFullPay(amounts),
    conveyance: optionalFloat(body.conveyance) ?? 0,
    pfDeduction: optionalFloat(body.pfDeduction) ?? 0,
    bankName: optionalText(body.bankName),
    bankAccount: optionalText(body.bankAccount),
    ifscCode: optionalText(body.ifscCode)?.toUpperCase() || null,
  };
}
