import { prisma } from "../src/lib/db";

const staffCols = [
  "ALTER TABLE `staff` ADD COLUMN `monthlySalary` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `hra` DOUBLE NULL DEFAULT 0",
  "ALTER TABLE `staff` ADD COLUMN `conveyance` DOUBLE NULL DEFAULT 0",
  "ALTER TABLE `staff` ADD COLUMN `pfDeduction` DOUBLE NULL DEFAULT 0",
  "ALTER TABLE `staff` ADD COLUMN `bankName` VARCHAR(191) NULL",
  "ALTER TABLE `staff` ADD COLUMN `bankAccount` VARCHAR(191) NULL",
  "ALTER TABLE `staff` ADD COLUMN `ifscCode` VARCHAR(191) NULL",
];

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate")) console.log("SKIP:", sql.slice(0, 50));
    else console.warn("WARN:", msg.slice(0, 120));
  }
}

async function main() {
  for (const sql of staffCols) await safeExec(sql);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`staffattendancemonth\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`staffId\` VARCHAR(191) NOT NULL,
      \`month\` INT NOT NULL,
      \`year\` INT NOT NULL,
      \`daysJson\` TEXT NOT NULL,
      \`presentDays\` INT NOT NULL DEFAULT 0,
      \`absentDays\` INT NOT NULL DEFAULT 0,
      \`leaveDays\` INT NOT NULL DEFAULT 0,
      \`halfDays\` INT NOT NULL DEFAULT 0,
      \`note\` VARCHAR(191) NULL,
      UNIQUE INDEX \`staffattendancemonth_staffId_month_year_key\`(\`staffId\`, \`month\`, \`year\`),
      INDEX \`staffattendancemonth_schoolId_month_year_idx\`(\`schoolId\`, \`month\`, \`year\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`staffpayroll\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`staffId\` VARCHAR(191) NOT NULL,
      \`month\` INT NOT NULL,
      \`year\` INT NOT NULL,
      \`workingDays\` INT NOT NULL DEFAULT 0,
      \`presentDays\` INT NOT NULL DEFAULT 0,
      \`absentDays\` INT NOT NULL DEFAULT 0,
      \`grossSalary\` DOUBLE NOT NULL DEFAULT 0,
      \`deductions\` DOUBLE NOT NULL DEFAULT 0,
      \`netSalary\` DOUBLE NOT NULL DEFAULT 0,
      \`paymentStatus\` VARCHAR(191) NOT NULL DEFAULT 'pending',
      \`paidAt\` DATETIME(3) NULL,
      \`note\` VARCHAR(191) NULL,
      UNIQUE INDEX \`staffpayroll_staffId_month_year_key\`(\`staffId\`, \`month\`, \`year\`),
      INDEX \`staffpayroll_schoolId_month_year_paymentStatus_idx\`(\`schoolId\`, \`month\`, \`year\`, \`paymentStatus\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  console.log("Staff HR schema ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
