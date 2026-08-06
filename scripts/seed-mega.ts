/**
 * seed-mega.ts — Large-scale multi-school seed (100 000+ records)
 *
 * Creates N schools, each with:
 *   • School + SchoolSettings + SchoolSubscription
 *   • school_admin / teacher / clerk / ca user accounts
 *   • 15–20 Staff members (with payroll + attendance for 3 months)
 *   • 10 Classes (std 6-10, sections A/B) with class teachers
 *   • ~200 Students per school (configurable via STUDENTS_PER_CLASS)
 *   • Timetable (5 periods × 6 days per class)
 *   • FinancialYear + Chart of Accounts + 12 sample Vouchers
 *   • Holiday calendar (12 public holidays)
 *   • GeneralRegisterEntry for every student
 *   • StudentAttendanceMonth (3 months) for every student
 *
 * Usage:
 *   npx tsx scripts/seed-mega.ts              # default: 10 schools
 *   SCHOOLS=50 npx tsx scripts/seed-mega.ts   # 50 schools
 *   SCHOOLS=500 npx tsx scripts/seed-mega.ts  # ~100k students
 *
 * Run from repo root.
 */

import crypto from "crypto";
import { loadEnv } from "../src/lib/load-env";
import { createPrismaClient } from "../src/lib/prisma-factory";
import { hashPassword } from "../src/lib/auth";

loadEnv(); // loads .env so DATABASE_URL is available

// ─── Config ─────────────────────────────────────────────────────────────────
const SCHOOL_COUNT        = parseInt(process.env.SCHOOLS  ?? "10",  10);
const STUDENTS_PER_CLASS  = parseInt(process.env.SPC      ?? "20",  10); // ~200/school at default
const ACADEMIC_YEAR       = "2025-26";
const FINANCIAL_YEAR      = "2025-26";
const BATCH_SIZE          = 50;     // createMany batch size

const prisma = createPrismaClient();

// ─── Reference data ──────────────────────────────────────────────────────────
const DISTRICTS = [
  "Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar",
  "Gandhinagar","Anand","Mehsana","Patan","Kutch","Banaskantha",
  "Sabarkantha","Aravalli","Panchmahal","Dahod","Kheda","Tapi",
  "Navsari","Valsad","Narmada","Bharuch","Narmada","Morbi",
  "Surendranagar","Amreli","Gir Somnath","Junagadh","Porbandar",
  "Botad","Chhota Udaipur","Devbhoomi Dwarka","Mahisagar","Dang",
];

const SCHOOL_PREFIXES = [
  "Sarvoday","Navjivan","Gyanoday","Saraswati","Vidyapeeth",
  "Pragati","Prerna","Gyansagar","Bharati","Vivekanand",
  "Subhash","Lokbharti","Keshav","Hari Om","Shanti",
  "Amrut","Jyot","Udyan","Sunrise","Rainbow",
];
const SCHOOL_TYPES   = ["Primary","Secondary","Higher Secondary","K-12"];

const MALE_FIRST   = ["ARJUN","REHAN","MIT","HARSH","KRUNAL","YASH","DIPAK","VIRAL","NIRAV","KETAN","JAY","RAHUL","SANJAY","MAYUR","HARDIK","BHAVIN","CHIRAG","DEV","ROHAN","AMIT","VIVEK","SUNIL","KAMAL","DEEPAK","NARESH","MUKESH","SURESH","HITESH","NILESH","ALPESH","BHAVESH","CHINTAN","DARSHAN","FALGUNI","GAURANG"];
const FEMALE_FIRST = ["KAVYA","DIYA","PRIYA","NISHA","HETAL","KOMAL","REKHA","MEERA","JINAL","BHUMI","KINJAL","PARUL","HEENA","ASHA","MANISHA","NEHA","RUPA","SITA","GEETA","LATA","USHA","KOKILA","SARLA","KAMLA","BHAVNA","JAYSHREE","DAXA","HANSABEN","KIRAN","MALA","NITA","RITA","SHILPA","TEJAL","VARSHA"];
const SURNAMES     = ["PATEL","SHAH","MEHTA","DESAI","PARMAR","RATHOD","THAKOR","CHAUHAN","VAGHELA","SOLANKI","BARIYA","VASAVA","GAMIT","TADVI","VALA","TRIVEDI","JOSHI","OZA","BHATT","MODI","PANDYA","SUTHAR","DARJI","SALAT","KOLI","RABARI","CHAUDHARI","NAIK","BAROT","BARIA"];
const FATHER_NAMES = ["RAMESH","SURESH","MAHESH","NARESH","DINESH","PRAKASH","ASHOK","RAJESH","MAHENDRA","BHUPENDRA","JAGDISH","GHANSHYAM","KANTILAL","HASMUKH","BHARAT","VINOD","ANIL","VIJAY","DILIP","HIREN","KIRAN","LALIT","NILESH","OMKAR","PRAVIN"];
const MOTHER_NAMES = ["KOKILA","MANJULA","SARLA","KAMLA","GEETA","ASHA","LATA","USHA","REKHA","NIRMALA","JAYSHREE","BHAVNA","DAXA","HANSABEN","KIRAN","MALA","NITA","RITA","SAVITA","TARABEN","URMILA","VARSHA","WANDA","YAMINI","ZINNIA"];
const DESIGNATIONS = ["Principal","Vice Principal","Head Teacher","Class Teacher","Teacher","Senior Teacher","Clerk","Accountant","Lab Assistant","Librarian","Sports Teacher","Peon"];
const SUBJECTS     = ["Gujarati","English","Hindi","Mathematics","Science","Social Science","Sanskrit","Computer","Physical Education","Drawing","Music"];
const BANKS        = ["BANK OF BARODA","STATE BANK OF INDIA","HDFC BANK","BANK OF INDIA","UNION BANK","CANARA BANK","CENTRAL BANK","DENA BANK","VIJAYA BANK","PNB"];
const IFSC_BASES   = ["BARB0FORT","SBIN0014","HDFC0001","BKID0001","UBIN0001","CNRB0001","CBIN0001","BKDN0001","VIJB0001","PUNB0001"];
const CATEGORIES   = ["Open","SC","ST","OBC","SEBC","EWS","Minority"];
const CASTES: Record<string,string> = { Open:"General", SC:"SC", ST:"ST", OBC:"BAXI", SEBC:"SEBC", EWS:"EWS", Minority:"Muslim" };
const RELIGIONS    = ["Hindu","Muslim","Christian","Jain","Sikh","Buddhist"];
const OCCUPATIONS  = ["Farmer","Daily Wage Labour","Shopkeeper","Driver","Factory Worker","Self Employed","Government Employee","Teacher","Business"];
const HOUSING      = ["Own","Rented","Government Quarters"];
const RESIDENT     = ["Rural","Urban","Semi-Urban"];

