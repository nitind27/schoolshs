import { prisma } from "../src/lib/db";

async function main() {
  const school = await prisma.school.findFirst({ where: { code: "SONGADH001" }, select: { id: true, name: true } });
  console.log("School:", school);
  if (!school) return;

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: school.id },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
    include: {
      classTeacher: { select: { firstName: true, lastName: true } },
      _count: { select: { students: true } },
    },
  });
  console.log("Classes:", classes.length);
  for (const c of classes) {
    console.log(
      `${c.standard}-${c.section} | ${c.name} | students=${c._count.students} | teacher=${c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : "none"} | id=${c.id}`
    );
  }

  const staff = await prisma.staff.findMany({
    where: { schoolId: school.id },
    select: { id: true, firstName: true, lastName: true, designation: true },
  });
  console.log("\nStaff:", staff.length);
  for (const s of staff) console.log(`${s.designation}: ${s.firstName} ${s.lastName} (${s.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
