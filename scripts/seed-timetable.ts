/**
 * Seed dummy school timetables (schedule config + class grids + release).
 * Run: npm run db:seed-timetable
 * Optional: SCHOOL_CODE=SONGADH001 npm run db:seed-timetable
 */
import { loadEnv } from "../src/lib/load-env";
import { prisma } from "../src/lib/db";
import { seedDummyTimetables } from "../src/lib/seed-timetable";

loadEnv();

async function main() {
  const schoolCode = process.env.SCHOOL_CODE?.trim() || undefined;
  console.log(
    schoolCode
      ? `Seeding dummy timetable for ${schoolCode}...\n`
      : "Seeding dummy timetables for all schools...\n"
  );

  const result = await seedDummyTimetables(prisma, { schoolCode });

  if (!result.schools) {
    console.log("No schools found. Run npm run db:seed first.");
    return;
  }

  console.log("\n✅ Timetable seed complete");
  console.log(`   Schools: ${result.schools}`);
  console.log(`   Classes: ${result.classes}`);
  console.log(`   Entries: ${result.entries}`);
  console.log(`   New teachers: ${result.teachersEnsured}`);
  console.log(`   Released: ${result.released}`);
  console.log("\nOpen: http://localhost:3000/timetable");
}

main()
  .catch((e) => {
    console.error("Timetable seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
