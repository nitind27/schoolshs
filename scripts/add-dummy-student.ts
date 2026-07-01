/** One-time script: add fully filled dummy student (REHAN - Songadh) */
import { prisma } from "../src/lib/db";

async function main() {
  const school = await prisma.school.findUnique({ where: { code: "SONGADH001" } });
  if (!school) {
    console.error("Run scripts/setup-multi-tenant.ts first");
    process.exit(1);
  }

  let class7A = await prisma.schoolClass.findFirst({
    where: { schoolId: school.id, standard: "7", section: "A", academicYear: "2025-26" },
  });

  if (!class7A) {
    const teacher = await prisma.staff.findFirst({ where: { schoolId: school.id, isActive: true } });
    class7A = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: "Class 7-A",
        standard: "7",
        section: "A",
        academicYear: "2025-26",
        institutionName: "Sarvjanik Upper Primary School Songadh",
        institutionDistrict: "Tapi",
        classTeacherId: teacher?.id ?? null,
      },
    });
    console.log("Created class:", class7A.name);
  }

  const data = {
    schoolId: school.id,
    firstName: "REHAN",
    middleName: "AKBAR",
    surname: "PATEL",
    aadhaarName: "REHAN AKBAR PATEL",
    dateOfBirth: "08/04/2014",
    gender: "Male",
    aadhaarNumber: "955688768898",
    rationCardNumber: "RC394670001",
    mobileNumber: "9712075792",
    email: "kumarshalasongadh1885@gmail.com",
    motherName: "FARIDABI",
    fatherName: "AKBAR",
    guardianName: "AKBAR",
    category: "Open",
    caste: "General",
    religion: "Muslim",
    maritalStatus: "Unmarried",
    parentOccupation: "Labour",
    isOrphan: false,
    annualFamilyIncome: 50000,
    classId: class7A.id,
    rollNumber: "1",
    grNumber: "6604",
    section: "A",
    standard: "7",
    childUid: "242610044011910032",
    bloodGroup: "B+",
    idCardValidUpto: "03/2026",
    currentAddress: "SHRIRAM NAGAR SONGADH, FORT-SONGHAD, SONGADH, Tapi, Gujarat",
    currentDistrict: "Tapi",
    currentCity: "Songadh",
    currentPincode: "394670",
    permanentAddress: "SHRIRAM NAGAR SONGADH, FORT-SONGHAD, SONGADH, Tapi, Gujarat",
    permanentDistrict: "Tapi",
    permanentCity: "Songadh",
    permanentPincode: "394670",
    habitationType: "Own",
    familySize: 4,
    residentType: "Urban",
    isHosteler: false,
    scholarshipScheme: "MYSY Scholarship",
    financialYear: "2025-26",
    courseType: "Secondary",
    courseName: "Class 7",
    institutionDistrict: "Tapi",
    institutionName: "Sarvjanik Upper Primary School Songadh",
    currentYear: "1st Year",
    admissionType: "Regular",
    startDate: "24/06/2025",
    board10th: "GSEB",
    percentage10th: 0,
    year10th: "2028",
    bankName: "BANK OF BARODA",
    branchName: "NAVAGAM, FORT SONGADH",
    accountNumber: "02670100027718",
    ifscCode: "BARB0FORTSO",
    accountHolderName: "REHAN AKBAR PATEL",
    status: "ready",
    notes: "Dummy student · SSG Songadh · BPL/AAY beneficiary",
  };

  const student = await prisma.student.upsert({
    where: {
      schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber: data.aadhaarNumber },
    },
    create: data,
    update: data,
  });

  console.log("✓ Dummy student saved:");
  console.log(`  ID: ${student.id}`);
  console.log(`  Name: ${student.firstName} ${student.surname}`);
  console.log(`  Class: ${student.standard}-${student.section} · Roll ${student.rollNumber}`);
  console.log(`  Category: ${student.category} · Aadhaar: ${student.aadhaarNumber}`);
  console.log(`  View: http://localhost:3000/students/${student.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
