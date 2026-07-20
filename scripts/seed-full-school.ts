/**
 * Run: npm run db:seed-full
 * Uses standalone DB connection (stop dev server if pool timeout on remote MySQL).
 */
import { createPrismaClient } from "../src/lib/prisma-factory";
import { seedFullSchool } from "../src/lib/seed-full-school";

async function main() {
  const prisma = createPrismaClient();
  console.log("Seeding full school data (classes + staff + students)...\n");
  try {
    const result = await seedFullSchool(prisma);
    console.log("\n═══════════════════════════════════════");
    console.log(`School: ${result.schoolName} (${result.schoolCode})`);
    console.log(`✓ Classes: ${result.classes} (each with class teacher)`);
    console.log(`✓ Staff: ${result.staff}`);
    console.log(`✓ Students: ${result.students} (${result.studentsPerClass} per class)`);
    console.log("\nLogins:");
    console.log("  admin@songadh.local / SchoolAdmin@123");
    console.log("  teacher@songadh.local / Teacher@123");
    console.log("  clerk@songadh.local / Clerk@123");
    console.log("═══════════════════════════════════════\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
