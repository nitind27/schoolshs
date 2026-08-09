/**
 * Complete School Accounting demo seed for school code 24261004403.
 * Creates FY 2026-27 (active), chart of accounts, opening balances,
 * and a full set of receipt/payment/journal/contra vouchers.
 *
 * Usage: npx tsx scripts/seed-accounting-24261004403.ts
 */
import { prisma } from "../src/lib/db";
import {
  DEFAULT_ACCOUNTS,
  COMMON_SCHOOL_EXPENSE_TEMPLATES,
  getFinancialYearDates,
  getVoucherPrefix,
} from "../src/lib/accounting";

const SCHOOL_CODE = "24261004403";
const FY_LABEL = "2026-27"; // April 2026 – March 2027 (covers today Aug 2026)

function d(iso: string) {
  return new Date(`${iso}T10:00:00.000Z`);
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { code: SCHOOL_CODE },
    select: { id: true, name: true, code: true },
  });
  if (!school) {
    throw new Error(`School ${SCHOOL_CODE} not found`);
  }

  const admin = await prisma.user.findFirst({
    where: { schoolId: school.id, role: "school_admin", isActive: true },
    select: { id: true, email: true },
  });

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Admin: ${admin?.email || "none"}`);

  // Deactivate other FYs, upsert 2026-27
  const dates = getFinancialYearDates(FY_LABEL);
  await prisma.financialYear.updateMany({
    where: { schoolId: school.id },
    data: { isActive: false },
  });

  const fy = await prisma.financialYear.upsert({
    where: { schoolId_label: { schoolId: school.id, label: FY_LABEL } },
    create: {
      schoolId: school.id,
      label: FY_LABEL,
      startDate: dates.startDate,
      endDate: dates.endDate,
      isActive: true,
      isLocked: false,
      auditStatus: "open",
    },
    update: {
      isActive: true,
      isLocked: false,
      auditStatus: "open",
      submittedAt: null,
      startDate: dates.startDate,
      endDate: dates.endDate,
    },
  });
  console.log(`FY active: ${fy.label} (${fy.id})`);

  // Wipe prior demo vouchers/accounts for this FY so re-run is clean
  await prisma.voucherLine.deleteMany({
    where: { voucher: { schoolId: school.id, financialYearId: fy.id } },
  });
  await prisma.voucher.deleteMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });
  await prisma.account.deleteMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });

  // Chart of accounts — defaults + extra school expenses
  const extraExpenses = COMMON_SCHOOL_EXPENSE_TEMPLATES.slice(0, 12).map((name, i) => ({
    code: String(6010 + i),
    name,
    groupType: "expenses" as const,
    accountType: "general",
    balanceType: "debit" as const,
  }));

  const chart = [...DEFAULT_ACCOUNTS, ...extraExpenses];
  await prisma.account.createMany({
    data: chart.map((a) => ({
      schoolId: school.id,
      financialYearId: fy.id,
      code: a.code,
      name: a.name,
      groupType: a.groupType,
      accountType: a.accountType,
      balanceType: a.balanceType,
      openingBalance: 0,
      isActive: true,
    })),
  });

  const accounts = await prisma.account.findMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });
  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a]));

  // Opening balances (as of FY start)
  const openings: { code: string; amount: number; balanceType: "debit" | "credit" }[] = [
    { code: "1001", amount: 25000, balanceType: "debit" }, // Cash
    { code: "1002", amount: 485000, balanceType: "debit" }, // Bank SBI
    { code: "1003", amount: 150000, balanceType: "debit" }, // FD
    { code: "1101", amount: 220000, balanceType: "debit" }, // Furniture
    { code: "1102", amount: 85000, balanceType: "debit" }, // Computers
    { code: "4001", amount: 965000, balanceType: "credit" }, // Capital fund
  ];
  for (const o of openings) {
    const acc = byCode[o.code];
    if (!acc) continue;
    await prisma.account.update({
      where: { id: acc.id },
      data: { openingBalance: o.amount, balanceType: o.balanceType },
    });
  }
  console.log(`Accounts: ${accounts.length} (with opening balances)`);

  type VLine = { code: string; debit?: number; credit?: number; description?: string };
  type VDef = {
    type: "receipt" | "payment" | "journal" | "contra";
    date: string;
    narration: string;
    totalAmount: number;
    partyName?: string;
    paymentMode?: string;
    referenceNo?: string;
    chequeNo?: string;
    bankName?: string;
    billNo?: string;
    auditStatus?: "pending" | "verified" | "flagged";
    lines: VLine[];
  };

  const vouchers: VDef[] = [
    // ── Receipts (money in) ──
    {
      type: "receipt",
      date: "2026-04-10",
      narration: "Tuition fee collection — April 2026 (Std 1–5)",
      totalAmount: 125000,
      partyName: "Parents / Students",
      paymentMode: "Cash",
      auditStatus: "verified",
      lines: [
        { code: "1001", debit: 125000, description: "Cash received" },
        { code: "5001", credit: 125000, description: "Tuition fee income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-04-15",
      narration: "Admission fee — new students batch 2026-27",
      totalAmount: 42000,
      partyName: "New admissions",
      paymentMode: "UPI",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 42000, description: "Bank UPI credit" },
        { code: "5002", credit: 42000, description: "Admission fee" },
      ],
    },
    {
      type: "receipt",
      date: "2026-05-05",
      narration: "Government grant (SSA / education) received",
      totalAmount: 350000,
      partyName: "District Education Office",
      paymentMode: "NEFT/RTGS",
      referenceNo: "NEFT-SSA-260505",
      bankName: "State Bank of India",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 350000, description: "Grant credited to bank" },
        { code: "5003", credit: 350000, description: "Govt grant income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-05-20",
      narration: "Donation from alumni association — library books",
      totalAmount: 25000,
      partyName: "Alumni Association Songadh",
      paymentMode: "Cheque",
      chequeNo: "004521",
      bankName: "Bank of Baroda",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 25000, description: "Cheque deposited" },
        { code: "5004", credit: 25000, description: "Donation income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-06-12",
      narration: "Scholarship grant received for SC/ST students",
      totalAmount: 180000,
      partyName: "Digital Gujarat / SJED",
      paymentMode: "NEFT/RTGS",
      referenceNo: "DG-SCH-0612",
      auditStatus: "pending",
      lines: [
        { code: "1002", debit: 180000, description: "Scholarship grant" },
        { code: "5005", credit: 180000, description: "Scholarship grant income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-07-08",
      narration: "Tuition fee collection — July 2026",
      totalAmount: 98000,
      partyName: "Parents / Students",
      paymentMode: "UPI",
      auditStatus: "pending",
      lines: [
        { code: "1002", debit: 98000, description: "UPI fee collection" },
        { code: "5001", credit: 98000, description: "Tuition fee" },
      ],
    },
    {
      type: "receipt",
      date: "2026-08-05",
      narration: "Tuition fee collection — August 2026",
      totalAmount: 102000,
      partyName: "Parents / Students",
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "1001", debit: 102000, description: "Cash fees" },
        { code: "5001", credit: 102000, description: "Tuition fee" },
      ],
    },

    // ── Payments (money out) ──
    {
      type: "payment",
      date: "2026-04-28",
      narration: "Staff salary for April 2026",
      totalAmount: 275000,
      partyName: "Teaching & Non-teaching staff",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SAL-APR-26",
      auditStatus: "verified",
      lines: [
        { code: "6001", debit: 275000, description: "Salary expense" },
        { code: "1002", credit: 275000, description: "Bank transfer" },
      ],
    },
    {
      type: "payment",
      date: "2026-05-05",
      narration: "Electricity bill — April 2026 (PGVCL)",
      totalAmount: 18500,
      partyName: "PGVCL",
      paymentMode: "Online",
      billNo: "PGVCL-4421",
      auditStatus: "verified",
      lines: [
        { code: "6002", debit: 18500, description: "Electricity" },
        { code: "1002", credit: 18500, description: "Online payment" },
      ],
    },
    {
      type: "payment",
      date: "2026-05-12",
      narration: "Stationery & exam paper purchase",
      totalAmount: 12400,
      partyName: "Shree Stationery Mart",
      paymentMode: "Cash",
      billNo: "SSM-118",
      auditStatus: "verified",
      lines: [
        { code: "6003", debit: 12400, description: "Stationery" },
        { code: "1001", credit: 12400, description: "Cash paid" },
      ],
    },
    {
      type: "payment",
      date: "2026-05-28",
      narration: "Staff salary for May 2026",
      totalAmount: 278000,
      partyName: "Teaching & Non-teaching staff",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SAL-MAY-26",
      auditStatus: "verified",
      lines: [
        { code: "6001", debit: 278000, description: "Salary" },
        { code: "1002", credit: 278000, description: "Bank" },
      ],
    },
    {
      type: "payment",
      date: "2026-06-08",
      narration: "Building white-wash & minor repair",
      totalAmount: 45000,
      partyName: "Patel Contractors",
      paymentMode: "Cheque",
      chequeNo: "778201",
      bankName: "SBI",
      billNo: "PC-55",
      auditStatus: "verified",
      lines: [
        { code: "6004", debit: 45000, description: "Maintenance" },
        { code: "1002", credit: 45000, description: "Cheque issued" },
      ],
    },
    {
      type: "payment",
      date: "2026-06-15",
      narration: "Scholarship disbursement to eligible students",
      totalAmount: 165000,
      partyName: "Scholarship beneficiaries",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SCH-DISB-0615",
      auditStatus: "pending",
      lines: [
        { code: "6005", debit: 165000, description: "Scholarship paid" },
        { code: "1002", credit: 165000, description: "Bank transfer" },
      ],
    },
    {
      type: "payment",
      date: "2026-06-28",
      narration: "Staff salary for June 2026",
      totalAmount: 278000,
      partyName: "Teaching & Non-teaching staff",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SAL-JUN-26",
      auditStatus: "verified",
      lines: [
        { code: "6001", debit: 278000, description: "Salary" },
        { code: "1002", credit: 278000, description: "Bank" },
      ],
    },
    {
      type: "payment",
      date: "2026-07-04",
      narration: "Water & drinking expense + cleaning",
      totalAmount: 8500,
      partyName: "Local vendors",
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "6010", debit: 4500, description: "Water expense" },
        { code: "6012", debit: 4000, description: "Cleaning" },
        { code: "1001", credit: 8500, description: "Cash paid" },
      ],
    },
    {
      type: "payment",
      date: "2026-07-10",
      narration: "Internet broadband — quarterly bill",
      totalAmount: 5400,
      partyName: "BSNL / ISP",
      paymentMode: "UPI",
      auditStatus: "pending",
      lines: [
        { code: "6015", debit: 5400, description: "Internet" },
        { code: "1002", credit: 5400, description: "UPI" },
      ],
    },
    {
      type: "payment",
      date: "2026-07-28",
      narration: "Staff salary for July 2026",
      totalAmount: 280000,
      partyName: "Teaching & Non-teaching staff",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SAL-JUL-26",
      auditStatus: "pending",
      lines: [
        { code: "6001", debit: 280000, description: "Salary" },
        { code: "1002", credit: 280000, description: "Bank" },
      ],
    },
    {
      type: "payment",
      date: "2026-08-02",
      narration: "Sports equipment & PT materials",
      totalAmount: 15600,
      partyName: "Sports World Surat",
      paymentMode: "UPI",
      billNo: "SW-902",
      auditStatus: "pending",
      lines: [
        { code: "6018", debit: 15600, description: "Sports expense" },
        { code: "1002", credit: 15600, description: "UPI" },
      ],
    },
    {
      type: "payment",
      date: "2026-08-06",
      narration: "Electricity bill — July 2026",
      totalAmount: 19200,
      partyName: "PGVCL",
      paymentMode: "Online",
      billNo: "PGVCL-5102",
      auditStatus: "pending",
      lines: [
        { code: "6002", debit: 19200, description: "Electricity" },
        { code: "1002", credit: 19200, description: "Online" },
      ],
    },

    // ── Journal ──
    {
      type: "journal",
      date: "2026-04-01",
      narration: "Opening adjustment — fee receivable brought forward",
      totalAmount: 35000,
      auditStatus: "verified",
      lines: [
        { code: "2001", debit: 35000, description: "Fee receivable OB" },
        { code: "4001", credit: 35000, description: "Against capital fund" },
      ],
    },
    {
      type: "journal",
      date: "2026-06-30",
      narration: "Salary payable provision for last 2 days of June",
      totalAmount: 18500,
      auditStatus: "verified",
      lines: [
        { code: "6001", debit: 18500, description: "Salary provision" },
        { code: "3001", credit: 18500, description: "Salary payable" },
      ],
    },
    {
      type: "journal",
      date: "2026-07-01",
      narration: "Clear June salary payable via bank",
      totalAmount: 18500,
      auditStatus: "pending",
      lines: [
        { code: "3001", debit: 18500, description: "Payable cleared" },
        { code: "1002", credit: 18500, description: "Bank payment" },
      ],
    },

    // ── Contra (cash ↔ bank) ──
    {
      type: "contra",
      date: "2026-04-12",
      narration: "Cash deposited into SBI bank account",
      totalAmount: 80000,
      paymentMode: "Cash",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 80000, description: "Bank deposit" },
        { code: "1001", credit: 80000, description: "Cash withdrawn from hand" },
      ],
    },
    {
      type: "contra",
      date: "2026-07-15",
      narration: "Cash withdrawn from bank for office expenses",
      totalAmount: 30000,
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "1001", debit: 30000, description: "Cash withdrawn" },
        { code: "1002", credit: 30000, description: "Bank debit" },
      ],
    },
    {
      type: "contra",
      date: "2026-08-07",
      narration: "Cash deposit of August fee collection",
      totalAmount: 75000,
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "1002", debit: 75000, description: "Fee cash deposited" },
        { code: "1001", credit: 75000, description: "Cash from hand" },
      ],
    },
  ];

  // Validate expense codes exist (6010+ from templates)
  for (const v of vouchers) {
    for (const line of v.lines) {
      if (!byCode[line.code]) {
        throw new Error(`Missing account code ${line.code} for voucher: ${v.narration}`);
      }
    }
  }

  const counters: Record<string, number> = {
    receipt: 0,
    payment: 0,
    journal: 0,
    contra: 0,
  };

  let created = 0;
  for (const v of vouchers) {
    counters[v.type] = (counters[v.type] || 0) + 1;
    const voucherNo = `${getVoucherPrefix(v.type)}-${String(counters[v.type]).padStart(4, "0")}`;
    const totalDebit = v.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = v.lines.reduce((s, l) => s + (l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Unbalanced voucher ${voucherNo}: D ${totalDebit} C ${totalCredit}`);
    }

    const audited = v.auditStatus === "verified";
    await prisma.voucher.create({
      data: {
        schoolId: school.id,
        financialYearId: fy.id,
        voucherNo,
        voucherType: v.type,
        voucherDate: d(v.date),
        narration: v.narration,
        totalAmount: v.totalAmount,
        partyName: v.partyName || null,
        paymentMode: v.paymentMode || null,
        referenceNo: v.referenceNo || null,
        chequeNo: v.chequeNo || null,
        bankName: v.bankName || null,
        billNo: v.billNo || null,
        auditStatus: v.auditStatus || "pending",
        auditedAt: audited ? d(v.date) : null,
        auditedBy: audited ? admin?.id || null : null,
        createdById: admin?.id || null,
        isPosted: true,
        lines: {
          create: v.lines.map((l) => ({
            accountId: byCode[l.code].id,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description || null,
          })),
        },
      },
    });
    created++;
  }

  const stats = await prisma.voucher.groupBy({
    where: { schoolId: school.id, financialYearId: fy.id },
    by: ["voucherType", "auditStatus"],
    _count: true,
    _sum: { totalAmount: true },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        school: { code: school.code, name: school.name },
        financialYear: FY_LABEL,
        accounts: accounts.length,
        vouchersCreated: created,
        byType: counters,
        stats,
        openPath: "/accounting",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
