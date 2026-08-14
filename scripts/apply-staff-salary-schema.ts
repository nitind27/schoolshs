import { prisma } from "../src/lib/db";

const staffCols = [
  "ALTER TABLE `staff` ADD COLUMN `retirementDate` VARCHAR(191) NULL",
  "ALTER TABLE `staff` ADD COLUMN `higherGradeFirst` VARCHAR(191) NULL",
  "ALTER TABLE `staff` ADD COLUMN `higherGradeFirstYears` INT NULL",
  "ALTER TABLE `staff` ADD COLUMN `higherGradeSecond` VARCHAR(191) NULL",
  "ALTER TABLE `staff` ADD COLUMN `higherGradeSecondYears` INT NULL",
  "ALTER TABLE `staff` ADD COLUMN `daPercent` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `hraPercent` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `da` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `ma` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `fpa` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `hndA` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `suA` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `caA` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `wa` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `prA` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `bonus` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `daArrears` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `salaryArrears` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `fullPay` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `professionalTax` DOUBLE NULL",
  "ALTER TABLE `staff` ADD COLUMN `incomeTax` DOUBLE NULL",
];

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 80));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 70));
    } else {
      console.warn("WARN:", msg.slice(0, 160));
    }
  }
}

async function main() {
  for (const sql of staffCols) await safeExec(sql);
  console.log("Staff salary / retirement / higher-grade columns ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
