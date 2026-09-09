import { prisma } from "../src/lib/db";

async function main() {
  const school = await prisma.school.findFirst({ where: { code: "24261004404" } });
  if (!school) return;

  // Undo bad middleName = "NA"
  const bad = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      OR: [{ middleName: "NA" }, { fatherName: "NA" }],
      status: { not: "archived" },
    },
    select: { id: true, grNumber: true, firstName: true, middleName: true, fatherName: true },
  });
  console.log("bad NA rows", bad.length, JSON.stringify(bad, null, 2));

  for (const s of bad) {
    await prisma.student.update({
      where: { id: s.id },
      data: {
        middleName: s.middleName === "NA" ? null : s.middleName,
        fatherName: s.fatherName === "NA" ? "—" : s.fatherName,
        middleNameGu: s.middleName === "NA" ? null : undefined,
        fatherNameGu: s.fatherName === "NA" ? null : undefined,
      },
    });
    console.log("cleaned", s.grNumber, s.firstName);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