function pick<T>(arr: T[], seed: number): T { return arr[Math.abs(seed) % arr.length]; }
function pad(n: number, len = 12): string { return String(n).padStart(len, "0"); }
function rnd(min: number, max: number, seed: number): number { return min + (Math.abs(seed * 7919 + 1) % (max - min + 1)); }

// ─── Counters (shared across all schools to guarantee uniqueness) ─────────────
let globalAadhaar = 900000000001n;
let globalGr      = 10001;
let globalEmpSeq  = 1;

function nextAadhaar(): string { return String(globalAadhaar++); }
function nextGr():      string { return String(globalGr++); }
function nextEmpId():   string { return `E${String(globalEmpSeq++).padStart(6,"0")}`; }

// ─── School name generator ───────────────────────────────────────────────────
function schoolName(i: number): { name: string; code: string; district: string; type: string } {
  const prefix  = pick(SCHOOL_PREFIXES, i);
  const district = pick(DISTRICTS, i * 3 + 7);
  const type     = pick(SCHOOL_TYPES, i);
  const name     = `${prefix} ${type} School ${district}`;
  const code     = `SCH${String(i + 1).padStart(5,"0")}`;
  return { name, code, district, type };
}

// ─── DOB for standard ────────────────────────────────────────────────────────
function dob(standard: string, idx: number): string {
  const base  = parseInt(standard, 10);
  const year  = 2013 - base + (idx % 2);
  const month = (idx % 12) + 1;
  const day   = (idx % 28) + 1;
  return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${year}`;
}

// ─── DEFAULT ACCOUNTS ────────────────────────────────────────────────────────
const DEFAULT_ACCOUNTS = [
  { code:"1001", name:"Cash in Hand",          groupType:"Assets",      accountType:"Current Asset",   balanceType:"debit"  },
  { code:"1002", name:"Bank Account",          groupType:"Assets",      accountType:"Current Asset",   balanceType:"debit"  },
  { code:"1003", name:"Fixed Deposits",        groupType:"Assets",      accountType:"Fixed Asset",     balanceType:"debit"  },
  { code:"2001", name:"Fees Received",         groupType:"Income",      accountType:"Revenue",         balanceType:"credit" },
  { code:"2002", name:"Grant Received",        groupType:"Income",      accountType:"Revenue",         balanceType:"credit" },
  { code:"2003", name:"Donation Received",     groupType:"Income",      accountType:"Revenue",         balanceType:"credit" },
  { code:"3001", name:"Salaries & Wages",      groupType:"Expenses",    accountType:"Direct Expense",  balanceType:"debit"  },
  { code:"3002", name:"Electricity Charges",   groupType:"Expenses",    accountType:"Indirect Expense",balanceType:"debit"  },
  { code:"3003", name:"Stationery",            groupType:"Expenses",    accountType:"Indirect Expense",balanceType:"debit"  },
  { code:"3004", name:"Maintenance",           groupType:"Expenses",    accountType:"Indirect Expense",balanceType:"debit"  },
  { code:"3005", name:"Sports & Extra Curricular",groupType:"Expenses", accountType:"Indirect Expense",balanceType:"debit"  },
  { code:"4001", name:"Govt Grant Payable",    groupType:"Liabilities", accountType:"Current Liability",balanceType:"credit"},
  { code:"4002", name:"Salary Payable",        groupType:"Liabilities", accountType:"Current Liability",balanceType:"credit"},
];

// ─── HOLIDAYS ────────────────────────────────────────────────────────────────
const HOLIDAYS_2025 = [
  { date:"2025-01-14", name:"Uttarayan",    nameGu:"ઉત્તરાયણ",   type:"public" },
  { date:"2025-01-26", name:"Republic Day", nameGu:"પ્રજાસત્તાક દિન",type:"public" },
  { date:"2025-02-26", name:"Maha Shivratri",nameGu:"મહા શિવરાત્રી",type:"public" },
  { date:"2025-03-13", name:"Holi",         nameGu:"હોળી",       type:"public" },
  { date:"2025-03-14", name:"Dhuleti",      nameGu:"ધૂળેટી",     type:"public" },
  { date:"2025-04-10", name:"Ram Navami",   nameGu:"રામ નવમી",   type:"public" },
  { date:"2025-04-14", name:"Dr. Ambedkar Jayanti",nameGu:"ડો. આંબેડકર જ્યંતિ",type:"public" },
  { date:"2025-05-12", name:"Buddha Purnima",nameGu:"બુદ્ધ પૂર્ણિમા",type:"public" },
  { date:"2025-08-15", name:"Independence Day",nameGu:"સ્વતંત્રતા દિવસ",type:"public" },
  { date:"2025-10-02", name:"Gandhi Jayanti",nameGu:"ગાંધી જ્યંતિ",type:"public" },
  { date:"2025-10-20", name:"Diwali",       nameGu:"દિવાળી",     type:"public" },
  { date:"2025-11-05", name:"Labh Pancham", nameGu:"લાભ પાંચમ",  type:"school" },
];

// ─── Timetable subjects per standard ─────────────────────────────────────────
function getSubjectsForStandard(std: string): string[] {
  const base = ["Gujarati","English","Mathematics","Science","Social Science"];
  if (parseInt(std,10) >= 9) return [...base, "Hindi","Sanskrit","Computer"];
  if (parseInt(std,10) >= 7) return [...base, "Hindi","Drawing"];
  return [...base, "Hindi"];
}

// ─── Seed one school ──────────────────────────────────────────────────────────
async function seedSchool(schoolIdx: number) {
  const meta = schoolName(schoolIdx);
  console.log(`\n[${schoolIdx + 1}/${SCHOOL_COUNT}] ${meta.name} (${meta.code})`);

  // ── School ──
  const school = await prisma.school.upsert({
    where: { code: meta.code },
    create: {
      name: meta.code === "SCH00001" ? meta.name : meta.name,
      code: meta.code,
      district: meta.district,
      taluka: meta.district,
      city: meta.district,
      pincode: `3${String(94000 + schoolIdx).slice(-5)}`,
      address: `${meta.name}, ${meta.district}, Gujarat`,
      phone: `9${String(700000000 + schoolIdx).slice(-9)}`,
      email: `admin@${meta.code.toLowerCase()}.local`,
      principalName: `${pick(MALE_FIRST, schoolIdx)} ${pick(SURNAMES, schoolIdx)}`,
      schoolType: meta.type,
      udiseCode: `24${String(schoolIdx + 100000).padStart(9,"0")}`,
      isActive: true,
    },
    update: {},
  });

  // ── Settings ──
  const smsToken = crypto.randomBytes(24).toString("hex");
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      schoolName: meta.name,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolEmail: school.email,
      academicYear: ACADEMIC_YEAR,
      tagline: "Education for All · Gujarat",
      smsInboxToken: smsToken,
    },
    update: {},
  });

  // ── Subscription (Standard plan) ──
  await prisma.schoolSubscription.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      planName: "standard",
      enabledFeatures: JSON.parse(
        '["dashboard","classes","students","staff","admissions","results","attendance","scholarship_add","scholarship_import","scholarship_bulk_submit","scholarship_export","certificates","id_cards","portal_teacher","portal_clerk","portal_student","chat"]'
      ),
      paymentStatus: "paid",
    },
    update: {},
  });

  // ── Users ──
  const adminEmail   = `admin@${meta.code.toLowerCase()}.local`;
  const teacherEmail = `teacher@${meta.code.toLowerCase()}.local`;
  const clerkEmail   = `clerk@${meta.code.toLowerCase()}.local`;
  const caEmail      = `ca@${meta.code.toLowerCase()}.local`;

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: hashPassword("SchoolAdmin@123"),
      name: `${meta.name} Admin`,
      role: "school_admin",
      schoolId: school.id,
      emailVerified: true,
    },
    update: { schoolId: school.id },
  });

  // ── Financial Year ──
  const fy = await prisma.financialYear.upsert({
    where: { schoolId_label: { schoolId: school.id, label: FINANCIAL_YEAR } },
    create: {
      schoolId: school.id,
      label: FINANCIAL_YEAR,
      startDate: new Date("2025-04-01"),
      endDate:   new Date("2026-03-31"),
      isActive: true,
    },
    update: { isActive: true },
  });

  // ── Chart of Accounts ──
  const acctCount = await prisma.account.count({ where: { financialYearId: fy.id } });
  if (acctCount === 0) {
    await prisma.account.createMany({
      data: DEFAULT_ACCOUNTS.map(a => ({
        schoolId: school.id,
        financialYearId: fy.id,
        ...a,
      })),
      skipDuplicates: true,
    });
  }

  // ── Vouchers (12 sample entries) ──
  const voucherCount = await prisma.voucher.count({ where: { schoolId: school.id } });
  if (voucherCount === 0) {
    const cashAcct = await prisma.account.findFirst({ where: { schoolId: school.id, code: "1001" } });
    const feesAcct = await prisma.account.findFirst({ where: { schoolId: school.id, code: "2001" } });
    const salAcct  = await prisma.account.findFirst({ where: { schoolId: school.id, code: "3001" } });
    if (cashAcct && feesAcct && salAcct) {
      for (let vi = 1; vi <= 12; vi++) {
        const amount   = (5000 + vi * 1200);
        const vType    = vi % 3 === 0 ? "Payment" : "Receipt";
        const vDate    = new Date(`2025-${String((vi % 12) + 1).padStart(2,"0")}-05`);
        const voucher  = await prisma.voucher.create({
          data: {
            schoolId: school.id,
            financialYearId: fy.id,
            voucherNo: `V${String(vi).padStart(4,"0")}`,
            voucherType: vType,
            voucherDate: vDate,
            narration: vType === "Receipt" ? `Fees collected ${vi}` : `Salary payment ${vi}`,
            totalAmount: amount,
            paymentMode: "Cash",
            isPosted: true,
            createdById: adminUser.id,
          },
        });
        if (vType === "Receipt") {
          await prisma.voucherLine.createMany({ data: [
            { voucherId: voucher.id, accountId: cashAcct.id, debit: amount, credit: 0 },
            { voucherId: voucher.id, accountId: feesAcct.id, debit: 0, credit: amount },
          ]});
        } else {
          await prisma.voucherLine.createMany({ data: [
            { voucherId: voucher.id, accountId: salAcct.id,  debit: amount, credit: 0 },
            { voucherId: voucher.id, accountId: cashAcct.id, debit: 0, credit: amount },
          ]});
        }
      }
    }
  }

  // ── Holidays ──
  for (const h of HOLIDAYS_2025) {
    await prisma.holiday.upsert({
      where: { schoolId_date: { schoolId: school.id, date: h.date } },
      create: { schoolId: school.id, ...h, academicYear: ACADEMIC_YEAR },
      update: {},
    });
  }

  // ── Staff ──
  console.log(`  → Creating staff...`);
  const staffRows: { empId: string; firstName: string; lastName: string; desig: string; gender: string; email: string; salary: number }[] = [];

  // Admin staff (5 fixed roles)
  const adminDesigs = ["Principal","Vice Principal","Clerk","Accountant","Peon"];
  for (let si = 0; si < 5; si++) {
    const empId    = nextEmpId();
    const isFem    = si === 1;
    const firstName = pick(isFem ? FEMALE_FIRST : MALE_FIRST, schoolIdx * 100 + si);
    const lastName  = pick(SURNAMES, schoolIdx * 50 + si);
    staffRows.push({ empId, firstName, lastName, desig: adminDesigs[si], gender: isFem ? "Female" : "Male", email: `${adminDesigs[si].toLowerCase().replace(/\s/g,"")}@${meta.code.toLowerCase()}.local`, salary: 15000 + si * 3000 });
  }

  // Teacher staff (one per class, added below alongside class creation)
  // We'll upsert them during class loop.

  // Upsert admin staff first
  const clerkRecord  = { id: "" };
  const teacherRecord = { id: "" };
  const principalRecord = { id: "" };

  for (let si = 0; si < staffRows.length; si++) {
    const s = staffRows[si];
    const bankIdx = rnd(0, BANKS.length - 1, schoolIdx + si);
    const staff = await prisma.staff.upsert({
      where: { schoolId_employeeId: { schoolId: school.id, employeeId: s.empId } },
      create: {
        schoolId: school.id,
        employeeId: s.empId,
        firstName: s.firstName,
        lastName: s.lastName,
        designation: s.desig,
        department: s.desig === "Principal" || s.desig === "Vice Principal" ? "Administration" : "Office",
        mobileNumber: `9${String(800000000 + parseInt(s.empId.slice(1),10)).slice(-9)}`,
        email: s.email,
        gender: s.gender,
        dateOfJoining: `01/06/${2010 + (si % 12)}`,
        monthlySalary: s.salary,
        bankName: BANKS[bankIdx],
        bankAccount: pad(200000 + parseInt(s.empId.slice(1), 10), 12),
        ifscCode: IFSC_BASES[bankIdx] + "SO",
        isActive: true,
      },
      update: { isActive: true },
    });
    if (s.desig === "Clerk") clerkRecord.id = staff.id;
    if (s.desig === "Principal") principalRecord.id = staff.id;
  }

  // Clerk user
  if (clerkRecord.id) {
    await prisma.user.upsert({
      where: { email: clerkEmail },
      create: { email: clerkEmail, passwordHash: hashPassword("Clerk@123"), name: "Clerk", role: "clerk", schoolId: school.id, staffId: clerkRecord.id, emailVerified: true },
      update: { staffId: clerkRecord.id, schoolId: school.id },
    });
  }

  // CA user
  await prisma.user.upsert({
    where: { email: caEmail },
    create: { email: caEmail, passwordHash: hashPassword("CA@12345"), name: "CA Auditor", role: "ca", schoolId: school.id, emailVerified: true },
    update: { schoolId: school.id },
  });

  // ── Classes (std 6–10, sections A & B = 10 classes) ──
  console.log(`  → Creating classes + students...`);
  const STANDARDS   = ["6","7","8","9","10"];
  const SECTIONS    = ["A","B"];
  const classRecords: { id: string; standard: string; section: string }[] = [];
  let firstTeacherStaffId = "";

  for (const std of STANDARDS) {
    for (const sec of SECTIONS) {
      const empId     = nextEmpId();
      const tIdx      = rnd(0, MALE_FIRST.length - 1, schoolIdx * 200 + parseInt(std) * 10 + sec.charCodeAt(0));
      const firstName = pick(MALE_FIRST, tIdx);
      const lastName  = pick(SURNAMES, tIdx + 3);
      const bankIdx   = rnd(0, BANKS.length - 1, tIdx);

      const teacher = await prisma.staff.upsert({
        where: { schoolId_employeeId: { schoolId: school.id, employeeId: empId } },
        create: {
          schoolId: school.id,
          employeeId: empId,
          firstName,
          lastName,
          designation: "Teacher",
          department: `Std ${std}`,
          mobileNumber: `9${String(900000000 + parseInt(empId.slice(1),10)).slice(-9)}`,
          email: `t${std}${sec.toLowerCase()}@${meta.code.toLowerCase()}.local`,
          gender: tIdx % 3 === 0 ? "Female" : "Male",
          dateOfJoining: `01/06/${2015 + (tIdx % 8)}`,
          monthlySalary: 26000 + (parseInt(std,10) * 500),
          bankName: BANKS[bankIdx],
          bankAccount: pad(300000 + parseInt(empId.slice(1), 10), 12),
          ifscCode: IFSC_BASES[bankIdx] + "SO",
          isActive: true,
        },
        update: { isActive: true },
      });
      if (!firstTeacherStaffId) firstTeacherStaffId = teacher.id;

      const schoolClass = await prisma.schoolClass.upsert({
        where: { schoolId_standard_section_stream_academicYear: { schoolId: school.id, standard: std, section: sec, stream: "", academicYear: ACADEMIC_YEAR } },
        create: {
          schoolId: school.id,
          name: `Class ${std}-${sec}`,
          standard: std,
          section: sec,
          stream: "",
          academicYear: ACADEMIC_YEAR,
          institutionName: meta.name,
          institutionDistrict: meta.district,
          classTeacherId: teacher.id,
        },
        update: { classTeacherId: teacher.id, institutionName: meta.name },
      });
      classRecords.push({ id: schoolClass.id, standard: std, section: sec });
    }
  }

  // Teacher user (first class teacher)
  if (firstTeacherStaffId) {
    await prisma.user.upsert({
      where: { email: teacherEmail },
      create: { email: teacherEmail, passwordHash: hashPassword("Teacher@123"), name: "Class Teacher", role: "teacher", schoolId: school.id, staffId: firstTeacherStaffId, emailVerified: true },
      update: { staffId: firstTeacherStaffId, schoolId: school.id },
    });
  }

  // ── School subject master + class subjects + standard links ──
  console.log(`  → Creating subjects...`);
  const subjectIdsByCode = new Map<string, string>();
  for (let si = 0; si < SUBJECTS.length; si++) {
    const name = SUBJECTS[si];
    const code = name.toUpperCase().replace(/\s+/g, "_").slice(0, 20);
    const subj = await prisma.schoolSubject.upsert({
      where: { schoolId_code: { schoolId: school.id, code } },
      create: {
        schoolId: school.id,
        name,
        code,
        shortName: name.slice(0, 3).toUpperCase(),
        type: "numeric",
        maxMarks: 100,
        sortOrder: si,
        isActive: true,
      },
      update: { isActive: true, name },
    });
    subjectIdsByCode.set(code, subj.id);
  }

  for (const std of STANDARDS) {
    const stdSubjects = getSubjectsForStandard(std);
    const subjectIds = stdSubjects
      .map((n) => subjectIdsByCode.get(n.toUpperCase().replace(/\s+/g, "_").slice(0, 20)))
      .filter((id): id is string => Boolean(id));

    await prisma.standardSubject.deleteMany({
      where: { schoolId: school.id, standard: std, stream: "" },
    });
    if (subjectIds.length) {
      await prisma.standardSubject.createMany({
        data: subjectIds.map((subjectId, i) => ({
          schoolId: school.id,
          standard: std,
          stream: "",
          subjectId,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });
    }
  }

  for (const cls of classRecords) {
    const existing = await prisma.classSubject.count({ where: { classId: cls.id } });
    if (existing > 0) continue;
    const names = getSubjectsForStandard(cls.standard);
    await prisma.classSubject.createMany({
      data: names.map((name, i) => ({
        classId: cls.id,
        name,
        code: name.toUpperCase().replace(/\s+/g, "_").slice(0, 20),
        shortName: name.slice(0, 3).toUpperCase(),
        type: "numeric",
        maxMarks: 100,
        sortOrder: i,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  return { school, fy, classRecords };
}

// ─── Seed students for a school ──────────────────────────────────────────────
async function seedStudents(
  schoolId: string,
  schoolName_: string,
  district: string,
  classRecords: { id: string; standard: string; section: string }[],
  schoolIdx: number,
) {
  const rows: Record<string, unknown>[] = [];

  for (const cls of classRecords) {
    const stdInt  = parseInt(cls.standard, 10);
    const sectionN = cls.section.charCodeAt(0) - 64; // A=1, B=2

    for (let roll = 1; roll <= STUDENTS_PER_CLASS; roll++) {
      const seed     = schoolIdx * 100000 + stdInt * 1000 + sectionN * 100 + roll;
      const isFemale = roll % 3 === 0;
      const firstName  = pick(isFemale ? FEMALE_FIRST : MALE_FIRST, seed + 1);
      const surname    = pick(SURNAMES, seed + 2);
      const fatherName = pick(FATHER_NAMES, seed + 3);
      const motherName = pick(MOTHER_NAMES, seed + 4);
      const catIdx     = seed % CATEGORIES.length;
      const category   = CATEGORIES[catIdx];
      const caste      = CASTES[category] ?? "General";
      const religion   = pick(RELIGIONS, seed + 5);
      const occupation = pick(OCCUPATIONS, seed + 6);
      const housing    = pick(HOUSING, seed + 7);
      const resident   = pick(RESIDENT, seed + 8);
      const bankIdx    = seed % BANKS.length;
      const aadhaar    = nextAadhaar();
      const gr         = nextGr();
      const income     = 40000 + rnd(0, 120000, seed);
      const pincode    = `3${String(94000 + schoolIdx + roll).slice(-5)}`;
      const mobile     = `9${String(700000000 + seed).slice(-9)}`;
      const acctNo     = pad(seed + 100000, 12);
      const aadhaarName = `${firstName} ${surname}`;

      const isBoard10 = cls.standard === "10";
      const pct = isBoard10 ? 40 + rnd(0, 55, seed) : 0;

      rows.push({
        schoolId,
        classId: cls.id,
        firstName,
        middleName: fatherName,
        surname,
        fatherName,
        motherName,
        aadhaarName,
        aadhaarNumber: aadhaar,
        dateOfBirth: dob(cls.standard, seed),
        gender: isFemale ? "Female" : "Male",
        category,
        caste,
        religion,
        maritalStatus: "Unmarried",
        parentOccupation: occupation,
        isOrphan: false,
        annualFamilyIncome: income,
        rationCardNumber: `RC${String(schoolIdx).padStart(4,"0")}${String(seed).padStart(6,"0")}`,
        mobileNumber: mobile,
        currentAddress: `${district}, Gujarat`,
        currentDistrict: district,
        currentCity: district,
        currentPincode: pincode,
        permanentAddress: `${district}, Gujarat`,
        permanentDistrict: district,
        permanentCity: district,
        permanentPincode: pincode,
        habitationType: housing,
        familySize: 3 + rnd(0, 5, seed),
        residentType: resident,
        isHosteler: false,
        rollNumber: String(roll),
        grNumber: gr,
        section: cls.section,
        standard: cls.standard,
        scholarshipScheme: "MYSY Scholarship",
        financialYear: ACADEMIC_YEAR,
        courseType: stdInt >= 11 ? "Higher Secondary" : "Secondary",
        courseName: `Class ${cls.standard}`,
        institutionDistrict: district,
        institutionName: schoolName_,
        currentYear: "1st Year",
        admissionType: "Regular",
        board10th: "GSEB",
        percentage10th: isBoard10 ? pct : 0,
        year10th: isBoard10 ? "2025" : "",
        ...(isBoard10 ? {
          sscSeatPrefix: pick(["A","B","C","G","S","P"], seed),
          sscSeatNumber: String(4000000 + seed).slice(-7),
        } : {}),
        bankName: BANKS[bankIdx],
        branchName: district,
        accountNumber: acctNo,
        ifscCode: IFSC_BASES[bankIdx] + "SO",
        accountHolderName: aadhaarName,
        status: pick(["draft","ready","ready","ready","submitted","approved"], seed % 6),
        admissionStatus: pick(["pending","verified","verified","verified"], seed % 4),
        bloodGroup: pick(["A+","A-","B+","B-","O+","O-","AB+","AB-"], seed),
        childUid: String(240000000000000000n + BigInt(seed)).slice(0, 18),
        notes: `Auto-seeded · ${schoolName_} · Class ${cls.standard}-${cls.section}`,
      });
    }
  }

  // Batch insert
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await prisma.student.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: rows.slice(i, i + BATCH_SIZE) as any,
      skipDuplicates: true,
    });
  }

  return rows.length;
}

// ─── Seed timetable for all classes of a school ───────────────────────────────
async function seedTimetable(
  schoolId: string,
  classRecords: { id: string; standard: string }[],
  schoolIdx: number,
) {
  // Find all teachers for this school
  const teachers = await prisma.staff.findMany({
    where: { schoolId, isActive: true, designation: "Teacher" },
    select: { id: true },
  });

  const entries: Record<string, unknown>[] = [];
  let tIdx = 0;

  for (const cls of classRecords) {
    const subjects = getSubjectsForStandard(cls.standard);
    for (let day = 1; day <= 6; day++) {      // Mon–Sat
      for (let period = 0; period < 7; period++) { // 7 periods
        const subj    = subjects[(day * 7 + period + tIdx) % subjects.length];
        const teacher = teachers.length > 0 ? teachers[tIdx % teachers.length] : null;
        entries.push({
          schoolId,
          classId: cls.id,
          academicYear: ACADEMIC_YEAR,
          dayOfWeek: day,
          periodIndex: period,
          subject: subj,
          teacherId: teacher?.id ?? null,
          room: `R${(tIdx % 20) + 101}`,
        });
        tIdx++;
      }
    }
  }

  // Delete existing timetable for this school first
  await prisma.timetableEntry.deleteMany({ where: { schoolId } });

  // Batch insert
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    await prisma.timetableEntry.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: entries.slice(i, i + BATCH_SIZE) as any,
      skipDuplicates: true,
    });
  }
  return entries.length;
}

// ─── Seed staff attendance + payroll (3 months) ───────────────────────────────
async function seedStaffPayroll(schoolId: string) {
  const staffList = await prisma.staff.findMany({
    where: { schoolId, isActive: true },
    select: { id: true, monthlySalary: true },
  });

  const months = [
    { month: 4, year: 2025 },
    { month: 5, year: 2025 },
    { month: 6, year: 2025 },
  ];

  for (const s of staffList) {
    const salary = s.monthlySalary ?? 20000;
    for (const m of months) {
      const workDays    = 26;
      const presentDays = 22 + (m.month % 4);
      const absentDays  = workDays - presentDays;
      const gross       = salary;
      const deductions  = Math.round(gross * 0.12); // PF 12%
      const net         = gross - deductions;

      // Attendance
      const daysObj: Record<string, string> = {};
      for (let d = 1; d <= 30; d++) {
        const dow = new Date(m.year, m.month - 1, d).getDay();
        daysObj[d] = dow === 0 ? "SH" : d <= presentDays ? "P" : "A";
      }

      await prisma.staffAttendanceMonth.upsert({
        where: { staffId_month_year: { staffId: s.id, month: m.month, year: m.year } },
        create: { schoolId, staffId: s.id, month: m.month, year: m.year, daysJson: JSON.stringify(daysObj), presentDays, absentDays, leaveDays: 0, halfDays: 0 },
        update: {},
      });

      // Payroll
      await prisma.staffPayroll.upsert({
        where: { staffId_month_year: { staffId: s.id, month: m.month, year: m.year } },
        create: { schoolId, staffId: s.id, month: m.month, year: m.year, workingDays: workDays, presentDays, absentDays, grossSalary: gross, deductions, netSalary: net, paymentStatus: m.month < 6 ? "paid" : "pending" },
        update: {},
      });
    }
  }
}

// ─── Seed student attendance (3 months) ──────────────────────────────────────
async function seedStudentAttendance(schoolId: string, classRecords: { id: string }[]) {
  const months = [
    { month: 6, year: 2025 },
    { month: 7, year: 2025 },
    { month: 8, year: 2025 },
  ];

  for (const cls of classRecords) {
    const students = await prisma.student.findMany({
      where: { classId: cls.id },
      select: { id: true },
    });

    const attRows: Record<string, unknown>[] = [];
    let si = 0;
    for (const s of students) {
      for (const m of months) {
        const totalWorkingDays = 24;
        const presentDays      = 20 + (si % 5);
        const daysObj: Record<string, string> = {};
        for (let d = 1; d <= 30; d++) {
          const dow = new Date(m.year, m.month - 1, d).getDay();
          daysObj[d] = dow === 0 ? "SH" : d <= presentDays ? "P" : "A";
        }
        attRows.push({
          schoolId,
          studentId: s.id,
          classId: cls.id,
          month: m.month,
          year: m.year,
          daysJson: JSON.stringify(daysObj),
          monthTotal: totalWorkingDays,
          prevTotal: totalWorkingDays * (m.month - 6),
          cumulative: totalWorkingDays * (m.month - 5),
        });
        si++;
      }
    }

    // Batch upsert (ignore duplicates)
    for (let i = 0; i < attRows.length; i += BATCH_SIZE) {
      await prisma.studentAttendanceMonth.createMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: attRows.slice(i, i + BATCH_SIZE) as any,
        skipDuplicates: true,
      });
    }
  }
}

// ─── Seed GeneralRegisterEntry for all students ───────────────────────────────
async function seedGeneralRegister(schoolId: string) {
  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { id: true, grNumber: true, firstName: true, surname: true, fatherName: true, motherName: true, dateOfBirth: true, standard: true, section: true, caste: true, religion: true },
  });

  const grRows: Record<string, unknown>[] = [];
  for (const s of students) {
    grRows.push({
      schoolId,
      studentId: s.id,
      academicYear: ACADEMIC_YEAR,
      grNumber: s.grNumber ?? String(globalGr++),
      surname: s.surname ?? "",
      firstName: s.firstName ?? "",
      fatherName: s.fatherName ?? "",
      motherName: s.motherName ?? "",
      religionCaste: `${s.religion ?? ""} / ${s.caste ?? ""}`,
      dateOfBirth: s.dateOfBirth ?? "",
      standard: s.standard ?? "",
      section: s.section ?? "",
      admissionDate: "01/06/2025",
      progress: "Good",
      conduct: "સારી",
    });
  }

  for (let i = 0; i < grRows.length; i += BATCH_SIZE) {
    await prisma.generalRegisterEntry.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: grRows.slice(i, i + BATCH_SIZE) as any,
      skipDuplicates: true,
    });
  }
  return grRows.length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();

  console.log("═══════════════════════════════════════════════════════");
  console.log(`  seed-mega.ts — ${SCHOOL_COUNT} schools × ~${STUDENTS_PER_CLASS * 10} students/school`);
  console.log(`  Expected total students: ~${SCHOOL_COUNT * STUDENTS_PER_CLASS * 10}`);
  console.log("═══════════════════════════════════════════════════════\n");

  // Super admin (idempotent)
  await prisma.user.upsert({
    where: { email: "superadmin@shs.local" },
    create: { email: "superadmin@shs.local", passwordHash: hashPassword("SuperAdmin@123"), name: "Super Admin", role: "super_admin", emailVerified: true },
    update: {},
  });

  let totalStudents    = 0;
  let totalStaff       = 0;
  let totalTimetable   = 0;
  let totalGrEntries   = 0;

  for (let si = 0; si < SCHOOL_COUNT; si++) {
    const { school, classRecords } = await seedSchool(si);

    // Students
    const studentCount = await seedStudents(school.id, school.name, school.district ?? "Gujarat", classRecords, si);
    totalStudents += studentCount;
    console.log(`  ✓ ${studentCount} students`);

    // Timetable
    const ttCount = await seedTimetable(school.id, classRecords, si);
    totalTimetable += ttCount;
    console.log(`  ✓ ${ttCount} timetable entries`);

    // Staff attendance + payroll
    await seedStaffPayroll(school.id);
    const staffCount = await prisma.staff.count({ where: { schoolId: school.id } });
    totalStaff += staffCount;
    console.log(`  ✓ ${staffCount} staff (attendance + payroll seeded)`);

    // Student attendance
    await seedStudentAttendance(school.id, classRecords);
    console.log(`  ✓ student attendance (3 months)`);

    // General Register
    const grCount = await seedGeneralRegister(school.id);
    totalGrEntries += grCount;
    console.log(`  ✓ ${grCount} general register entries`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  SEED COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Schools created   : ${SCHOOL_COUNT}`);
  console.log(`  Total students    : ${totalStudents.toLocaleString()}`);
  console.log(`  Total staff       : ${totalStaff.toLocaleString()}`);
  console.log(`  Timetable entries : ${totalTimetable.toLocaleString()}`);
  console.log(`  GR entries        : ${totalGrEntries.toLocaleString()}`);
  console.log(`  Time taken        : ${elapsed}s`);
  console.log("\n  Login credentials (all schools):");
  console.log("  superadmin@shs.local          / SuperAdmin@123");
  console.log("  admin@SCH00001.local           / SchoolAdmin@123");
  console.log("  teacher@SCH00001.local         / Teacher@123");
  console.log("  clerk@SCH00001.local           / Clerk@123");
  console.log("  ca@SCH00001.local              / CA@12345");
  console.log("  (replace SCH00001 with SCH00002..SCH00XXX for other schools)");
  console.log("═══════════════════════════════════════════════════════\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
