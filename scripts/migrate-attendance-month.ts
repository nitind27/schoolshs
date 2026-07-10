/**
 * Production-safe: creates studentattendancemonth table if missing.
 * Run on VPS:  npm run db:migrate-attendance
 * Or:          npx tsx scripts/migrate-attendance-month.ts
 */
import { loadEnv } from "../src/lib/load-env";
import { prisma } from "../src/lib/db";

loadEnv();

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`studentattendancemonth\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NOT NULL,
  \`studentId\` VARCHAR(191) NOT NULL,
  \`classId\` VARCHAR(191) NULL,
  \`month\` INT NOT NULL,
  \`year\` INT NOT NULL,
  \`daysJson\` TEXT NOT NULL,
  \`monthTotal\` INT NOT NULL DEFAULT 0,
  \`prevTotal\` INT NOT NULL DEFAULT 0,
  \`cumulative\` INT NOT NULL DEFAULT 0,
  \`schoolFee\` VARCHAR(191) NULL,
  \`termFee\` VARCHAR(191) NULL,
  \`admissionFee\` VARCHAR(191) NULL,
  \`otherFee\` VARCHAR(191) NULL,
  \`note\` VARCHAR(191) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`studentattendancemonth_studentId_month_year_key\` (\`studentId\`, \`month\`, \`year\`),
  KEY \`studentattendancemonth_schoolId_classId_month_year_idx\` (\`schoolId\`, \`classId\`, \`month\`, \`year\`),
  CONSTRAINT \`studentattendancemonth_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`studentattendancemonth_studentId_fkey\` FOREIGN KEY (\`studentId\`) REFERENCES \`student\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function main() {
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'studentattendancemonth'`
  );
  const exists = Number(rows[0]?.cnt ?? 0) > 0;

  if (exists) {
    console.log("✓ Table studentattendancemonth already exists — nothing to do.");
    return;
  }

  console.log("Creating table studentattendancemonth...");
  await prisma.$executeRawUnsafe(CREATE_SQL);
  console.log("✓ Table studentattendancemonth created successfully.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
