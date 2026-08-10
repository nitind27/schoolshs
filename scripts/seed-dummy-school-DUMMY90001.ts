/**
 * Create a fresh DEMO school with full dummy data + login accounts.
 *
 * School code: DUMMY90001
 * Run: npx tsx scripts/seed-dummy-school-DUMMY90001.ts
 */
import crypto from "crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { SCHOOL_FEATURE_KEYS } from "../src/lib/school-features";
import {
  DEFAULT_ACCOUNTS,
  getFinancialYearDates,
  getVoucherPrefix,
} from "../src/lib/accounting";
import { seedDummyTimetables } from "../src/lib/seed-timetable";
import {
  STUDENT_TEMPORARY_PASSWORD,
  syncStudentPortalAccount,
} from "../src/lib/student-account";

const SCHOOL_CODE = "DUMMY90001";
const SCHOOL_NAME = "SHS Demo Primary School";
const ACADEMIC_YEAR = "2025-26";
const FY_LABEL = "2025-26";
const STUDENTS_PER_CLASS = 10;

const PASSWORDS = {
  admin: "DummyAdmin@123",
  clerk: "DummyClerk@123",
  teacher: "DummyTeacher@123",
  student: STUDENT_TEMPORARY_PASSWORD,
} as const;

const EMAILS = {
  admin: "admin@dummy90001.local",
  clerk: "clerk@dummy90001.local",
  teacher: "teacher@dummy90001.local",
} as const;

const GUJ_SURNAMES = [
  "PATEL", "SHAH", "PARMAR", "RATHOD", "CHAUHAN", "VASAVA", "GAMIT", "TADVI",
  "SOLANKI", "BARIYA", "DESAI", "MEHTA", "THAKOR", "VALA",
];
const MALE_NAMES = [
  "ARJUN", "HARSH", "YASH", "JAY", "RAHUL", "MAYUR", "DEV", "KRUNAL",
  "NIRAV", "BHAVIN", "CHIRAG", "MIT",
];
const FEMALE_NAMES = [
  "KAVYA", "DIYA", "PRIYA", "NISHA", "HETAL", "MEERA", "JINAL", "BHUMI",
  "KINJAL", "NEHA", "ASHA", "RUPA",
];
const FATHER_NAMES = [
  "RAMESH", "SURESH", "MAHESH", "DINESH", "PRAKASH", "ASHOK", "RAJESH", "BHARAT",
];
const MOTHER_NAMES = [
  "KOKILA", "MANJULA", "GEETA", "ASHA", "LATA", "REKHA", "BHAVNA", "KIRAN",
];
const CASTE_POOL = [
  { category: "Open", caste: "General" },
  { category: "ST", caste: "ST" },
  { category: "SC", caste: "SC" },
  { category: "OBC", caste: "OBC" },
  { category: "SEBC", caste: "SEBC" },
];

