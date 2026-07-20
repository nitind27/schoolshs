import { prisma } from "../src/lib/db";

async function main() {
  const cols = await prisma.$queryRawUnsafe<{ Field: string }[]>(
    "SHOW COLUMNS FROM staff"
  );
  const names = cols.map((c) => c.Field);
  console.log("Staff columns:", names.join(", "));
  console.log("monthlySalary exists:", names.includes("monthlySalary"));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
