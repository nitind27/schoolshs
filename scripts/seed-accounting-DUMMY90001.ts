/**
 * Full FY accounting demo for DUMMY90001 (admin@dummy90001.local).
 * Creates / refreshes FY 2026-27 with CoA + ~1 year of vouchers for CA pack PDF.
 *
 * Run: npx tsx scripts/seed-accounting-DUMMY90001.ts
 */
import { prisma } from "../src/lib/db";
import {
  DEFAULT_ACCOUNTS,
  COMMON_SCHOOL_EXPENSE_TEMPLATES,
  getFinancialYearDates,
  getVoucherPrefix,
} from "../src/lib/accounting";

const SCHOOL_CODE = "DUMMY90001";
const FY_LABEL = "2026-27";

function d(iso: string) {
  return new Date(`${iso}T10:00:00.000Z`);
}

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

function monthPad(m: number) {
  return String(m).padStart(2, "0");
}

/** Build Apr 2026 – Mar 2027 monthly fee + salary + utilities + extras. */
function buildYearVouchers(): VDef[] {
  const out: VDef[] = [];

  // Opening journal
  out.push({
    type: "journal",
    date: "2026-04-01",
    narration: "Opening balances brought forward — fee receivable",
    totalAmount: 40000,
    auditStatus: "verified",
    lines: [
      { code: "2001", debit: 40000, description: "Fee receivable OB" },
      { code: "4001", credit: 40000, description: "Capital fund" },
    ],
  });

  // Monthly cycle: Apr 2026 (4) … Mar 2027 (3)
  const months: { y: number; m: number; label: string }[] = [];
  for (let m = 4; m <= 12; m++) months.push({ y: 2026, m, label: `${2026}-${monthPad(m)}` });
  for (let m = 1; m <= 3; m++) months.push({ y: 2027, m, label: `${2027}-${monthPad(m)}` });

  months.forEach((mo, idx) => {
    const feeCash = 95000 + (idx % 5) * 4500;
    const feeBank = 88000 + (idx % 4) * 5200;
    const salary = 268000 + (idx % 3) * 4000;
    const elect = 16000 + (idx % 6) * 800;
    const dayFee = monthPad(Math.min(28, 5 + (idx % 10)));
    const daySal = "28";
    const dayElect = "06";

    out.push({
      type: "receipt",
      date: `${mo.y}-${monthPad(mo.m)}-${dayFee}`,
      narration: `Tuition fee collection — ${mo.label} (cash + counter)`,
      totalAmount: feeCash,
      partyName: "Parents / Students",
      paymentMode: "Cash",
      auditStatus: idx < 8 ? "verified" : "pending",
      lines: [
        { code: "1001", debit: feeCash, description: "Cash fees" },
        { code: "5001", credit: feeCash, description: "Tuition fee income" },
      ],
    });

    out.push({
      type: "receipt",
      date: `${mo.y}-${monthPad(mo.m)}-${monthPad(Math.min(28, 12 + (idx % 8)))}`,
      narration: `Tuition / term fee — ${mo.label} (UPI / bank)`,
      totalAmount: feeBank,
      partyName: "Parents / Students",
      paymentMode: "UPI",
      auditStatus: idx < 8 ? "verified" : "pending",
      lines: [
        { code: "1002", debit: feeBank, description: "Bank UPI" },
        { code: "5001", credit: feeBank, description: "Tuition fee income" },
      ],
    });

    out.push({
      type: "payment",
      date: `${mo.y}-${monthPad(mo.m)}-${daySal}`,
      narration: `Staff salary — ${mo.label}`,
      totalAmount: salary,
      partyName: "Teaching & Non-teaching staff",
      paymentMode: "NEFT/RTGS",
      referenceNo: `SAL-${mo.label}`,
      auditStatus: idx < 8 ? "verified" : "pending",
      lines: [
        { code: "6001", debit: salary, description: "Salary expense" },
        { code: "1002", credit: salary, description: "Bank salary transfer" },
      ],
    });

    out.push({
      type: "payment",
      date: `${mo.y}-${monthPad(mo.m)}-${dayElect}`,
      narration: `Electricity bill — ${mo.label} (PGVCL)`,
      totalAmount: elect,
      partyName: "PGVCL",
      paymentMode: "Online",
      billNo: `PGVCL-${mo.y}${monthPad(mo.m)}`,
      auditStatus: idx < 8 ? "verified" : "pending",
      lines: [
        { code: "6002", debit: elect, description: "Electricity" },
        { code: "1002", credit: elect, description: "Online payment" },
      ],
    });

    // Cash ↔ bank contra twice a quarter
    if (idx % 3 === 0) {
      out.push({
        type: "contra",
        date: `${mo.y}-${monthPad(mo.m)}-18`,
        narration: `Cash deposited to SBI — ${mo.label}`,
        totalAmount: 60000,
        paymentMode: "Cash",
        auditStatus: "verified",
        lines: [
          { code: "1002", debit: 60000, description: "Bank deposit" },
          { code: "1001", credit: 60000, description: "Cash from hand" },
        ],
      });
    }
  });

  // One-time receipts / payments across the year
  out.push(
    {
      type: "receipt",
      date: "2026-04-15",
      narration: "Admission fee — new students batch 2026-27",
      totalAmount: 56000,
      partyName: "New admissions",
      paymentMode: "UPI",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 56000, description: "Bank" },
        { code: "5002", credit: 56000, description: "Admission fee" },
      ],
    },
    {
      type: "receipt",
      date: "2026-05-08",
      narration: "Government grant (SSA / education) received",
      totalAmount: 380000,
      partyName: "District Education Office",
      paymentMode: "NEFT/RTGS",
      referenceNo: "NEFT-SSA-260508",
      bankName: "State Bank of India",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 380000, description: "Grant to bank" },
        { code: "5003", credit: 380000, description: "Govt grant income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-06-20",
      narration: "Donation — library & reading corner",
      totalAmount: 30000,
      partyName: "Alumni Association",
      paymentMode: "Cheque",
      chequeNo: "551122",
      bankName: "Bank of Baroda",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 30000, description: "Cheque deposited" },
        { code: "5004", credit: 30000, description: "Donation income" },
      ],
    },
    {
      type: "receipt",
      date: "2026-08-14",
      narration: "Scholarship grant received (SC/ST)",
      totalAmount: 210000,
      partyName: "Digital Gujarat / SJED",
      paymentMode: "NEFT/RTGS",
      referenceNo: "DG-SCH-0814",
      auditStatus: "verified",
      lines: [
        { code: "1002", debit: 210000, description: "Scholarship grant" },
        { code: "5005", credit: 210000, description: "Scholarship grant income" },
      ],
    },
    {
      type: "payment",
      date: "2026-05-18",
      narration: "Stationery & exam paper purchase",
      totalAmount: 14500,
      partyName: "Shree Stationery Mart",
      paymentMode: "Cash",
      billNo: "SSM-220",
      auditStatus: "verified",
      lines: [
        { code: "6003", debit: 14500, description: "Stationery" },
        { code: "1001", credit: 14500, description: "Cash paid" },
      ],
    },
    {
      type: "payment",
      date: "2026-07-22",
      narration: "Building repair & white-wash",
      totalAmount: 52000,
      partyName: "Patel Contractors",
      paymentMode: "Cheque",
      chequeNo: "778901",
      bankName: "SBI",
      billNo: "PC-77",
      auditStatus: "verified",
      lines: [
        { code: "6004", debit: 52000, description: "Maintenance" },
        { code: "1002", credit: 52000, description: "Cheque issued" },
      ],
    },
    {
      type: "payment",
      date: "2026-08-20",
      narration: "Scholarship disbursement to students",
      totalAmount: 195000,
      partyName: "Scholarship beneficiaries",
      paymentMode: "NEFT/RTGS",
      referenceNo: "SCH-DISB-0820",
      auditStatus: "verified",
      lines: [
        { code: "6005", debit: 195000, description: "Scholarship paid" },
        { code: "1002", credit: 195000, description: "Bank transfer" },
      ],
    },
    {
      type: "payment",
      date: "2026-09-10",
      narration: "Water, cleaning & small expenses",
      totalAmount: 9200,
      partyName: "Local vendors",
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "6010", debit: 4800, description: "Water" },
        { code: "6012", debit: 4400, description: "Cleaning" },
        { code: "1001", credit: 9200, description: "Cash" },
      ],
    },
    {
      type: "payment",
      date: "2026-10-05",
      narration: "Internet broadband — quarterly",
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
      date: "2026-11-12",
      narration: "Sports equipment purchase",
      totalAmount: 16800,
      partyName: "Sports World Surat",
      paymentMode: "UPI",
      billNo: "SW-1102",
      auditStatus: "pending",
      lines: [
        { code: "6018", debit: 16800, description: "Sports" },
        { code: "1002", credit: 16800, description: "UPI" },
      ],
    },
    {
      type: "payment",
      date: "2027-01-20",
      narration: "Annual day / cultural program expense",
      totalAmount: 28500,
      partyName: "Event vendors",
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "6003", debit: 8500, description: "Decor / stationery" },
        { code: "6012", debit: 20000, description: "Program expense" },
        { code: "1001", credit: 28500, description: "Cash" },
      ],
    },
    {
      type: "journal",
      date: "2026-09-30",
      narration: "Salary payable provision — month end",
      totalAmount: 22000,
      auditStatus: "verified",
      lines: [
        { code: "6001", debit: 22000, description: "Salary provision" },
        { code: "3001", credit: 22000, description: "Salary payable" },
      ],
    },
    {
      type: "journal",
      date: "2026-10-01",
      narration: "Clear September salary payable",
      totalAmount: 22000,
      auditStatus: "pending",
      lines: [
        { code: "3001", debit: 22000, description: "Payable cleared" },
        { code: "1002", credit: 22000, description: "Bank" },
      ],
    },
    {
      type: "contra",
      date: "2027-02-15",
      narration: "Cash withdrawn for office & exam duty",
      totalAmount: 35000,
      paymentMode: "Cash",
      auditStatus: "pending",
      lines: [
        { code: "1001", debit: 35000, description: "Cash withdrawn" },
        { code: "1002", credit: 35000, description: "Bank debit" },
      ],
    },
  );

  return out;
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { code: SCHOOL_CODE },
    select: { id: true, name: true, code: true },
  });
  if (!school) {
    throw new Error(
      `School ${SCHOOL_CODE} not found. Run first:\n  npx tsx scripts/seed-dummy-school-DUMMY90001.ts`,
    );
  }

  const admin = await prisma.user.findFirst({
    where: { schoolId: school.id, role: "school_admin", isActive: true },
    select: { id: true, email: true },
  });

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Admin: ${admin?.email || "none"}`);

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
  console.log(`FY active: ${fy.label}`);

  await prisma.voucherLine.deleteMany({
    where: { voucher: { schoolId: school.id, financialYearId: fy.id } },
  });
  await prisma.voucher.deleteMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });
  await prisma.account.deleteMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });

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

  const openings: { code: string; amount: number; balanceType: "debit" | "credit" }[] = [
    { code: "1001", amount: 28000, balanceType: "debit" },
    { code: "1002", amount: 520000, balanceType: "debit" },
    { code: "1003", amount: 150000, balanceType: "debit" },
    { code: "1101", amount: 210000, balanceType: "debit" },
    { code: "1102", amount: 92000, balanceType: "debit" },
    { code: "4001", amount: 1000000, balanceType: "credit" },
  ];
  for (const o of openings) {
    const acc = byCode[o.code];
    if (!acc) continue;
    await prisma.account.update({
      where: { id: acc.id },
      data: { openingBalance: o.amount, balanceType: o.balanceType },
    });
  }
  console.log(`Accounts: ${accounts.length}`);

  const vouchers = buildYearVouchers();
  for (const v of vouchers) {
    for (const line of v.lines) {
      if (!byCode[line.code]) {
        throw new Error(`Missing account ${line.code} — ${v.narration}`);
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
      throw new Error(`Unbalanced ${voucherNo}: D ${totalDebit} C ${totalCredit}`);
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

  console.log(
    JSON.stringify(
      {
        ok: true,
        school: SCHOOL_CODE,
        financialYear: FY_LABEL,
        accounts: accounts.length,
        vouchersCreated: created,
        byType: counters,
        login: {
          schoolCode: SCHOOL_CODE,
          email: admin?.email || "admin@dummy90001.local",
          password: "DummyAdmin@123",
          open: "/accounting/ca-pack",
        },
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
