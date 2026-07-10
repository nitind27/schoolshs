/**
 * Production-safe: creates idcardsharelink table if missing.
 * Run on VPS:  npm run db:migrate-share-link
 * Or:          npx tsx scripts/migrate-idcard-share-link.ts
 */
import { loadEnv } from "../src/lib/load-env";
import { prisma } from "../src/lib/db";

loadEnv();

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`idcardsharelink\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NOT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`username\` VARCHAR(191) NOT NULL,
  \`passwordHash\` VARCHAR(500) NOT NULL,
  \`label\` VARCHAR(191) NULL,
  \`classId\` VARCHAR(191) NULL,
  \`standard\` VARCHAR(191) NULL,
  \`section\` VARCHAR(191) NULL,
  \`academicYear\` VARCHAR(191) NOT NULL DEFAULT '2025-26',
  \`expiresAt\` DATETIME(3) NULL,
  \`isActive\` BOOLEAN NOT NULL DEFAULT true,
  \`lastAccessAt\` DATETIME(3) NULL,
  \`accessCount\` INT NOT NULL DEFAULT 0,
  \`createdById\` VARCHAR(191) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idcardsharelink_slug_key\` (\`slug\`),
  KEY \`idcardsharelink_schoolId_idx\` (\`schoolId\`),
  CONSTRAINT \`idcardsharelink_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function main() {
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'idcardsharelink'`
  );
  const exists = Number(rows[0]?.cnt ?? 0) > 0;

  if (exists) {
    console.log("✓ Table idcardsharelink already exists — nothing to do.");
    return;
  }

  console.log("Creating table idcardsharelink...");
  await prisma.$executeRawUnsafe(CREATE_SQL);
  console.log("✓ Table idcardsharelink created successfully.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
