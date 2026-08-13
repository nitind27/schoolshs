/**
 * Seed classes + subjects + dummy students for school code 24261004404
 * (Sarvajanik Upper Primary School Songadh)
 *
 * Run: npx tsx scripts/seed-school-24261004404.ts
 */
import { prisma } from "../src/lib/db";
import { bilingualNamePair } from "../src/lib/gujarati/transliterate-core";

const SCHOOL_CODE = "24261004404";
const ACADEMIC_YEAR = "2025-26";
const STUDENTS_PER_CLASS = 12;

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
  ...["1", "2", "3", "4", "5"].flatMap((std) =>
    ["A"].map((sec) => ({ standard: std, section: sec, name: `Class ${std}-${sec}` })),
  ),
  ...["6", "7", "8"].flatMap((std) =>
    ["A", "B"].map((sec) => ({ standard: std, section: sec, name: `Class ${std}-${sec}` })),
  ),
];

const SUBJECTS_MASTER = [
  "Gujarati",
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "EVS",
  "Computer",
  "Drawing",
  "Physical Education",
];

function subjectsForStandard(std: string): string[] {
  const n = parseInt(std, 10);
  if (n <= 4) return ["Gujarati", "English", "Hindi", "Mathematics", "EVS", "Drawing"];
  if (n <= 5) return ["Gujarati", "English", "Hindi", "Mathematics", "Science", "Social Science", "Drawing"];
  return [
    "Gujarati",
    "English",
    "Hindi",
    "Mathematics",
    "Science",
    "Social Science",
    "Computer",
    "Drawing",
    "Physical Education",
  ];
}

function subjectCode(name: string) {
  return name.toUpperCase().replace(/\s+/g, "_").slice(0, 20);
}

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

function gu(en: string) {
  return bilingualNamePair(en).gu;
}

