import { prisma } from "../src/lib/db";
prisma.staff
  .findMany({ take: 1, select: { id: true, monthlySalary: true } })
  .then((r) => console.log("OK", r))
  .catch((e) => console.error("FAIL", e.message))
  .finally(() => prisma.$disconnect());
