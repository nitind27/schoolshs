import { prisma } from "../src/lib/db";

const cols = [
  "ALTER TABLE `student` ADD COLUMN `sscSeatPrefix` VARCHAR(191) NULL DEFAULT 'A'",
  "ALTER TABLE `student` ADD COLUMN `sscSeatNumber` VARCHAR(191) NULL",
  "ALTER TABLE `student` ADD COLUMN `hscSeatPrefix` VARCHAR(191) NULL",
  "ALTER TABLE `student` ADD COLUMN `hscSeatNumber` VARCHAR(191) NULL",
  "ALTER TABLE `student` ADD COLUMN `gsebFetchedAt` DATETIME(3) NULL",
  "ALTER TABLE `student` ADD COLUMN `gsebResultJson` TEXT NULL",
];

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 55));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate column")) console.log("SKIP:", sql.slice(0, 55));
    else console.warn("WARN:", msg.slice(0, 100));
  }
}

async function main() {
  for (const sql of cols) await safeExec(sql);
  console.log("GSEB seat columns ready.");
}

main().finally(() => prisma.$disconnect());
