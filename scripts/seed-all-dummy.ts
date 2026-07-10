/**
 * Full dummy data — all tables (School, User, Staff, Class, Student, SMS, Jobs, etc.)
 * Run: npm run db:seed
 */
import crypto from "crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

type StudentSeed = Prisma.StudentUncheckedCreateInput;
type StudentSeedRow = Omit<StudentSeed, "schoolId" | "aadhaarNumber"> & {
  schoolId: string;
  aadhaarNumber: string;
};

function studentBase(
  overrides: Partial<StudentSeed> &
    Pick<StudentSeed, "schoolId" | "aadhaarNumber" | "firstName" | "surname" | "aadhaarName">
): StudentSeedRow {
  return {
    dateOfBirth: "01/01/2010",
    gender: "Male",
    rationCardNumber: "RC001",
    mobileNumber: "9876543210",
    motherName: "MOTHER",
    fatherName: "FATHER",
    category: "Open",
    caste: "General",
    religion: "Hindu",
    maritalStatus: "Unmarried",
    parentOccupation: "Farmer",
    isOrphan: false,
    annualFamilyIncome: 60000,
    currentAddress: "Songadh, Tapi, Gujarat",
    currentDistrict: "Tapi",
    currentCity: "Songadh",
    currentPincode: "394670",
    permanentAddress: "Songadh, Tapi, Gujarat",
    permanentDistrict: "Tapi",
    permanentCity: "Songadh",
    permanentPincode: "394670",
    habitationType: "Own",
    familySize: 4,
    residentType: "Rural",
    isHosteler: false,
    scholarshipScheme: "MYSY Scholarship",
    financialYear: "2025-26",
    courseType: "Secondary",
    courseName: "Class 7",
    institutionDistrict: "Tapi",
    institutionName: "Sarvjanik Upper Primary School Songadh",
    currentYear: "1st Year",
    admissionType: "Regular",
    board10th: "GSEB",
    percentage10th: 0,
    year10th: "2028",
    bankName: "BANK OF BARODA",
    branchName: "SONGADH",
    accountNumber: "02670100000001",
    ifscCode: "BARB0FORTSO",
    accountHolderName: "STUDENT NAME",
    status: "ready",
    ...overrides,
  } as StudentSeedRow;
}

