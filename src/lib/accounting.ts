/** Standard Indian school chart of accounts groups */
export const ACCOUNT_GROUPS = [
  { value: "assets", label: "Assets", type: "debit" },
  { value: "liabilities", label: "Liabilities", type: "credit" },
  { value: "income", label: "Income / Receipts", type: "credit" },
  { value: "expenses", label: "Expenses / Payments", type: "debit" },
  { value: "capital", label: "Capital / Fund", type: "credit" },
] as const;

export const VOUCHER_TYPES = [
  { value: "receipt", label: "Receipt Voucher", prefix: "RV" },
  { value: "payment", label: "Payment Voucher", prefix: "PV" },
  { value: "journal", label: "Journal Voucher", prefix: "JV" },
  { value: "contra", label: "Contra Voucher", prefix: "CV" },
] as const;

export const PAYMENT_MODES = [
  "Cash",
  "Cheque",
  "NEFT/RTGS",
  "UPI",
  "DD",
  "Online",
] as const;

export const AUDIT_STATUSES = [
  { value: "pending", label: "Pending Review", color: "bg-amber-100 text-amber-800" },
  { value: "verified", label: "Verified", color: "bg-emerald-100 text-emerald-800" },
  { value: "flagged", label: "Flagged", color: "bg-red-100 text-red-800" },
  { value: "query", label: "Query Raised", color: "bg-orange-100 text-orange-800" },
] as const;

export const DEFAULT_ACCOUNTS = [
  { code: "1001", name: "Cash in Hand", groupType: "assets", accountType: "cash", balanceType: "debit" },
  { code: "1002", name: "Bank Account - SBI", groupType: "assets", accountType: "bank", balanceType: "debit" },
  { code: "1003", name: "Fixed Deposits", groupType: "assets", accountType: "bank", balanceType: "debit" },
  { code: "1101", name: "Furniture & Fixtures", groupType: "assets", accountType: "fixed_asset", balanceType: "debit" },
  { code: "1102", name: "Computer & Equipment", groupType: "assets", accountType: "fixed_asset", balanceType: "debit" },
  { code: "2001", name: "Tuition Fee Receivable", groupType: "assets", accountType: "receivable", balanceType: "debit" },
  { code: "3001", name: "Salary Payable", groupType: "liabilities", accountType: "payable", balanceType: "credit" },
  { code: "3002", name: "PF/ESI Payable", groupType: "liabilities", accountType: "payable", balanceType: "credit" },
  { code: "3003", name: "Grant Received in Advance", groupType: "liabilities", accountType: "grant", balanceType: "credit" },
  { code: "4001", name: "Corpus / Capital Fund", groupType: "capital", accountType: "fund", balanceType: "credit" },
  { code: "5001", name: "Tuition Fee Income", groupType: "income", accountType: "fee", balanceType: "credit" },
  { code: "5002", name: "Admission Fee Income", groupType: "income", accountType: "fee", balanceType: "credit" },
  { code: "5003", name: "Government Grant Income", groupType: "income", accountType: "grant", balanceType: "credit" },
  { code: "5004", name: "Donation Income", groupType: "income", accountType: "donation", balanceType: "credit" },
  { code: "5005", name: "Scholarship Grant Received", groupType: "income", accountType: "scholarship", balanceType: "credit" },
  { code: "6001", name: "Salary Expense", groupType: "expenses", accountType: "salary", balanceType: "debit" },
  { code: "6002", name: "Electricity Expense", groupType: "expenses", accountType: "utility", balanceType: "debit" },
  { code: "6003", name: "Stationery Expense", groupType: "expenses", accountType: "general", balanceType: "debit" },
  { code: "6004", name: "Maintenance Expense", groupType: "expenses", accountType: "general", balanceType: "debit" },
  { code: "6005", name: "Scholarship Disbursement", groupType: "expenses", accountType: "scholarship", balanceType: "debit" },
] as const;

export function getVoucherPrefix(type: string): string {
  return VOUCHER_TYPES.find((v) => v.value === type)?.prefix || "V";
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 33) return "D";
  return "F";
}

export function getFinancialYearDates(label: string): { startDate: Date; endDate: Date } {
  const [startYear] = label.split("-").map((y) => parseInt(y.length === 2 ? `20${y}` : y, 10));
  return {
    startDate: new Date(startYear, 3, 1),
    endDate: new Date(startYear + 1, 2, 31),
  };
}
