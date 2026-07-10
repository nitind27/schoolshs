import { prisma } from "../src/lib/db";

const alters = [
  "ALTER TABLE exam ADD COLUMN section VARCHAR(191) NULL",
  "ALTER TABLE exam ADD COLUMN reopeningDate VARCHAR(191) NULL",
  "ALTER TABLE examresult ADD COLUMN achievementMarks DOUBLE NOT NULL DEFAULT 0",
  "ALTER TABLE examresult ADD COLUMN graceMarks DOUBLE NOT NULL DEFAULT 0",
  "ALTER TABLE reportcard ADD COLUMN section VARCHAR(191) NULL",
  "ALTER TABLE reportcard ADD COLUMN passNumber VARCHAR(191) NULL",
  "ALTER TABLE reportcard ADD COLUMN attendancePresent INT NULL",
  "ALTER TABLE reportcard ADD COLUMN attendanceTotal INT NULL",
  "ALTER TABLE reportcard ADD COLUMN reopeningDate VARCHAR(191) NULL",
];

async function main() {
  for (const sql of alters) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("SKIP:", sql, "-", msg.slice(0, 100));
    }
  }
  await prisma.$disconnect();
}

main();
