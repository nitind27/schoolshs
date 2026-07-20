import { prisma } from "../src/lib/db";

async function main() {
  const school = await prisma.school.findUnique({ where: { code: "SONGADH001" } });
  if (!school) {
    console.log("School not found");
    return;
  }

  const std10 = await prisma.student.findMany({
    where: { schoolId: school.id, standard: "10" },
    select: { id: true, firstName: true, surname: true, aadhaarNumber: true },
  });

  if (std10.length) {
    await prisma.student.deleteMany({ where: { id: { in: std10.map((s) => s.id) } } });
    console.log(`Removed ${std10.length} Class 10 students (dummy seed)`);
  }

  const remaining = await prisma.student.findMany({
    where: { schoolId: school.id },
    select: {
      firstName: true, surname: true, standard: true, section: true,
      grNumber: true, childUid: true, percentage10th: true, year10th: true,
    },
  });
  console.log(`\nRemaining real students: ${remaining.length}`);
  remaining.forEach((s) => {
    console.log(`  Std ${s.standard}-${s.section} | ${s.firstName} ${s.surname} | GR:${s.grNumber} | UID:${s.childUid} | 10th%:${s.percentage10th}`);
  });
}

main().finally(() => prisma.$disconnect());
