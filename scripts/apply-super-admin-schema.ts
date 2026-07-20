/**
 * Apply super-admin v2 schema via raw SQL (when prisma db push fails).
 * Run: npx tsx scripts/apply-super-admin-schema.ts
 */
import { prisma } from "../src/lib/db";

const statements = [
  "ALTER TABLE `school` ADD COLUMN `taluka` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `city` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `pincode` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `alternatePhone` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `website` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `principalName` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `schoolType` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `boardAffiliation` VARCHAR(191) NULL",
  "ALTER TABLE `school` ADD COLUMN `udiseCode` VARCHAR(191) NULL",
];

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate column") || msg.includes("already exists")) {
      console.log("SKIP (exists):", sql.slice(0, 60));
    } else {
      console.warn("WARN:", msg.slice(0, 120));
    }
  }
}

async function main() {
  for (const sql of statements) await safeExec(sql);

  await safeExec("CREATE UNIQUE INDEX `school_udiseCode_key` ON `school`(`udiseCode`)");
  await safeExec("CREATE INDEX `school_district_idx` ON `school`(`district`)");

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`schoolsubscription\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`planName\` VARCHAR(191) NOT NULL DEFAULT 'standard',
      \`contractNumber\` VARCHAR(191) NULL,
      \`contractValue\` DECIMAL(12, 2) NULL,
      \`contractStartDate\` DATETIME(3) NULL,
      \`contractEndDate\` DATETIME(3) NULL,
      \`contractDocumentPath\` VARCHAR(191) NULL,
      \`contractNotes\` TEXT NULL,
      \`enabledFeatures\` JSON NOT NULL,
      \`paymentStatus\` VARCHAR(191) NOT NULL DEFAULT 'pending',
      \`totalAmount\` DECIMAL(12, 2) NULL,
      \`paidAmount\` DECIMAL(12, 2) NOT NULL DEFAULT 0,
      \`nextDueDate\` DATETIME(3) NULL,
      UNIQUE INDEX \`schoolsubscription_schoolId_key\`(\`schoolId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`schoolpayment\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`amount\` DECIMAL(12, 2) NOT NULL,
      \`paymentDate\` DATETIME(3) NOT NULL,
      \`paymentMethod\` VARCHAR(191) NULL,
      \`referenceNo\` VARCHAR(191) NULL,
      \`notes\` VARCHAR(191) NULL,
      \`receivedBy\` VARCHAR(191) NULL,
      INDEX \`schoolpayment_schoolId_idx\`(\`schoolId\`),
      INDEX \`schoolpayment_paymentDate_idx\`(\`paymentDate\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  console.log("Schema apply complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
