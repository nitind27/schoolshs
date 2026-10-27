import {
  grossPay,
  netPay,
  totalDeduction,
  type SlipFieldKey,
} from "@/lib/salary-slip";

export type CertRow = {
  salary: string;
  salaryAmount: number;
  deduction: string;
  deductionAmount: number;
};

const CORE: { salary: string; salaryKey: SlipFieldKey; deduction: string; deductionKey: SlipFieldKey }[] = [
  { salary: "બેઝિક મૂળ પગાર", salaryKey: "basic", deduction: "પ્રોફેશનલ ટેક્સ", deductionKey: "pTax" },
  { salary: "મોંઘવારી ભથ્થું", salaryKey: "da", deduction: "ગ્રુપ ઇન્શ્યોરન્સ", deductionKey: "gruInsu" },
  { salary: "ઘરભાડું ભથ્થું", salaryKey: "hra", deduction: "ઇન્કમ ટેક્સ", deductionKey: "iTax" },
  { salary: "મેડિકલ ભથ્થું", salaryKey: "mediAll", deduction: "જી.પી.એફ. / સી.પી.એફ.", deductionKey: "gpfCpf" },
  { salary: "રોકડ ભથ્થું", salaryKey: "cashAll", deduction: "અન્ય કપાત", deductionKey: "otherDed" },
];

const EXTRA: { salary: string; salaryKey: SlipFieldKey }[] = [
  { salary: "વૉશિંગ ભથ્થું", salaryKey: "washAll" },
  { salary: "એફ.પી. ભથ્થું", salaryKey: "fpAll" },
  { salary: "પી.એચ. ભથ્થું", salaryKey: "phAll" },
  { salary: "ડી.એ. બાકી", salaryKey: "daArrears" },
  { salary: "પગાર બાકી", salaryKey: "salaryArrears" },
  { salary: "અન્ય બાકી", salaryKey: "otherArrears" },
];

export function salaryCertificateRows(values: Record<SlipFieldKey, number>): CertRow[] {
  const rows: CertRow[] = CORE.map((row) => ({
    salary: row.salary,
    salaryAmount: Number(values[row.salaryKey]) || 0,
    deduction: row.deduction,
    deductionAmount: Number(values[row.deductionKey]) || 0,
  }));
  for (const extra of EXTRA) {
    const amount = Number(values[extra.salaryKey]) || 0;
    if (!amount) continue;
    rows.push({ salary: extra.salary, salaryAmount: amount, deduction: "", deductionAmount: 0 });
  }
  return rows;
}

export function salaryCertificateTotals(values: Record<SlipFieldKey, number>) {
  return {
    gross: grossPay(values),
    deduction: totalDeduction(values),
    net: netPay(values),
  };
}

export function formatRupee(amount: number): string {
  if (!amount) return "";
  return amount.toLocaleString("en-IN");
}