async function main() {
  console.log("Seeding all dummy data...\n");

  const school1 = await prisma.school.upsert({
    where: { code: "SONGADH001" },
    create: {
      name: "Sarvjanik Upper Primary School Songadh",
      code: "SONGADH001",
      district: "Tapi",
      address: "Fort Songadh, Tapi, Gujarat - 394670",
      phone: "9712075792",
      email: "school@songadh.local",
    },
    update: {},
  });

  const school2 = await prisma.school.upsert({
    where: { code: "VYARA002" },
    create: {
      name: "Municipal School Vyara",
      code: "VYARA002",
      district: "Tapi",
      address: "Vyara, Tapi, Gujarat",
      phone: "9876501234",
      email: "vyara@school.local",
    },
    update: {},
  });

  const smsToken1 = crypto.randomBytes(24).toString("hex");
  const smsToken2 = crypto.randomBytes(24).toString("hex");

  await prisma.schoolSettings.upsert({
    where: { schoolId: school1.id },
    create: {
      schoolId: school1.id,
      schoolName: school1.name,
      schoolAddress: school1.address,
      schoolPhone: school1.phone,
      schoolEmail: school1.email,
      tagline: "Education for All",
      dgSjedUsername: "9712075792",
      dgSjedPassword: "demo_password",
      dgCitizenLoginId: "9712075792",
      dgCitizenPassword: "demo_password",
      dgOtpMobile: "9712075792",
      smsInboxToken: smsToken1,
    },
    update: {},
  });

  await prisma.schoolSettings.upsert({
    where: { schoolId: school2.id },
    create: {
      schoolId: school2.id,
      schoolName: school2.name,
      schoolAddress: school2.address,
      schoolPhone: school2.phone,
      schoolEmail: school2.email,
      tagline: "Learn & Grow",
      dgSjedUsername: "9876501234",
      dgSjedPassword: "demo_password",
      dgOtpMobile: "9876501234",
      smsInboxToken: smsToken2,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "superadmin@shs.local" },
    create: {
      email: "superadmin@shs.local",
      passwordHash: hashPassword("SuperAdmin@123"),
      name: "Super Admin",
      role: "super_admin",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "admin@songadh.local" },
    create: {
      email: "admin@songadh.local",
      passwordHash: hashPassword("SchoolAdmin@123"),
      name: "Songadh School Admin",
      role: "school_admin",
      schoolId: school1.id,
    },
    update: { schoolId: school1.id },
  });

  await prisma.user.upsert({
    where: { email: "admin@vyara.local" },
    create: {
      email: "admin@vyara.local",
      passwordHash: hashPassword("SchoolAdmin@123"),
      name: "Vyara School Admin",
      role: "school_admin",
      schoolId: school2.id,
    },
    update: { schoolId: school2.id },
  });

  const staff1 = await prisma.staff.upsert({
    where: { schoolId_employeeId: { schoolId: school1.id, employeeId: "EMP001" } },
    create: {
      schoolId: school1.id,
      employeeId: "EMP001",
      firstName: "Rajesh",
      lastName: "Patel",
      designation: "Head Teacher",
      department: "Primary",
      mobileNumber: "9711111111",
      email: "rajesh@songadh.local",
      gender: "Male",
      dateOfJoining: "01/06/2015",
    },
    update: {},
  });

  const staff2 = await prisma.staff.upsert({
    where: { schoolId_employeeId: { schoolId: school1.id, employeeId: "EMP002" } },
    create: {
      schoolId: school1.id,
      employeeId: "EMP002",
      firstName: "Priya",
      lastName: "Shah",
      designation: "Class Teacher",
      department: "Primary",
      mobileNumber: "9722222222",
      email: "priya@songadh.local",
      gender: "Female",
      dateOfJoining: "01/06/2018",
    },
    update: {},
  });

  await prisma.staff.upsert({
    where: { schoolId_employeeId: { schoolId: school2.id, employeeId: "EMP101" } },
    create: {
      schoolId: school2.id,
      employeeId: "EMP101",
      firstName: "Amit",
      lastName: "Desai",
      designation: "Principal",
      mobileNumber: "9733333333",
      gender: "Male",
    },
    update: {},
  });

  const class7A = await prisma.schoolClass.upsert({
    where: {
      schoolId_standard_section_academicYear: {
        schoolId: school1.id,
        standard: "7",
        section: "A",
        academicYear: "2025-26",
      },
    },
    create: {
      schoolId: school1.id,
      name: "Class 7-A",
      standard: "7",
      section: "A",
      academicYear: "2025-26",
      institutionName: school1.name,
      institutionDistrict: "Tapi",
      classTeacherId: staff2.id,
    },
    update: { classTeacherId: staff2.id },
  });

  const class8B = await prisma.schoolClass.upsert({
    where: {
      schoolId_standard_section_academicYear: {
        schoolId: school1.id,
        standard: "8",
        section: "B",
        academicYear: "2025-26",
      },
    },
    create: {
      schoolId: school1.id,
      name: "Class 8-B",
      standard: "8",
      section: "B",
      academicYear: "2025-26",
      institutionName: school1.name,
      institutionDistrict: "Tapi",
      classTeacherId: staff1.id,
    },
    update: {},
  });

  const class6A = await prisma.schoolClass.upsert({
    where: {
      schoolId_standard_section_academicYear: {
        schoolId: school2.id,
        standard: "6",
        section: "A",
        academicYear: "2025-26",
      },
    },
    create: {
      schoolId: school2.id,
      name: "Class 6-A",
      standard: "6",
      section: "A",
      academicYear: "2025-26",
      institutionName: school2.name,
      institutionDistrict: "Tapi",
    },
    update: {},
  });

  const students = [
    studentBase({
      schoolId: school1.id,
      classId: class7A.id,
      firstName: "REHAN",
      middleName: "AKBAR",
      surname: "PATEL",
      aadhaarName: "REHAN AKBAR PATEL",
      aadhaarNumber: "955688768898",
      rollNumber: "1",
      grNumber: "6604",
      section: "A",
      standard: "7",
      accountHolderName: "REHAN AKBAR PATEL",
      notes: "Dummy · Songadh",
    }),
    studentBase({
      schoolId: school1.id,
      classId: class7A.id,
      firstName: "KAVYA",
      surname: "SHAH",
      aadhaarName: "KAVYA SHAH",
      aadhaarNumber: "123456789012",
      gender: "Female",
      rollNumber: "2",
      grNumber: "6605",
      section: "A",
      standard: "7",
      category: "SC",
      accountHolderName: "KAVYA SHAH",
    }),
    studentBase({
      schoolId: school1.id,
      classId: class8B.id,
      firstName: "ARJUN",
      surname: "MEHTA",
      aadhaarName: "ARJUN MEHTA",
      aadhaarNumber: "234567890123",
      rollNumber: "5",
      section: "B",
      standard: "8",
      accountHolderName: "ARJUN MEHTA",
      status: "submitted",
    }),
    studentBase({
      schoolId: school2.id,
      classId: class6A.id,
      firstName: "DIYA",
      surname: "PARMAR",
      aadhaarName: "DIYA PARMAR",
      aadhaarNumber: "345678901234",
      gender: "Female",
      rollNumber: "3",
      section: "A",
      standard: "6",
      institutionName: school2.name,
      accountHolderName: "DIYA PARMAR",
    }),
  ];

  const savedStudents: Prisma.StudentGetPayload<object>[] = [];
  for (const s of students) {
    const st = await prisma.student.upsert({
      where: {
        schoolId_aadhaarNumber: {
          schoolId: s.schoolId,
          aadhaarNumber: s.aadhaarNumber,
        },
      },
      create: s,
      update: s,
    });
    savedStudents.push(st);
  }

  await prisma.smsInboxMessage.deleteMany({
    where: { schoolId: school1.id, body: { contains: "DG OTP" } },
  });

  await prisma.smsInboxMessage.createMany({
    data: [
      {
        schoolId: school1.id,
        sender: "DG-GUJ",
        body: "Your DG OTP for login is 482916. Valid for 5 minutes.",
        otpCode: "482916",
        consumed: true,
      },
      {
        schoolId: school1.id,
        sender: "DG-GUJ",
        body: "Your DG OTP for login is 739204. Valid for 5 minutes.",
        otpCode: "739204",
        consumed: false,
      },
      {
        schoolId: school2.id,
        sender: "ADHAAR",
        body: "OTP 551203 for Aadhaar verification.",
        otpCode: "551203",
        consumed: false,
      },
    ],
  });

  const songadhStudentIds = savedStudents.filter((s) => s.schoolId === school1.id).map((s) => s.id);

  const existingBulk = await prisma.bulkSubmission.findFirst({
    where: { schoolId: school1.id, status: "completed" },
  });
  if (!existingBulk) {
    await prisma.bulkSubmission.create({
      data: {
        schoolId: school1.id,
        totalCount: songadhStudentIds.length,
        successCount: songadhStudentIds.length,
        failedCount: 0,
        status: "completed",
        studentIds: JSON.stringify(songadhStudentIds),
        results: JSON.stringify({ message: "Dummy bulk submit OK" }),
      },
    });
  }

  const existingJob = await prisma.automationJob.findFirst({
    where: { schoolId: school1.id, status: "completed" },
  });
  if (!existingJob) {
    await prisma.automationJob.create({
      data: {
        schoolId: school1.id,
        status: "completed",
        mode: "auto",
        actionMode: "auto",
        portalType: "sjed",
        studentIds: JSON.stringify([savedStudents[0].id]),
        totalCount: 1,
        completedCount: 1,
        currentStep: "Done",
        logs: "[Dummy] SJED login OK → form filled → submitted\n",
        studentProgress: JSON.stringify([
          {
            studentId: savedStudents[0].id,
            name: "REHAN PATEL",
            status: "submitted",
            step: "Submitted on DG",
            percent: 100,
          },
        ]),
        startedAt: new Date(Date.now() - 3600000),
        finishedAt: new Date(),
      },
    });
  }

  const existingPendingJob = await prisma.automationJob.findFirst({
    where: { schoolId: school1.id, status: "pending" },
  });
  if (!existingPendingJob) {
    await prisma.automationJob.create({
      data: {
        schoolId: school1.id,
        status: "pending",
        mode: "auto",
        portalType: "sjed",
        studentIds: JSON.stringify(songadhStudentIds.slice(1)),
        totalCount: songadhStudentIds.length - 1,
        currentStep: "Queued",
        logs: "Dummy job — waiting to start\n",
        studentProgress: JSON.stringify(
          songadhStudentIds.slice(1).map((id, i) => ({
            studentId: id,
            status: "pending",
            step: "Queued",
            percent: 0,
            name: `Student ${i + 2}`,
          }))
        ),
      },
    });
  }

  const clerkStaff = await prisma.staff.upsert({
    where: { schoolId_employeeId: { schoolId: school1.id, employeeId: "EMP003" } },
    create: {
      schoolId: school1.id,
      employeeId: "EMP003",
      firstName: "Suresh",
      lastName: "Clerk",
      designation: "Clerk",
      department: "Office",
      mobileNumber: "9744444444",
      email: "clerk@songadh.local",
      gender: "Male",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "teacher@songadh.local" },
    create: {
      email: "teacher@songadh.local",
      passwordHash: hashPassword("Teacher@123"),
      name: "Priya Shah (Teacher)",
      role: "teacher",
      schoolId: school1.id,
      staffId: staff2.id,
    },
    update: { staffId: staff2.id, role: "teacher" },
  });

  await prisma.user.upsert({
    where: { email: "clerk@songadh.local" },
    create: {
      email: "clerk@songadh.local",
      passwordHash: hashPassword("Clerk@123"),
      name: "Suresh Clerk",
      role: "clerk",
      schoolId: school1.id,
      staffId: clerkStaff.id,
    },
    update: { staffId: clerkStaff.id, role: "clerk" },
  });

  const caUser = await prisma.user.upsert({
    where: { email: "ca@songadh.local" },
    create: {
      email: "ca@songadh.local",
      passwordHash: hashPassword("CA@12345"),
      name: "CA Audit Firm",
      role: "ca",
      schoolId: school1.id,
    },
    update: { role: "ca" },
  });

  for (const [school, isPrimary] of [[school1, true], [school2, false]] as const) {
    await prisma.caSchoolAssignment.upsert({
      where: { userId_schoolId: { userId: caUser.id, schoolId: school.id } },
      create: { userId: caUser.id, schoolId: school.id, isPrimary },
      update: { isPrimary },
    });
  }

  const firstStudent = savedStudents[0];
  await prisma.user.upsert({
    where: { email: "student@songadh.local" },
    create: {
      email: "student@songadh.local",
      passwordHash: hashPassword("Student@123"),
      name: `${firstStudent.firstName} ${firstStudent.surname}`,
      role: "student",
      schoolId: school1.id,
      studentId: firstStudent.id,
    },
    update: { studentId: firstStudent.id, role: "student" },
  });

  await prisma.student.update({
    where: { id: firstStudent.id },
    data: { admissionStatus: "verified", email: "student@songadh.local" },
  });

  const fy = await prisma.financialYear.upsert({
    where: { schoolId_label: { schoolId: school1.id, label: "2025-26" } },
    create: {
      schoolId: school1.id,
      label: "2025-26",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
    },
    update: { isActive: true },
  });

  const { DEFAULT_ACCOUNTS } = await import("../src/lib/accounting");
  const existingAccounts = await prisma.account.count({ where: { financialYearId: fy.id } });
  if (existingAccounts === 0) {
    await prisma.account.createMany({
      data: DEFAULT_ACCOUNTS.map((a) => ({
        schoolId: school1.id,
        financialYearId: fy.id,
        code: a.code,
        name: a.name,
        groupType: a.groupType,
        accountType: a.accountType,
        balanceType: a.balanceType,
      })),
    });
  }

  console.log("✓ Schools: 2");
  console.log("✓ Users:");
  console.log("   superadmin@shs.local / SuperAdmin@123  (Super Admin)");
  console.log("   admin@songadh.local / SchoolAdmin@123  (School Admin)");
  console.log("   teacher@songadh.local / Teacher@123      (Teacher)");
  console.log("   clerk@songadh.local / Clerk@123        (Clerk)");
  console.log("   ca@songadh.local / CA@12345            (CA Portal)");
  console.log("   student@songadh.local / Student@123    (Student Portal)");
  console.log(`✓ Staff: 4 | Classes: 3 | Students: ${savedStudents.length}`);
  console.log("✓ Financial Year 2025-26 + Chart of Accounts");
  console.log("✓ SMS messages, BulkSubmission, AutomationJobs");
  console.log("\nDone — http://localhost:3000/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