async function main() {
  console.log(`Seeding school ${SCHOOL_CODE}…\n`);

  try {
    const school = await prisma.school.findFirst({
      where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    });
    if (!school) {
      throw new Error(`School ${SCHOOL_CODE} not found. Create it in Super Admin first.`);
    }

    if (!school.udiseCode) {
      await prisma.school.update({
        where: { id: school.id },
        data: { udiseCode: SCHOOL_CODE },
      });
    }

    const schoolName = school.name;
    const district = school.district || "Tapi";
    const city = school.city || "Fort Songadh";
    const address = school.address || "Fort Songadh, Songadh, Tapi, Gujarat 394670";
    const pincode = school.pincode || "394670";
    console.log(`School: ${schoolName} (${school.code})`);

    const adminStaff = [
      {
        employeeId: "P404-EMP001",
        firstName: "Nitin",
        lastName: "Dube",
        designation: "Principal",
        department: "Administration",
        gender: "Male",
        mobile: "9712004404",
        email: "principal.404@songadh.local",
        salary: 38000,
      },
      {
        employeeId: "P404-EMP002",
        firstName: "Smita",
        lastName: "Patel",
        designation: "Clerk",
        department: "Office",
        gender: "Female",
        mobile: "9712004405",
        email: "clerk.404@songadh.local",
        salary: 16000,
      },
    ];

    for (const s of adminStaff) {
      await prisma.staff.upsert({
        where: { schoolId_employeeId: { schoolId: school.id, employeeId: s.employeeId } },
        create: {
          schoolId: school.id,
          employeeId: s.employeeId,
          firstName: s.firstName,
          lastName: s.lastName,
          firstNameGu: gu(s.firstName),
          lastNameGu: gu(s.lastName),
          designation: s.designation,
          department: s.department,
          mobileNumber: s.mobile,
          email: s.email,
          gender: s.gender,
          dateOfJoining: "01/06/2018",
          monthlySalary: s.salary,
          bankName: "STATE BANK OF INDIA",
          bankAccount: "401234567890",
          ifscCode: "SBIN0001234",
        },
        update: {
          isActive: true,
          firstName: s.firstName,
          lastName: s.lastName,
          firstNameGu: gu(s.firstName),
          lastNameGu: gu(s.lastName),
        },
      });
    }

    let teacherNum = 1;
    for (const cls of CLASS_DEFS) {
      const empId = `P404-T-${cls.standard}${cls.section}`;
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
          firstNameGu: gu(firstName),
          lastNameGu: gu(lastName),
          designation: "Teacher",
          department: `Std ${cls.standard}`,
          mobileNumber: `98${String(40000000 + tIdx).slice(-8)}`,
          email: `t.${cls.standard}${cls.section.toLowerCase()}@404.local`,
          gender: tIdx % 3 === 0 ? "Female" : "Male",
          dateOfJoining: "01/06/2019",
          monthlySalary: 24000 + (tIdx % 4) * 500,
          bankName: "STATE BANK OF INDIA",
          bankAccount: `404${String(tIdx).padStart(10, "0")}`,
          ifscCode: "SBIN0001234",
        },
        update: { isActive: true, firstNameGu: gu(firstName), lastNameGu: gu(lastName) },
      });

      await prisma.schoolClass.upsert({
        where: {
          schoolId_standard_section_stream_academicYear: {
            schoolId: school.id,
            standard: cls.standard,
            section: cls.section,
            stream: "",
            academicYear: ACADEMIC_YEAR,
          },
        },
        create: {
          schoolId: school.id,
          name: cls.name,
          standard: cls.standard,
          section: cls.section,
          stream: "",
          academicYear: ACADEMIC_YEAR,
          institutionName: schoolName,
          institutionDistrict: district,
          classTeacherId: staff.id,
        },
        update: {
          name: cls.name,
          classTeacherId: staff.id,
          institutionName: schoolName,
        },
      });
    }

    console.log("  ✓ Classes + class teachers");

    const subjectIdsByCode = new Map<string, string>();
    for (let si = 0; si < SUBJECTS_MASTER.length; si++) {
      const name = SUBJECTS_MASTER[si];
      const code = subjectCode(name);
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
        update: { isActive: true, name, sortOrder: si },
      });
      subjectIdsByCode.set(code, subj.id);
    }

    const standards = [...new Set(CLASS_DEFS.map((c) => c.standard))];
    for (const std of standards) {
      const names = subjectsForStandard(std);
      const subjectIds = names
        .map((n) => subjectIdsByCode.get(subjectCode(n)))
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

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: school.id, academicYear: ACADEMIC_YEAR },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
    });

    for (const cls of classes) {
      const names = subjectsForStandard(cls.standard);
      await prisma.classSubject.deleteMany({ where: { classId: cls.id } });
      await prisma.classSubject.createMany({
        data: names.map((name, i) => ({
          classId: cls.id,
          name,
          code: subjectCode(name),
          shortName: name.slice(0, 3).toUpperCase(),
          type: "numeric",
          maxMarks: 100,
          sortOrder: i,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  ✓ Subjects (${SUBJECTS_MASTER.length} master) assigned to all classes`);

    let grCounter = 404001;
    let aadhaarCounter = 404000000001;
    let created = 0;
    let updated = 0;
    let synced = 0;

    for (const cls of classes) {
      for (let roll = 1; roll <= STUDENTS_PER_CLASS; roll++) {
        const idx = created + updated + roll;
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
        const aadhaarName = `${firstName} ${fatherName} ${surname}`;
        const fullName = aadhaarName;
        const childUid = `${SCHOOL_CODE}${String(100000 + idx).slice(-6)}`;
        const apaarId = String(804000000000 + (idx % 900000000000)).slice(0, 12);

        const data = {
          schoolId: school.id,
          classId: cls.id,
          firstName,
          middleName: fatherName,
          surname,
          firstNameGu: gu(firstName),
          middleNameGu: gu(fatherName),
          surnameGu: gu(surname),
          aadhaarName,
          aadhaarNameGu: gu(aadhaarName),
          dateOfBirth: dobForStandard(cls.standard, idx),
          gender: isFemale ? "Female" : "Male",
          aadhaarNumber,
          rationCardNumber: `RC404${String(idx).padStart(6, "0")}`,
          mobileNumber: `97${String(50000000 + idx).slice(-8)}`,
          motherName,
          fatherName,
          motherNameGu: gu(motherName),
          fatherNameGu: gu(fatherName),
          guardianName: fatherName,
          guardianNameGu: gu(fatherName),
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
          childUid,
          apaarId,
          bloodGroup: (["A+", "B+", "O+", "AB+"] as const)[idx % 4],
          idCardValidUpto: "03/2027",
          currentAddress: address,
          currentDistrict: district,
          currentCity: city,
          currentPincode: pincode,
          permanentAddress: address,
          permanentDistrict: district,
          permanentCity: city,
          permanentPincode: pincode,
          habitationType: "Own",
          familySize: 4 + (idx % 3),
          residentType: "Rural",
          isHosteler: false,
          scholarshipScheme: "None",
          financialYear: ACADEMIC_YEAR,
          courseType: "Primary",
          courseName: `Class ${cls.standard}`,
          institutionDistrict: district,
          institutionName: schoolName,
          currentYear: "1st Year",
          admissionType: "Regular",
          startDate: "15/06/2025",
          board10th: "GSEB",
          percentage10th: 0,
          year10th: "",
          bankName: "STATE BANK OF INDIA",
          branchName: "SONGADH",
          accountNumber: `404${String(idx).padStart(10, "0")}`,
          ifscCode: "SBIN0001234",
          accountHolderName: fullName,
          status: "ready",
          admissionStatus: "verified",
          notes: `Dummy · ${SCHOOL_CODE} · ${cls.name}`,
        };

        const existing = await prisma.student.findUnique({
          where: {
            schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber },
          },
          select: { id: true },
        });

        const student = await prisma.student.upsert({
          where: {
            schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber },
          },
          create: data,
          update: data,
        });

        const existingGr = await prisma.generalRegisterEntry.findFirst({
          where: { schoolId: school.id, academicYear: ACADEMIC_YEAR, grNumber },
        });
        const grData = {
          studentId: student.id,
          grNumber,
          surname,
          firstName,
          fatherName,
          motherName,
          religionCaste: `${data.religion} / ${casteInfo.caste}`,
          dateOfBirth: data.dateOfBirth,
          childUidDigits: childUid,
          standard: cls.standard,
          section: cls.section,
          admissionDate: data.startDate,
        };
        if (existingGr) {
          await prisma.generalRegisterEntry.update({
            where: { id: existingGr.id },
            data: grData,
          });
        } else {
          await prisma.generalRegisterEntry.create({
            data: {
              schoolId: school.id,
              academicYear: ACADEMIC_YEAR,
              ...grData,
            },
          });
        }
        synced++;

        if (existing) updated++;
        else created++;
      }
      process.stdout.write(`  ✓ ${cls.name} — ${STUDENTS_PER_CLASS} students\n`);
    }

    const totals = await prisma.school.findUnique({
      where: { id: school.id },
      select: {
        _count: {
          select: {
            students: true,
            classes: true,
            staff: true,
            schoolSubjects: true,
          },
        },
      },
    });

    console.log("\n═══════════════════════════════════════");
    console.log(`School:   ${schoolName}`);
    console.log(`Code:     ${SCHOOL_CODE}`);
    console.log(`Classes:  ${totals?._count.classes}`);
    console.log(`Staff:    ${totals?._count.staff}`);
    console.log(`Subjects: ${totals?._count.schoolSubjects}`);
    console.log(`Students: ${totals?._count.students} (created ${created}, updated ${updated})`);
    console.log(`GR sync:  ${synced}`);
    console.log(`Year:     ${ACADEMIC_YEAR}`);
    console.log("═══════════════════════════════════════\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
