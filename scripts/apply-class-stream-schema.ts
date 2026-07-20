import { prisma } from "../src/lib/db";

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 70));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 70));
    } else {
      console.warn("WARN:", msg.slice(0, 120));
    }
  }
}

async function main() {
  await safeExec(
    "ALTER TABLE `schoolclass` ADD COLUMN `stream` VARCHAR(191) NOT NULL DEFAULT ''"
  );

  await safeExec(
    "UPDATE `schoolclass` SET `stream` = 'Arts' WHERE (`standard` = '11' OR `standard` = '12') AND `name` LIKE '%Arts%'"
  );
  await safeExec(
    "UPDATE `schoolclass` SET `stream` = 'Commerce' WHERE (`standard` = '11' OR `standard` = '12') AND `name` LIKE '%Commerce%'"
  );
  await safeExec(
    "UPDATE `schoolclass` SET `stream` = 'Science' WHERE (`standard` = '11' OR `standard` = '12') AND `name` LIKE '%Science%'"
  );

  await safeExec(
    "ALTER TABLE `schoolclass` DROP INDEX `schoolclass_schoolId_standard_section_academicYear_key`"
  );
  await safeExec(
    "CREATE UNIQUE INDEX `schoolclass_schoolId_standard_section_stream_academicYear_key` ON `schoolclass`(`schoolId`, `standard`, `section`, `stream`, `academicYear`)"
  );

  console.log("Class stream column ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
