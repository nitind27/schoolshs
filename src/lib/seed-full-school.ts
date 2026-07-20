/**
 * Full school dummy data — all classes, class teachers, students (field-complete)
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth";
import {
  getRecommendedSectionsForStandard,
  SENIOR_STREAMS,
  standardToCourseName,
  standardToCurrentYear,
} from "@/lib/constants";

const ACADEMIC_YEAR = "2025-26";
const STUDENTS_PER_CLASS = 18;

type StudentSeed = Prisma.StudentUncheckedCreateInput;

const GUJ_SURNAMES = [
  "PATEL", "SHAH", "MEHTA", "DESAI", "PARMAR", "RATHOD", "THAKOR", "CHAUHAN",
  "VAGHELA", "SOLANKI", "BARIYA", "VASAVA", "GAMIT", "TADVI", "VALA",
];
const MALE_NAMES = [
  "ARJUN", "REHAN", "MIT", "HARSH", "KRUNAL", "YASH", "DIPAK", "VIRAL",
  "NIRAV", "KETAN", "JAY", "RAHUL", "SANJAY", "MAYUR", "HARDIK", "BHAVIN", "CHIRAG", "DEV",
];
const FEMALE_NAMES = [
  "KAVYA", "DIYA", "PRIYA", "NISHA", "HETAL", "KOMAL", "REKHA", "MEERA",
  "JINAL", "BHUMI", "KINJAL", "PARUL", "HEENA", "ASHA", "MANISHA", "NEHA", "RUPA", "SITA",
];
const FATHER_NAMES = [
  "RAMESH", "SURESH", "MAHESH", "NARESH", "DINESH", "PRAKASH", "ASHOK", "RAJESH",
  "MAHENDRA", "BHUPENDRA", "JAGDISH", "GHANSHYAM", "KANTILAL", "HASMUKH", "BHARAT",
];
const MOTHER_NAMES = [
  "KOKILA", "MANJULA", "SARLA", "KAMLA", "GEETA", "ASHA", "LATA", "USHA",
  "REKHA", "NIRMALA", "JAYSHREE", "BHAVNA", "DAXA", "HANSABEN", "KIRAN",
];
const CASTE_POOL: { category: string; caste: string }[] = [
  { category: "Open", caste: "General" },
  { category: "Open", caste: "OPEN" },
  { category: "SC", caste: "SC" },
  { category: "ST", caste: "ST" },
  { category: "OBC", caste: "BAXI" },
  { category: "OBC", caste: "OBC" },
  { category: "SEBC", caste: "SEBC" },
];

const SEAT_PREFIXES = ["A", "B", "C", "G", "S", "P"];

type ClassDef = {
  standard: string;
  section: string;
  stream: string;
  name: string;
};

function buildClassDefs(): ClassDef[] {
  const out: ClassDef[] = [];
  for (const std of ["6", "7", "8", "9", "10"]) {
    for (const sec of getRecommendedSectionsForStandard(std)) {
      out.push({
        standard: std,
        section: sec,
        stream: "",
        name: `Class ${std}-${sec}`,
      });
    }
  }
  for (const std of ["12"]) {
    for (const stream of SENIOR_STREAMS) {
      for (const sec of getRecommendedSectionsForStandard(std)) {
        out.push({
          standard: std,
          section: sec,
          stream,
          name: `Class ${std} ${stream}-${sec}`,
        });
      }
    }
  }
  return out;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dobForStandard(std: string, idx: number): string {
  const year = std === "12" ? 2007 + (idx % 2) : std === "10" ? 2009 + (idx % 2) : 2018 - parseInt(std, 10);
  const month = (idx % 12) + 1;
  const day = (idx % 28) + 1;
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function studentBase(
  schoolId: string,
  schoolName: string,
  overrides: Partial<StudentSeed> &
    Pick<StudentSeed, "aadhaarNumber" | "firstName" | "surname" | "aadhaarName">
): StudentSeed {
  const fullName = overrides.aadhaarName;
  return {
    schoolId,
    dateOfBirth: "01/06/2012",
    gender: "Male",
    rationCardNumber: "RC394670",
    mobileNumber: "9876543210",
    motherName: "MOTHER",
    fatherName: "FATHER",
    category: "Open",
    caste: "General",
    religion: "Hindu",
    maritalStatus: "Unmarried",
    parentOccupation: "Farmer",
    isOrphan: false,
    annualFamilyIncome: 72000,
    currentAddress: "Fort Songadh, Tapi, Gujarat - 394670",
    currentDistrict: "Tapi",
    currentCity: "Songadh",
    currentPincode: "394670",
    permanentAddress: "Fort Songadh, Tapi, Gujarat - 394670",
    permanentDistrict: "Tapi",
    permanentCity: "Songadh",
    permanentPincode: "394670",
    habitationType: "Own",
    familySize: 5,
    residentType: "Rural",
    isHosteler: false,
    scholarshipScheme: "MYSY Scholarship",
    financialYear: ACADEMIC_YEAR,
    courseType: "Secondary",
    courseName: "Class 7",
    institutionDistrict: "Tapi",
    institutionName: schoolName,
    currentYear: "1st Year",
    admissionType: "Regular",
    board10th: "GSEB",
    percentage10th: 0,
    year10th: "",
    bankName: "BANK OF BARODA",
    branchName: "SONGADH",
    accountNumber: "02670100000001",
    ifscCode: "BARB0FORTSO",
    accountHolderName: fullName,
    status: "ready",
    admissionStatus: "verified",
    bloodGroup: "B+",
    ...overrides,
  };
}

function boardSubjectsJson(standard: "10" | "12", stream: string, pct: number) {
  const subjects10: Record<string, number> = {
    GUJ: 0, ENG: 0, HIN: 0, MATH: 0, SCI: 0, SS: 0, SAN: 0,
  };
  const subjects12Comm: Record<string, number> = {
    GUJ: 0, ENG: 0, ECO: 0, BOM: 0, STAT: 0, ACC: 0, SP: 0,
  };
  const subjects12Arts: Record<string, number> = {
    GUJ: 0, ENG: 0, HIN: 0, HIS: 0, GEO: 0, ECO: 0, PSY: 0,
  };
  const base = standard === "10" ? subjects10 : stream === "Commerce" ? subjects12Comm : subjects12Arts;
  const keys = Object.keys(base);
  let remaining = Math.round((pct / 100) * keys.length * 100);
  const out: Record<string, number> = {};
  for (let i = 0; i < keys.length; i++) {
    const max = 100;
    const min = i === keys.length - 1 ? Math.max(35, remaining) : 35;
    const val = i === keys.length - 1 ? Math.min(max, remaining) : Math.min(max, min + (i * 7) % 40);
    out[keys[i]] = val;
    remaining -= val;
  }
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  return JSON.stringify({
    subjects: out,
    totalMarks: total,
    rankScore: pct,
    grade: pct >= 80 ? "A1" : pct >= 70 ? "A2" : pct >= 60 ? "B1" : pct >= 50 ? "B2" : "C",
    result: pct >= 35 ? "પાસ" : "નાપાસ",
  });
}

export type SeedFullSchoolResult = {
  schoolCode: string;
  schoolName: string;
  classes: number;
  staff: number;
  students: number;
  studentsPerClass: number;
};

export async function seedFullSchool(prisma: PrismaClient): Promise<SeedFullSchoolResult> {
  const school = await prisma.school.findFirst({
    where: { code: "SONGADH001" },
  }) ?? await prisma.school.findFirst({ orderBy: { createdAt: "asc" } });

  if (!school) {
    throw new Error("No school found. Run npm run db:seed first to create base school.");
  }

  const schoolName = school.name;

  const adminStaff = [
    { employeeId: "EMP001", firstName: "Rajesh", lastName: "Patel", designation: "Principal", department: "Administration", gender: "Male", mobile: "9711111101", email: "principal@songadh.local", salary: 45000 },
    { employeeId: "EMP002", firstName: "Priya", lastName: "Shah", designation: "Vice Principal", department: "Administration", gender: "Female", mobile: "9711111102", email: "vp@songadh.local", salary: 42000 },
    { employeeId: "EMP003", firstName: "Suresh", lastName: "Clerk", designation: "Clerk", department: "Office", gender: "Male", mobile: "9711111103", email: "clerk@songadh.local", salary: 18000 },
    { employeeId: "EMP004", firstName: "Kiran", lastName: "Mehta", designation: "Accountant", department: "Office", gender: "Male", mobile: "9711111104", email: "accountant@songadh.local", salary: 22000 },
    { employeeId: "EMP005", firstName: "Ramesh", lastName: "Desai", designation: "Peon", department: "Support", gender: "Male", mobile: "9711111105", email: null, salary: 12000 },
  ];

  for (const s of adminStaff) {
    await prisma.staff.upsert({
      where: { schoolId_employeeId: { schoolId: school.id, employeeId: s.employeeId } },
      create: {
        schoolId: school.id,
        employeeId: s.employeeId,
        firstName: s.firstName,
        lastName: s.lastName,
        designation: s.designation,
        department: s.department,
        mobileNumber: s.mobile,
        email: s.email,
        gender: s.gender,
        dateOfJoining: "01/06/2015",
        monthlySalary: s.salary,
        bankName: "BANK OF BARODA",
        bankAccount: "02670100000101",
        ifscCode: "BARB0FORTSO",
      },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        designation: s.designation,
        isActive: true,
      },
    });
  }

  const classDefs = buildClassDefs();
  const teacherStaffIds: string[] = [];
  let teacherNum = 10;

  for (const cls of classDefs) {
    const empId = `EMP-CT-${cls.standard}${cls.stream ? cls.stream.slice(0, 3).toUpperCase() : ""}${cls.section}`;
    const tIdx = teacherNum++;
    const firstName = MALE_NAMES[tIdx % MALE_NAMES.length];
    const lastName = GUJ_SURNAMES[tIdx % GUJ_SURNAMES.length];

    const staff = await prisma.staff.upsert({
      where: { schoolId_employeeId: { schoolId: school.id, employeeId: empId } },
      create: {
        schoolId: school.id,
        employeeId: empId,
        firstName,
        lastName,
        designation: "Teacher",
        department: cls.standard === "12" ? cls.stream : `Std ${cls.standard}`,
        mobileNumber: `98${String(10000000 + tIdx).slice(-8)}`,
        email: `teacher.${cls.standard.toLowerCase()}${cls.stream ? `.${cls.stream.toLowerCase()}` : ""}.${cls.section.toLowerCase()}@songadh.local`,
        gender: tIdx % 3 === 0 ? "Female" : "Male",
        dateOfJoining: "01/06/2018",
        monthlySalary: 28000 + (tIdx % 5) * 1000,
        bankName: "BANK OF BARODA",
        bankAccount: `02670100${String(tIdx).padStart(6, "0")}`,
        ifscCode: "BARB0FORTSO",
      },
      update: { isActive: true },
    });
    teacherStaffIds.push(staff.id);

    await prisma.schoolClass.upsert({
      where: {
        schoolId_standard_section_stream_academicYear: {
          schoolId: school.id,
          standard: cls.standard,
          section: cls.section,
          stream: cls.stream,
          academicYear: ACADEMIC_YEAR,
        },
      },
      create: {
        schoolId: school.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: cls.stream,
        academicYear: ACADEMIC_YEAR,
        institutionName: schoolName,
        institutionDistrict: "Tapi",
        classTeacherId: staff.id,
      },
      update: {
        name: cls.name,
        classTeacherId: staff.id,
        institutionName: schoolName,
      },
    });
  }

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: school.id, academicYear: ACADEMIC_YEAR },
    orderBy: [{ standard: "asc" }, { stream: "asc" }, { section: "asc" }],
  });

  let grCounter = 16001;
  let aadhaarCounter = 900000000001;
  const allStudentRows: StudentSeed[] = [];

  for (const cls of classes) {
    const isBoard10 = cls.standard === "10";
    const isBoard12 = cls.standard === "12";
    const courseType = isBoard12 ? "Higher Secondary" : "Secondary";

    for (let roll = 1; roll <= STUDENTS_PER_CLASS; roll++) {
      const idx = allStudentRows.length + roll;
      const isFemale = roll % 3 === 0;
      const firstName = (isFemale ? FEMALE_NAMES : MALE_NAMES)[(idx + roll) % (isFemale ? FEMALE_NAMES.length : MALE_NAMES.length)];
      const surname = GUJ_SURNAMES[(idx * 3 + roll) % GUJ_SURNAMES.length];
      const fatherName = FATHER_NAMES[(idx + roll) % FATHER_NAMES.length];
      const motherName = MOTHER_NAMES[(idx + roll) % MOTHER_NAMES.length];
      const casteInfo = CASTE_POOL[(idx + roll) % CASTE_POOL.length];
      const aadhaarNumber = String(aadhaarCounter++);
      const grNumber = String(grCounter++);
      const fullName = `${firstName} ${fatherName} ${surname}`.replace(/\s+/g, " ").trim();
      const aadhaarName = `${firstName} ${surname}`;

      const pct = isBoard10 || isBoard12
        ? Math.round((45 + ((idx * 17 + roll * 11) % 50)) * 100) / 100
        : 0;

      const seatIdx = idx + roll;
      const seatPrefix = SEAT_PREFIXES[seatIdx % SEAT_PREFIXES.length];
      const seatNumber = String(4000000 + seatIdx).slice(-7);

      const data = studentBase(school.id, schoolName, {
        classId: cls.id,
        firstName,
        middleName: fatherName,
        surname,
        fatherName,
        motherName,
        aadhaarName,
        aadhaarNumber,
        gender: isFemale ? "Female" : "Male",
        dateOfBirth: dobForStandard(cls.standard, idx),
        rollNumber: String(roll),
        grNumber,
        section: cls.section,
        standard: cls.standard,
        category: casteInfo.category,
        caste: casteInfo.caste,
        mobileNumber: `98${String(20000000 + idx).slice(-8)}`,
        accountNumber: `02670100${String(idx).padStart(6, "0")}`,
        accountHolderName: aadhaarName,
        courseType,
        courseName: standardToCourseName(cls.standard) + (cls.stream ? ` (${cls.stream})` : ""),
        currentYear: standardToCurrentYear(cls.standard),
        childUid: String(240000000000000000 + idx).slice(0, 18),
        ...(isBoard10
          ? {
              board10th: "GSEB",
              percentage10th: pct,
              year10th: "2025",
              sscSeatPrefix: seatPrefix,
              sscSeatNumber: seatNumber,
              gsebResultJson: boardSubjectsJson("10", "", pct),
            }
          : {}),
        ...(isBoard12
          ? {
              board10th: "GSEB",
              percentage10th: 55 + (idx % 35),
              year10th: "2023",
              board12th: "GSEB",
              percentage12th: pct,
              year12th: "2025",
              hscSeatPrefix: seatPrefix,
              hscSeatNumber: seatNumber,
              gsebResultJson: boardSubjectsJson("12", cls.stream || "Arts", pct),
            }
          : {}),
        notes: `Dummy · ${cls.name}`,
      });

      allStudentRows.push(data);
    }
    process.stdout.write(`  · ${cls.name} — ${STUDENTS_PER_CLASS} students prepared\n`);
  }

  const aadhaarList = allStudentRows.map((s) => s.aadhaarNumber);
  await prisma.student.deleteMany({
    where: { schoolId: school.id, aadhaarNumber: { in: aadhaarList } },
  });

  const BATCH = 25;
  for (let i = 0; i < allStudentRows.length; i += BATCH) {
    await prisma.student.createMany({
      data: allStudentRows.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    process.stdout.write(`  ${Math.min(i + BATCH, allStudentRows.length)}/${allStudentRows.length}\n`);
  }

  const class7A = classes.find((c) => c.standard === "7" && c.section === "A" && !c.stream);
  const teacherLoginStaff =
    (await prisma.staff.findFirst({
      where: { schoolId: school.id, employeeId: "EMP002" },
    })) ||
    (class7A
      ? await prisma.staff.findFirst({
          where: { schoolId: school.id, classes: { some: { id: class7A.id } } },
        })
      : null);

  if (teacherLoginStaff) {
    await prisma.user.upsert({
      where: { email: "teacher@songadh.local" },
      create: {
        email: "teacher@songadh.local",
        passwordHash: hashPassword("Teacher@123"),
        name: `${teacherLoginStaff.firstName} ${teacherLoginStaff.lastName} (Teacher)`,
        role: "teacher",
        schoolId: school.id,
        staffId: teacherLoginStaff.id,
      },
      update: {
        staffId: teacherLoginStaff.id,
        name: `${teacherLoginStaff.firstName} ${teacherLoginStaff.lastName} (Teacher)`,
        role: "teacher",
        schoolId: school.id,
      },
    });
  }

  const clerkStaff = await prisma.staff.findFirst({
    where: { schoolId: school.id, employeeId: "EMP003" },
  });
  if (clerkStaff) {
    await prisma.user.upsert({
      where: { email: "clerk@songadh.local" },
      create: {
        email: "clerk@songadh.local",
        passwordHash: hashPassword("Clerk@123"),
        name: "Suresh Clerk",
        role: "clerk",
        schoolId: school.id,
        staffId: clerkStaff.id,
      },
      update: { staffId: clerkStaff.id, role: "clerk" },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@songadh.local" },
    create: {
      email: "admin@songadh.local",
      passwordHash: hashPassword("SchoolAdmin@123"),
      name: "Songadh School Admin",
      role: "school_admin",
      schoolId: school.id,
    },
    update: { schoolId: school.id },
  });

  const staffCount = await prisma.staff.count({ where: { schoolId: school.id } });
  const classCount = await prisma.schoolClass.count({ where: { schoolId: school.id, academicYear: ACADEMIC_YEAR } });
  const studentCount = await prisma.student.count({ where: { schoolId: school.id } });

  return {
    schoolCode: school.code,
    schoolName: school.name,
    classes: classCount,
    staff: staffCount,
    students: studentCount,
    studentsPerClass: STUDENTS_PER_CLASS,
  };
}
