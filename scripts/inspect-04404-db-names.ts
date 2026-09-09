import { prisma } from "../src/lib/db";

const SCHOOL_ID = "cmsn9zkn900001wl63ilg2d87";
const classes = [
  { standard: "6", section: "B" },
  { standard: "7", section: "A" },
  { standard: "7", section: "B" },
  { standard: "8", section: "B" },
];

async function main() {
  for (const c of classes) {
    const students = await prisma.student.findMany({
      where: {
        schoolId: SCHOOL_ID,
        standard: c.standard,
        section: c.section,
        status: { not: "archived" },
      },
      select: {
        firstName: true,
        middleName: true,
        surname: true,
        aadhaarName: true,
        fatherName: true,
        motherName: true,
        fatherNameGu: true,
        aadhaarNameGu: true,
        grNumber: true,
        aadhaarNumber: true,
      },
      orderBy: { grNumber: "asc" },
      take: 5,
    });
    const total = await prisma.student.count({
      where: {
        schoolId: SCHOOL_ID,
        standard: c.standard,
        section: c.section,
        status: { not: "archived" },
      },
    });
    const all = await prisma.student.findMany({
      where: {
        schoolId: SCHOOL_ID,
        standard: c.standard,
        section: c.section,
        status: { not: "archived" },
      },
      select: { fatherName: true, aadhaarName: true, middleName: true },
    });
    const emptyFather = all.filter(
      (s) => !s.fatherName?.trim() || s.fatherName === "—" || s.fatherName === "-",
    ).length;
    const emptyAadhaar = all.filter(
      (s) => !s.aadhaarName?.trim() || s.aadhaarName === "—",
    ).length;
    const emptyMiddle = all.filter((s) => !s.middleName?.trim()).length;
    console.log(
      `\n=== ${c.standard}-${c.section} total=${total} emptyFather=${emptyFather} emptyAadhaarName=${emptyAadhaar} emptyMiddle=${emptyMiddle} ===`,
    );
    console.log(JSON.stringify(students, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
