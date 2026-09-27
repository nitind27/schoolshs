import { prisma } from "../src/lib/db";

async function main() {
  const s = await prisma.school.findFirst({ where: { code: "24261004405" } });
  if (!s) {
    console.log("school missing");
    return;
  }
  const c = await prisma.schoolClass.findMany({
    where: { schoolId: s.id, standard: { in: ["11", "12"] } },
    orderBy: [{ standard: "asc" }, { section: "asc" }],
    select: {
      name: true,
      standard: true,
      section: true,
      stream: true,
      academicYear: true,
      _count: { select: { students: true } },
    },
  });
  console.log(JSON.stringify(c, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
