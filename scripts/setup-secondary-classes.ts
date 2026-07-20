/**
 * Setup Class 9–12 structure for SONGADH001:
 * - 9, 10: A B C D E
 * - 11, 12 Arts: A B C D E
 * - 11, 12 Commerce: A only
 * Removes existing Class 9–12 (no students) and recreates.
 */
import { prisma } from "../src/lib/db";
import { getSecondaryClassSeeds } from "../src/lib/class-structure";

const ACADEMIC_YEAR = "2025-26";

async function main() {
  const school = await prisma.school.findUnique({ where: { code: "SONGADH001" } });
  if (!school) {
    console.error("School SONGADH001 not found");
    process.exit(1);
  }

  const toRemove = await prisma.schoolClass.findMany({
    where: {
      schoolId: school.id,
      academicYear: ACADEMIC_YEAR,
      standard: { in: ["9", "10", "11", "12"] },
    },
    include: { _count: { select: { students: true } } },
  });

  for (const cls of toRemove) {
    if (cls._count.students > 0) {
      console.warn(`SKIP delete ${cls.name} — has ${cls._count.students} students`);
      continue;
    }
    await prisma.schoolClass.delete({ where: { id: cls.id } });
    console.log("Deleted:", cls.name);
  }

  const scienceClasses = await prisma.schoolClass.findMany({
    where: { schoolId: school.id, stream: "Science" },
    include: { _count: { select: { students: true } } },
  });
  for (const cls of scienceClasses) {
    if (cls._count.students > 0) continue;
    await prisma.schoolClass.delete({ where: { id: cls.id } });
    console.log("Removed Science:", cls.name);
  }

  const seeds = getSecondaryClassSeeds();
  let created = 0;

  for (const seed of seeds) {
    const existing = await prisma.schoolClass.findFirst({
      where: {
        schoolId: school.id,
        standard: seed.standard,
        section: seed.section,
        stream: seed.stream,
        academicYear: ACADEMIC_YEAR,
      },
    });
    if (existing) {
      console.log("Exists:", seed.name);
      continue;
    }

    await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: seed.name,
        standard: seed.standard,
        section: seed.section,
        stream: seed.stream,
        academicYear: ACADEMIC_YEAR,
        institutionName: school.name,
        institutionDistrict: school.district || "Tapi",
        classTeacherId: null,
      },
    });
    console.log("Created:", seed.name);
    created++;
  }

  const total = await prisma.schoolClass.count({
    where: { schoolId: school.id, standard: { in: ["9", "10", "11", "12"] } },
  });
  console.log(`\nDone. Created ${created} classes. Total 9–12 classes: ${total}`);
  console.log("Admin: Classes page → assign class teacher to each division.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
