/**
 * Income tax computation form (આવકવેરાની ગણતરી) — shared fields & calculation.
 * New-regime slabs as per the official Gujarati form: 0–3L nil, 3–6L 5%,
 * 6–9L 10%, 9–12L 15%, 12–15L 20%, >15L 30%, rebate u/s 87A up to 7L, cess 4%.
 */

export const IT_TEXT_FIELDS = [
  { key: "fatherName", labelEn: "Father's Name", labelGu: "પિતાનું નામ" },
  { key: "address", labelEn: "Residential Address", labelGu: "રહેઠાણનું સરનામું" },
  { key: "bankBranch", labelEn: "Bank Name / Branch", labelGu: "બેંકનું નામ / શાખા" },
] as const;

export const IT_80C_FIELDS = [
  { key: "gpfCpf", labelEn: "G.P.F. / C.P.F.", labelGu: "જી.પી.એફ. / સી.પી.એફ." },
  { key: "groupInsurance", labelEn: "Group Insurance", labelGu: "જુથ વિમો" },
  { key: "housingLoanPrincipal", labelEn: "Housing Loan Principal", labelGu: "મકાન લોન મુદ્દલ" },
  { key: "ppf", labelEn: "P.P.F.", labelGu: "પી.પી.એફ." },
  { key: "lifeInsurance", labelEn: "Life Insurance Premium", labelGu: "જીવન વિમા પ્રીમિયમ" },
  { key: "pli", labelEn: "P.L.I.", labelGu: "પી.એલ.આઇ." },
  { key: "postOfficeCtd", labelEn: "Post Office 10–15 yr Deposit (C.T.D.)", labelGu: "પોસ્ટ ઓફિસ ડિપોઝીટ ૧૦-૧૫ વર્ષ (સી.ટી.ડી.)" },
  { key: "nsc", labelEn: "N.S.C.", labelGu: "એન.એસ.સી." },
  { key: "nscInterest", labelEn: "N.S.C. Interest", labelGu: "એન.એસ.સી. વ્યાજ" },
  { key: "ulipMf", labelEn: "ULIP / Tax Saving Mutual Fund", labelGu: "ULIP / ટેક્સ સેવિંગ્સ મ્યુ. ફંડ" },
  { key: "tuitionFee", labelEn: "Tuition Fee (up to 2 children)", labelGu: "શિક્ષણ ફી (ટ્યુશન ફી બે બાળકો સુધી)" },
  { key: "taxSavingFd", labelEn: "5-Year Tax Saving F.D.", labelGu: "પાંચ વર્ષની ટેક્સ સેવિંગ એફ.ડી." },
] as const;

export const IT_OTHER_DED_FIELDS = [
  { key: "mediclaim80D", labelEn: "Mediclaim Premium u/s 80D", labelGu: "(બી) મેડિક્લેઇમ પ્રીમિયમ u/s 80D" },
  { key: "disabled80DD", labelEn: "Medical Treatment (Disabled) u/s 80DD (Rs.75,000)", labelGu: "(સી) મેડિકલ સારવાર અપંગ વ્યક્તિ u/s 80DD (Rs.75,000 સુધી)" },
  { key: "illness80DDB", labelEn: "Serious Illness u/s 80DDB (Rs.40,000)", labelGu: "(ડી) મેડિકલ સારવાર ગંભીર બીમારી 80DDB (Rs.40,000 સુધી)" },
  { key: "donation80G", labelEn: "Donation u/s 80G", labelGu: "(ઇ) દાન 80G" },
  { key: "disability80U", labelEn: "Permanent Disability u/s 80U (Rs.1,25,000)", labelGu: "(એફ) કાયમી અપંગતા u/s 80U (Rs.1,25,000 સુધી)" },
  { key: "savingsInterest80TTA", labelEn: "Savings A/c Interest 80TTA (max Rs.10,000)", labelGu: "(જી) બેંક બચત ખાતાનું વ્યાજ 80TTA (Rs.10,000 ની મર્યાદામાં)" },
] as const;

export const IT_NUM_FIELDS = [
  { key: "salaryIncome", labelEn: "Salary Income", labelGu: "પગારની આવક" },
  { key: "vehicleAllowance", labelEn: "Vehicle Allowance u/s 10(14)", labelGu: "(એ) વાહનભથ્થું u/s 10(14)" },
  { key: "professionalTax", labelEn: "Professional Tax u/s 16(i)", labelGu: "(એ) વ્યવસાયવેરો u/s 16(i)" },
  { key: "standardDeduction", labelEn: "Standard Deduction u/s 16", labelGu: "સ્ટાન્ડર્ડ ડિડક્શન u/s 16" },
  { key: "housingLoanInterest", labelEn: "Housing Loan Interest u/s 24 (max Rs.2,00,000)", labelGu: "મકાન લોન વ્યાજ u/s 24 (Rs.2,00,000 સુધી)" },
  { key: "otherIncomeNsc", labelEn: "N.S.C. Interest", labelGu: "(એ) NSC વ્યાજ" },
  { key: "otherIncomeSavings", labelEn: "Savings Account Interest", labelGu: "(બી) બચતખાતાનું વ્યાજ" },
  { key: "otherIncomeFd", labelEn: "Fixed Deposit Interest", labelGu: "(સી) ફિક્સ ડિપોઝીટ" },
  { key: "otherIncomeOther", labelEn: "Other Income", labelGu: "(ડી) અન્ય આવક" },
  { key: "tdsPaid", labelEn: "Tax Deducted During Year (TDS)", labelGu: "વર્ષ દરમ્યાન થયેલ કપાત (TDS)" },
  ...IT_80C_FIELDS,
  ...IT_OTHER_DED_FIELDS,
] as const;