const CLASS_DEFS = [
  ...["1", "2", "3", "4", "5"].map((std) => ({
    standard: std,
    section: "A",
    name: `Class ${std}-A`,
  })),
  ...["6", "7", "8"].flatMap((std) =>
    ["A", "B"].map((sec) => ({
      standard: std,
      section: sec,
      name: `Class ${std}-${sec}`,
    })),
  ),
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dobForStandard(std: string, idx: number): string {
  const baseYear = 2025 - (parseInt(std, 10) + 5);
  const year = baseYear - (idx % 2);
  const month = (idx % 12) + 1;
  const day = (idx % 28) + 1;
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function d(iso: string) {
  return new Date(`${iso}T10:00:00.000Z`);
}

async function main() {
  console.log(`\n═══ Seeding demo school ${SCHOOL_CODE} ═══\n`);

  const school = await prisma.school.upsert({
    where: { code: SCHOOL_CODE },
    create: {
      name: SCHOOL_NAME,
      code: SCHOOL_CODE,
      udiseCode: SCHOOL_CODE,
      district: "Tapi",
      taluka: "Songadh",
      city: "Fort Songadh",
      pincode: "394670",
      address: "Demo Campus, Fort Songadh, Tapi, Gujarat - 394670",
      phone: "9712090001",
      email: "office@dummy90001.local",
      website: "https://demo.shs.local",
      principalName: "Demo Principal",
      schoolType: "Primary / Upper Primary",
      boardAffiliation: "Gujarat Board",
      isActive: true,
    },
    update: {
      name: SCHOOL_NAME,
      udiseCode: SCHOOL_CODE,
      isActive: true,
      principalName: "Demo Principal",
    },
  });

  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      schoolName: SCHOOL_NAME,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolEmail: school.email,
      tagline: "Demo school for testing",
      academicYear: ACADEMIC_YEAR,
      smsInboxToken: crypto.randomBytes(24).toString("hex"),
    },
    update: {
      schoolName: SCHOOL_NAME,
      schoolAddress: school.address,
      schoolPhone: school.phone,
      schoolEmail: school.email,
      academicYear: ACADEMIC_YEAR,
    },
  });

  await prisma.schoolSubscription.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      planName: "demo",
      paymentStatus: "paid",
      enabledFeatures: [...SCHOOL_FEATURE_KEYS],
      moduleFormats: {
        certificates: "default",
        id_cards: "default",
        results: "default",
        board_records: "default",
      },
    },
    update: {
      planName: "demo",
      paymentStatus: "paid",
      enabledFeatures: [...SCHOOL_FEATURE_KEYS],
    },
  });

  console.log(`School ready: ${school.name} (${school.code})`);

  // Wipe prior demo operational data for clean re-run
  const existingStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
    select: { id: true },
  });
  const existingStaff = await prisma.staff.findMany({
    where: { schoolId: school.id },
    select: { id: true },
  });
  const studentIds = existingStudents.map((s) => s.id);
  const staffIds = existingStaff.map((s) => s.id);

  if (studentIds.length || staffIds.length) {
    console.log("Clearing previous DUMMY90001 operational data…");
    const exams = await prisma.exam.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const examIds = exams.map((e) => e.id);
    const vouchers = await prisma.voucher.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const voucherIds = vouchers.map((v) => v.id);
    const activities = await prisma.activity.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const activityIds = activities.map((a) => a.id);
    const rooms = await prisma.chatRoom.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const roomIds = rooms.map((r) => r.id);
    const books = await prisma.dailyAttendanceBook.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const bookIds = books.map((b) => b.id);

    await prisma.$transaction(async (tx) => {
      if (examIds.length) {
        await tx.examResult.deleteMany({ where: { examId: { in: examIds } } });
        await tx.examSeatAssignment.deleteMany({ where: { schoolId: school.id } });
        await tx.examSubject.deleteMany({ where: { examId: { in: examIds } } });
        await tx.exam.deleteMany({ where: { schoolId: school.id } });
      }
      if (studentIds.length) {
        await tx.reportCard.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.studentAttendanceMonth.deleteMany({ where: { schoolId: school.id } });
        await tx.generalRegisterEntry.deleteMany({ where: { schoolId: school.id } });
        if (activityIds.length) {
          await tx.activityParticipant.deleteMany({ where: { activityId: { in: activityIds } } });
        }
      }
      if (activityIds.length) await tx.activity.deleteMany({ where: { schoolId: school.id } });
      if (bookIds.length) {
        await tx.dailyAttendanceBookRow.deleteMany({ where: { bookId: { in: bookIds } } });
        await tx.dailyAttendanceBook.deleteMany({ where: { schoolId: school.id } });
      }
      await tx.staffAttendanceMonth.deleteMany({ where: { schoolId: school.id } });
      await tx.staffPayroll.deleteMany({ where: { schoolId: school.id } });
      await tx.staffSalarySlipRow.deleteMany({ where: { schoolId: school.id } });
      await tx.staffIncomeTaxForm.deleteMany({ where: { schoolId: school.id } });
      await tx.salaryStatementRow.deleteMany({ where: { schoolId: school.id } });
      await tx.timetableEntry.deleteMany({ where: { schoolId: school.id } });
      await tx.classTimetableRelease.deleteMany({ where: { schoolId: school.id } });
      await tx.schoolTimetableConfig.deleteMany({ where: { schoolId: school.id } });
      await tx.standardSubject.deleteMany({ where: { schoolId: school.id } });
      await tx.schoolSubject.deleteMany({ where: { schoolId: school.id } });
      if (voucherIds.length) {
        await tx.voucherLine.deleteMany({ where: { voucherId: { in: voucherIds } } });
        await tx.voucher.deleteMany({ where: { schoolId: school.id } });
      }
      await tx.account.deleteMany({ where: { schoolId: school.id } });
      await tx.financialYear.deleteMany({ where: { schoolId: school.id } });
      if (roomIds.length) {
        await tx.chatAttachment.deleteMany({ where: { message: { roomId: { in: roomIds } } } });
        await tx.chatMessage.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.chatParticipant.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.chatRoom.deleteMany({ where: { schoolId: school.id } });
      }
      await tx.holiday.deleteMany({ where: { schoolId: school.id } });
      await tx.smsInboxMessage.deleteMany({ where: { schoolId: school.id } });
      await tx.notification.deleteMany({ where: { schoolId: school.id } });
      await tx.bulkSubmission.deleteMany({ where: { schoolId: school.id } });
      await tx.automationJob.deleteMany({ where: { schoolId: school.id } });
      await tx.idCardShareLink.deleteMany({ where: { schoolId: school.id } });
      await tx.helpConversation.deleteMany({ where: { schoolId: school.id } });

      const nonAdmin = await tx.user.findMany({
        where: { schoolId: school.id, role: { not: "school_admin" } },
        select: { id: true },
      });
      const nonAdminIds = nonAdmin.map((u) => u.id);
      if (studentIds.length) {
        await tx.user.updateMany({
          where: { studentId: { in: studentIds } },
          data: { studentId: null },
        });
      }
      if (staffIds.length) {
        await tx.user.updateMany({
          where: { staffId: { in: staffIds } },
          data: { staffId: null },
        });
      }
      if (nonAdminIds.length) {
        await tx.userSession.deleteMany({ where: { userId: { in: nonAdminIds } } });
        await tx.loginEvent.deleteMany({ where: { userId: { in: nonAdminIds } } });
        await tx.user.deleteMany({ where: { id: { in: nonAdminIds } } });
      }
      if (studentIds.length) await tx.student.deleteMany({ where: { schoolId: school.id } });
      if (staffIds.length) await tx.staff.deleteMany({ where: { schoolId: school.id } });
      await tx.schoolClass.deleteMany({ where: { schoolId: school.id } });
    }, { timeout: 120_000 });
  }

  // ── Office staff ──
  const officeStaff = [
    {
      employeeId: "D9-EMP001",
      firstName: "Demo",
      lastName: "Principal",
      designation: "Principal",
      department: "Administration",
      gender: "Male",
      mobile: "9712090001",
      email: "principal@dummy90001.local",
      salary: 42000,
    },
    {
      employeeId: "D9-EMP002",
      firstName: "Smita",
      lastName: "Clerk",
      designation: "Clerk",
      department: "Office",
      gender: "Female",
      mobile: "9712090002",
      email: EMAILS.clerk,
      salary: 18000,
    },
    {
      employeeId: "D9-EMP003",
      firstName: "Kiran",
      lastName: "Accountant",
      designation: "Accountant",
      department: "Office",
      gender: "Male",
      mobile: "9712090003",
      email: "accountant@dummy90001.local",
      salary: 22000,
    },
    {
      employeeId: "D9-EMP004",
      firstName: "Ramesh",
      lastName: "Peon",
      designation: "Peon",
      department: "Support",
      gender: "Male",
      mobile: "9712090004",
      email: null as string | null,
      salary: 12000,
    },
  ];

  for (const s of officeStaff) {
    await prisma.staff.create({
      data: {
        schoolId: school.id,
        employeeId: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        designation: s.designation,
        department: s.department,
        mobileNumber: s.mobile,
        email: s.email,
        gender: s.gender,
        dateOfJoining: "01/06/2019",
        monthlySalary: s.salary,
        bankName: "STATE BANK OF INDIA",
        bankAccount: `9001${s.employeeId.replace(/\D/g, "").padStart(10, "0")}`,
        ifscCode: "SBIN0009001",
        isActive: true,
      },
    });
  }

  // ── Classes + teachers ──
  let teacherNum = 1;
  for (const cls of CLASS_DEFS) {
    const empId = `D9-T-${cls.standard}${cls.section}`;
    const tIdx = teacherNum++;
    const firstName = MALE_NAMES[tIdx % MALE_NAMES.length];
    const lastName = GUJ_SURNAMES[tIdx % GUJ_SURNAMES.length];
    const isFemale = tIdx % 3 === 0;

    const staff = await prisma.staff.create({
      data: {
        schoolId: school.id,
        employeeId: empId,
        firstName: isFemale ? FEMALE_NAMES[tIdx % FEMALE_NAMES.length] : firstName,
        lastName,
        designation: "Teacher",
        department: `Std ${cls.standard}`,
        mobileNumber: `98${String(90010000 + tIdx).slice(-8)}`,
        email: `teacher.${cls.standard}${cls.section.toLowerCase()}@dummy90001.local`,
        gender: isFemale ? "Female" : "Male",
        dateOfJoining: "01/06/2020",
        monthlySalary: 25000 + (tIdx % 4) * 500,
        bankName: "STATE BANK OF INDIA",
        bankAccount: `9001${String(tIdx).padStart(10, "0")}`,
        ifscCode: "SBIN0009001",
        isActive: true,
      },
    });

    await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: "",
        academicYear: ACADEMIC_YEAR,
        institutionName: SCHOOL_NAME,
        institutionDistrict: "Tapi",
        classTeacherId: staff.id,
      },
    });
  }

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: school.id, academicYear: ACADEMIC_YEAR },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
  });

  // ── Students ──
  let grCounter = 900001;
  let aadhaarCounter = 900100000001;
  let createdStudents = 0;
  const demoStudentEmails: { studentId: string; email: string; name: string }[] = [];

  for (const cls of classes) {
    for (let roll = 1; roll <= STUDENTS_PER_CLASS; roll++) {
      const idx = createdStudents + 1;
      const isFemale = roll % 3 === 0;
      const firstName = (isFemale ? FEMALE_NAMES : MALE_NAMES)[
        (idx + roll) % (isFemale ? FEMALE_NAMES.length : MALE_NAMES.length)
      ];
      const surname = GUJ_SURNAMES[(idx * 3 + roll) % GUJ_SURNAMES.length];
      const fatherName = FATHER_NAMES[(idx + roll) % FATHER_NAMES.length];
      const motherName = MOTHER_NAMES[(idx + roll) % MOTHER_NAMES.length];
      const casteInfo = CASTE_POOL[(idx + roll) % CASTE_POOL.length];
      const aadhaarNumber = String(aadhaarCounter++);
      const grNumber = String(grCounter++);
      const aadhaarName = `${firstName} ${surname}`;
      const fullName = `${firstName} ${fatherName} ${surname}`;
      const email =
        cls.standard === "7" && cls.section === "A" && roll <= 3
          ? `student${roll}@dummy90001.local`
          : null;

      const student = await prisma.student.create({
        data: {
          schoolId: school.id,
          classId: cls.id,
          firstName,
          middleName: fatherName,
          surname,
          aadhaarName,
          dateOfBirth: dobForStandard(cls.standard, idx),
          gender: isFemale ? "Female" : "Male",
          aadhaarNumber,
          rationCardNumber: `RC9${String(idx).padStart(7, "0")}`,
          mobileNumber: `97${String(90010000 + idx).slice(-8)}`,
          email,
          motherName,
          fatherName,
          category: casteInfo.category,
          caste: casteInfo.caste,
          religion: "Hindu",
          maritalStatus: "Unmarried",
          parentOccupation: "Farmer",
          isOrphan: false,
          annualFamilyIncome: 60000 + (idx % 5) * 5000,
          rollNumber: String(roll),
          grNumber,
          section: cls.section,
          standard: cls.standard,
          childUid: `${SCHOOL_CODE}${String(100000 + idx).slice(-6)}`,
          apaarId: String(800000000000 + (idx % 900000000000)).slice(0, 12),
          bloodGroup: (["A+", "B+", "O+", "AB+"] as const)[idx % 4],
          currentAddress: school.address || "Fort Songadh, Tapi, Gujarat",
          currentDistrict: "Tapi",
          currentCity: "Fort Songadh",
          currentPincode: "394670",
          permanentAddress: school.address || "Fort Songadh, Tapi, Gujarat",
          permanentDistrict: "Tapi",
          permanentCity: "Fort Songadh",
          permanentPincode: "394670",
          habitationType: "Own",
          familySize: 4 + (idx % 3),
          residentType: "Rural",
          isHosteler: false,
          scholarshipScheme: "None",
          financialYear: ACADEMIC_YEAR,
          courseType: "Primary",
          courseName: `Class ${cls.standard}`,
          institutionDistrict: "Tapi",
          institutionName: SCHOOL_NAME,
          currentYear: "1st Year",
          admissionType: "Regular",
          startDate: "15/06/2025",
          board10th: "GSEB",
          percentage10th: 0,
          year10th: "",
          bankName: "STATE BANK OF INDIA",
          branchName: "SONGADH",
          accountNumber: `9001${String(idx).padStart(10, "0")}`,
          ifscCode: "SBIN0009001",
          accountHolderName: fullName,
          status: "ready",
          admissionStatus: "verified",
          notes: `Dummy · ${SCHOOL_CODE} · ${cls.name}`,
        },
      });

      createdStudents++;
      if (email) {
        demoStudentEmails.push({
          studentId: student.id,
          email,
          name: fullName,
        });
      }

      if (roll <= 2) {
        await prisma.generalRegisterEntry.create({
          data: {
            schoolId: school.id,
            studentId: student.id,
            academicYear: ACADEMIC_YEAR,
            grNumber,
            surname,
            firstName,
            fatherName,
            motherName,
            religionCaste: `${casteInfo.category} / ${casteInfo.caste}`,
            dateOfBirth: student.dateOfBirth,
            admissionDate: "15/06/2025",
            standard: cls.standard,
            section: cls.section,
            udiseDigits: SCHOOL_CODE,
            childUidDigits: student.childUid || "",
          },
        });
      }
    }
    process.stdout.write(`  ✓ ${cls.name} — ${STUDENTS_PER_CLASS} students\n`);
  }

  // Portal accounts for demo students
  for (const row of demoStudentEmails) {
    const student = await prisma.student.findUniqueOrThrow({ where: { id: row.studentId } });
    await syncStudentPortalAccount(student);
  }

  // ── Login users ──
  const clerkStaff = await prisma.staff.findFirstOrThrow({
    where: { schoolId: school.id, employeeId: "D9-EMP002" },
  });
  const teacherStaff = await prisma.staff.findFirstOrThrow({
    where: { schoolId: school.id, employeeId: "D9-T-7A" },
  });

  await prisma.user.upsert({
    where: { email: EMAILS.admin },
    create: {
      email: EMAILS.admin,
      passwordHash: hashPassword(PASSWORDS.admin),
      name: "Demo School Admin",
      role: "school_admin",
      schoolId: school.id,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mustChangePassword: false,
    },
    update: {
      passwordHash: hashPassword(PASSWORDS.admin),
      schoolId: school.id,
      role: "school_admin",
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: EMAILS.clerk },
    create: {
      email: EMAILS.clerk,
      passwordHash: hashPassword(PASSWORDS.clerk),
      name: "Smita Clerk",
      role: "clerk",
      schoolId: school.id,
      staffId: clerkStaff.id,
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    },
    update: {
      passwordHash: hashPassword(PASSWORDS.clerk),
      schoolId: school.id,
      staffId: clerkStaff.id,
      role: "clerk",
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: EMAILS.teacher },
    create: {
      email: EMAILS.teacher,
      passwordHash: hashPassword(PASSWORDS.teacher),
      name: `${teacherStaff.firstName} ${teacherStaff.lastName} (Teacher)`,
      role: "teacher",
      schoolId: school.id,
      staffId: teacherStaff.id,
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    },
    update: {
      passwordHash: hashPassword(PASSWORDS.teacher),
      schoolId: school.id,
      staffId: teacherStaff.id,
      role: "teacher",
      name: `${teacherStaff.firstName} ${teacherStaff.lastName} (Teacher)`,
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  // ── Holidays ──
  const holidays = [
    { date: "2025-08-15", name: "Independence Day", nameGu: "સ્વતંત્રતા દિવસ", type: "public" },
    { date: "2025-10-02", name: "Gandhi Jayanti", nameGu: "ગાંધી જયંતિ", type: "public" },
    { date: "2025-10-20", name: "Diwali Vacation Start", nameGu: "દિવાળી રજા", type: "school" },
    { date: "2026-01-26", name: "Republic Day", nameGu: "પ્રજાસત્તાક દિવસ", type: "public" },
    { date: "2026-03-14", name: "Holi", nameGu: "હોળી", type: "public" },
  ];
  for (const h of holidays) {
    await prisma.holiday.create({
      data: {
        schoolId: school.id,
        academicYear: ACADEMIC_YEAR,
        date: h.date,
        name: h.name,
        nameGu: h.nameGu,
        type: h.type,
      },
    });
  }

  // ── Accounting ──
  const fyDates = getFinancialYearDates(FY_LABEL);
  const fy = await prisma.financialYear.create({
    data: {
      schoolId: school.id,
      label: FY_LABEL,
      startDate: fyDates.startDate,
      endDate: fyDates.endDate,
      isActive: true,
      isLocked: false,
      auditStatus: "open",
    },
  });

  await prisma.account.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({
      schoolId: school.id,
      financialYearId: fy.id,
      code: a.code,
      name: a.name,
      groupType: a.groupType,
      accountType: a.accountType,
      balanceType: a.balanceType,
      openingBalance: a.code === "1001" ? 15000 : a.code === "1002" ? 250000 : 0,
      isActive: true,
    })),
  });

  const accounts = await prisma.account.findMany({
    where: { schoolId: school.id, financialYearId: fy.id },
  });
  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a]));

  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: EMAILS.admin } });

  async function createVoucher(opts: {
    type: "receipt" | "payment" | "journal" | "contra";
    date: string;
    narration: string;
    totalAmount: number;
    lines: { code: string; debit?: number; credit?: number; description?: string }[];
  }) {
    const seq = (await prisma.voucher.count({
      where: { schoolId: school.id, financialYearId: fy.id, voucherType: opts.type },
    })) + 1;
    const voucherNo = `${getVoucherPrefix(opts.type)}${String(seq).padStart(4, "0")}`;
    const voucher = await prisma.voucher.create({
      data: {
        schoolId: school.id,
        financialYearId: fy.id,
        voucherType: opts.type,
        voucherNo,
        voucherDate: d(opts.date),
        narration: opts.narration,
        totalAmount: opts.totalAmount,
        paymentMode: opts.type === "receipt" || opts.type === "payment" ? "Cash" : null,
        auditStatus: "verified",
        createdById: adminUser.id,
      },
    });
    await prisma.voucherLine.createMany({
      data: opts.lines.map((line) => ({
        voucherId: voucher.id,
        accountId: byCode[line.code].id,
        debit: line.debit || 0,
        credit: line.credit || 0,
        description: line.description || null,
      })),
    });
  }

  if (byCode["1001"] && byCode["5001"]) {
    await createVoucher({
      type: "receipt",
      date: "2025-07-05",
      narration: "Demo tuition fee collection",
      totalAmount: 50000,
      lines: [
        { code: "1001", debit: 50000, description: "Cash" },
        { code: "5001", credit: 50000, description: "Fee income" },
      ],
    });
  }
  if (byCode["1001"] && byCode["6003"]) {
    await createVoucher({
      type: "payment",
      date: "2025-07-12",
      narration: "Demo stationery purchase",
      totalAmount: 3500,
      lines: [
        { code: "6003", debit: 3500, description: "Stationery" },
        { code: "1001", credit: 3500, description: "Cash paid" },
      ],
    });
  }

  // ── Attendance sample (Class 7-A, current month) ──
  const class7A = classes.find((c) => c.standard === "7" && c.section === "A");
  if (class7A) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const students7 = await prisma.student.findMany({
      where: { schoolId: school.id, classId: class7A.id },
      select: { id: true, rollNumber: true },
    });
    const daysInMonth = new Date(year, month, 0).getDate();
    for (const st of students7) {
      const marks: Record<string, string> = {};
      let present = 0;
      for (let day = 1; day <= Math.min(daysInMonth, 15); day++) {
        const dow = new Date(year, month - 1, day).getDay();
        if (dow === 0) continue;
        const mark = day % 7 === 0 ? "A" : "P";
        marks[String(day)] = mark;
        if (mark === "P") present++;
      }
      await prisma.studentAttendanceMonth.create({
        data: {
          schoolId: school.id,
          studentId: st.id,
          classId: class7A.id,
          month,
          year,
          daysJson: JSON.stringify(marks),
          monthTotal: present,
          cumulative: present,
        },
      });
    }
  }

  // ── Staff payroll sample ──
  const allStaff = await prisma.staff.findMany({
    where: { schoolId: school.id, isActive: true },
    take: 8,
  });
  const payMonth = new Date().getMonth() + 1;
  const payYear = new Date().getFullYear();
  for (const s of allStaff) {
    const basic = Number(s.monthlySalary || 20000);
    const gross = Math.round(basic * 1.1);
    const deductions = 500;
    await prisma.staffPayroll.create({
      data: {
        schoolId: school.id,
        staffId: s.id,
        month: payMonth,
        year: payYear,
        workingDays: 26,
        presentDays: 25,
        absentDays: 1,
        grossSalary: gross,
        deductions,
        netSalary: gross - deductions,
        paymentStatus: "paid",
        paidAt: new Date(),
      },
    });
  }

  // ── Activity ──
  if (class7A) {
    const participants = await prisma.student.findMany({
      where: { classId: class7A.id },
      take: 5,
      select: { id: true },
    });
    const activity = await prisma.activity.create({
      data: {
        schoolId: school.id,
        academicYear: ACADEMIC_YEAR,
        title: "Demo Independence Day Celebration",
        type: "cultural",
        date: "2025-08-15",
        description: "School program with speeches and cultural items",
        released: true,
        releasedAt: new Date(),
      },
    });
    if (participants.length) {
      await prisma.activityParticipant.createMany({
        data: participants.map((p) => ({
          activityId: activity.id,
          studentId: p.id,
          classId: class7A.id,
        })),
      });
    }
  }

  // ── Exam + results (Class 7-A) ──
  if (class7A) {
    const exam = await prisma.exam.create({
      data: {
        schoolId: school.id,
        name: "First Terminal Exam 2025-26",
        examType: "terminal",
        academicYear: ACADEMIC_YEAR,
        standard: "7",
        examDate: d("2025-09-01"),
        maxMarks: 100,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    const subjects = ["Gujarati", "English", "Maths", "Science", "Social Science"];
    const examSubjects = [];
    for (const [i, name] of subjects.entries()) {
      examSubjects.push(
        await prisma.examSubject.create({
          data: {
            examId: exam.id,
            name,
            code: `SUB${i + 1}`,
            maxMarks: 100,
            sortOrder: i + 1,
          },
        }),
      );
    }
    const examStudents = await prisma.student.findMany({
      where: { classId: class7A.id },
      select: { id: true },
    });
    for (const [si, st] of examStudents.entries()) {
      for (const [subi, sub] of examSubjects.entries()) {
        const marks = 45 + ((si * 7 + subi * 11) % 50);
        await prisma.examResult.create({
          data: {
            examId: exam.id,
            subjectId: sub.id,
            studentId: st.id,
            marksObtained: marks,
            grade: marks >= 80 ? "A" : marks >= 60 ? "B" : marks >= 45 ? "C" : "D",
            isAbsent: false,
          },
        });
      }
    }
  }

  // ── Timetable ──
  console.log("\nSeeding timetable…");
  await seedDummyTimetables(prisma, { schoolCode: SCHOOL_CODE, academicYear: ACADEMIC_YEAR });

  // Re-link teacher login after timetable helper (in case staff shuffled)
  await prisma.user.update({
    where: { email: EMAILS.teacher },
    data: { staffId: teacherStaff.id },
  });

  const totals = await prisma.school.findUniqueOrThrow({
    where: { id: school.id },
    select: {
      _count: {
        select: {
          students: true,
          classes: true,
          staff: true,
          holidays: true,
          exams: true,
          vouchers: true,
          activities: true,
        },
      },
    },
  });

  console.log(`
══════════════════════════════════════════════════════
 DEMO SCHOOL READY
══════════════════════════════════════════════════════
 School     : ${SCHOOL_NAME}
 School Code: ${SCHOOL_CODE}
 Year       : ${ACADEMIC_YEAR}

 Counts
   Classes  : ${totals._count.classes}
   Staff    : ${totals._count.staff}
   Students : ${totals._count.students}
   Holidays : ${totals._count.holidays}
   Exams    : ${totals._count.exams}
   Vouchers : ${totals._count.vouchers}
   Activities: ${totals._count.activities}

 LOGIN (school code required: ${SCHOOL_CODE})
──────────────────────────────────────────────────────
 Admin   email: ${EMAILS.admin}
         pass : ${PASSWORDS.admin}

 Clerk   email: ${EMAILS.clerk}
         pass : ${PASSWORDS.clerk}

 Teacher email: ${EMAILS.teacher}
         pass : ${PASSWORDS.teacher}
         class: 7-A class teacher

 Student email: student1@dummy90001.local
                student2@dummy90001.local
                student3@dummy90001.local
         pass : ${PASSWORDS.student}
         note : first login may ask OTP / password change
══════════════════════════════════════════════════════
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
