import { prisma } from "../src/lib/db";

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("already exists")) console.log("SKIP:", sql.slice(0, 50));
    else console.warn("WARN:", msg.slice(0, 120));
  }
}

async function main() {
  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`generalregisterentry\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`studentId\` VARCHAR(191) NULL,
      \`academicYear\` VARCHAR(191) NOT NULL,
      \`grNumber\` VARCHAR(191) NOT NULL,
      \`surname\` VARCHAR(191) NOT NULL DEFAULT '',
      \`firstName\` VARCHAR(191) NOT NULL DEFAULT '',
      \`fatherName\` VARCHAR(191) NOT NULL DEFAULT '',
      \`motherName\` VARCHAR(191) NOT NULL DEFAULT '',
      \`religionCaste\` VARCHAR(191) NOT NULL DEFAULT '',
      \`birthPlaceJson\` TEXT NOT NULL,
      \`dateOfBirth\` VARCHAR(191) NOT NULL DEFAULT '',
      \`dobWordsGu\` VARCHAR(191) NOT NULL DEFAULT '',
      \`childUidDigits\` VARCHAR(191) NOT NULL DEFAULT '',
      \`lastSchool\` VARCHAR(191) NOT NULL DEFAULT '',
      \`udiseDigits\` VARCHAR(191) NOT NULL DEFAULT '',
      \`admissionDate\` VARCHAR(191) NOT NULL DEFAULT '',
      \`feeStatus\` VARCHAR(191) NOT NULL DEFAULT '',
      \`standard\` VARCHAR(191) NOT NULL DEFAULT '',
      \`section\` VARCHAR(191) NOT NULL DEFAULT '',
      \`progress\` VARCHAR(191) NOT NULL DEFAULT '',
      \`conduct\` VARCHAR(191) NOT NULL DEFAULT 'સારી',
      \`leavingDate\` VARCHAR(191) NOT NULL DEFAULT '',
      \`leavingStdClass\` VARCHAR(191) NOT NULL DEFAULT '',
      \`lcIssueDate\` VARCHAR(191) NOT NULL DEFAULT '',
      \`remarks\` TEXT NOT NULL,
      UNIQUE INDEX \`generalregisterentry_schoolId_academicYear_grNumber_key\`(\`schoolId\`, \`academicYear\`, \`grNumber\`),
      INDEX \`generalregisterentry_schoolId_academicYear_idx\`(\`schoolId\`, \`academicYear\`),
      INDEX \`generalregisterentry_studentId_idx\`(\`studentId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  console.log("General Register schema ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