export type ItNumKey = (typeof IT_NUM_FIELDS)[number]["key"];
export type ItTextKey = (typeof IT_TEXT_FIELDS)[number]["key"];

export interface ItFormData {
  numbers: Partial<Record<ItNumKey, number>>;
  texts: Partial<Record<ItTextKey, string>>;
}

export function emptyItForm(): ItFormData {
  return { numbers: { standardDeduction: 50000 }, texts: {} };
}

const n = (data: ItFormData, key: ItNumKey) => Number(data.numbers[key]) || 0;

export const IT_SLABS = [
  { from: 300000, to: 600000, rate: 5 },
  { from: 600000, to: 900000, rate: 10 },
  { from: 900000, to: 1200000, rate: 15 },
  { from: 1200000, to: 1500000, rate: 20 },
  { from: 1500000, to: Infinity, rate: 30 },
] as const;

export interface ItComputation {
  salaryIncome: number;
  salaryDeductionsTotal: number;      // vehicle + prof tax + standard deduction
  incomeAfterSalaryDeductions: number; // (2)
  housingLoanInterest: number;         // (3) capped 2,00,000
  incomeAfterHousing: number;          // કુલ (2+3) → (4)
  otherIncomeTotal: number;            // (5)
  grossTotalIncome: number;            // (6) = 4+5
  ded80CTotal: number;                 // capped 1,50,000
  dedOtherTotal: number;               // B..G (80TTA capped 10,000)
  deductionVIATotal: number;           // (7)
  netTaxableIncome: number;            // (8) = 6-7
  roundedTaxable: number;              // (9) rounded to Rs.10
  slabTaxes: { rate: number; amount: number }[];
  taxBeforeRebate: number;             // (10)
  rebate87A: number;                   // કર રાહત
  cess: number;                        // એજ્યુકેશન સેસ 4%
  totalTaxPayable: number;             // (12)
  tdsPaid: number;                     // (13)
  refundOrPayable: number;             // (14) = tds - tax (positive = refund)
}

export function computeIncomeTax(data: ItFormData): ItComputation {
  const salaryIncome = n(data, "salaryIncome");
  const salaryDeductionsTotal =
    n(data, "vehicleAllowance") + n(data, "professionalTax") + n(data, "standardDeduction");
  const incomeAfterSalaryDeductions = Math.max(0, salaryIncome - salaryDeductionsTotal);
  const housingLoanInterest = Math.min(n(data, "housingLoanInterest"), 200000);
  const incomeAfterHousing = Math.max(0, incomeAfterSalaryDeductions - housingLoanInterest);
  const otherIncomeTotal =
    n(data, "otherIncomeNsc") + n(data, "otherIncomeSavings") + n(data, "otherIncomeFd") + n(data, "otherIncomeOther");
  const grossTotalIncome = incomeAfterHousing + otherIncomeTotal;

  const raw80C = IT_80C_FIELDS.reduce((sum, f) => sum + n(data, f.key), 0);
  const ded80CTotal = Math.min(raw80C, 150000);
  const dedOtherTotal =
    n(data, "mediclaim80D") +
    Math.min(n(data, "disabled80DD"), 75000) +
    Math.min(n(data, "illness80DDB"), 40000) +
    n(data, "donation80G") +
    Math.min(n(data, "disability80U"), 125000) +
    Math.min(n(data, "savingsInterest80TTA"), 10000);
  const deductionVIATotal = ded80CTotal + dedOtherTotal;

  const netTaxableIncome = Math.max(0, grossTotalIncome - deductionVIATotal);
  const roundedTaxable = Math.floor(netTaxableIncome / 10) * 10;

  const slabTaxes = IT_SLABS.map((s) => {
    const taxable = Math.max(0, Math.min(roundedTaxable, s.to) - s.from);
    return { rate: s.rate, amount: Math.round((taxable * s.rate) / 100) };
  });
  const taxBeforeRebate = slabTaxes.reduce((sum, s) => sum + s.amount, 0);

  const rebate87A = roundedTaxable <= 700000 ? taxBeforeRebate : 0;
  const taxAfterRebate = taxBeforeRebate - rebate87A;
  const cess = Math.round(taxAfterRebate * 0.04);
  const totalTaxPayable = taxAfterRebate + cess;
  const tdsPaid = n(data, "tdsPaid");
  const refundOrPayable = tdsPaid - totalTaxPayable;

  return {
    salaryIncome,
    salaryDeductionsTotal,
    incomeAfterSalaryDeductions,
    housingLoanInterest,
    incomeAfterHousing,
    otherIncomeTotal,
    grossTotalIncome,
    ded80CTotal,
    dedOtherTotal,
    deductionVIATotal,
    netTaxableIncome,
    roundedTaxable,
    slabTaxes,
    taxBeforeRebate,
    rebate87A,
    cess,
    totalTaxPayable,
    tdsPaid,
    refundOrPayable,
  };
}

/** FY "2025-26" → assessment year "2026-27" */
export function assessmentYear(financialYear: string): string {
  const start = Number(financialYear.slice(0, 4)) || new Date().getFullYear();
  return `${start + 1}-${String((start + 2) % 100).padStart(2, "0")}`;
}
