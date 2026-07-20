/**
 * Creates timetable tables if missing + seeds default schedule per school.
 * Run: npx tsx scripts/migrate-timetable.ts
 */
import { loadEnv } from "../src/lib/load-env";
import { prisma } from "../src/lib/db";
import { defaultSchoolSchedule, serializeDaySchedules } from "../src/lib/timetable";

loadEnv();

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    name,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

const TIMETABLE_ENTRY_SQL = `
CREATE TABLE IF NOT EXISTS \`timetableentry\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NOT NULL,
  \`classId\` VARCHAR(191) NOT NULL,
  \`academicYear\` VARCHAR(191) NOT NULL DEFAULT '2025-26',
  \`dayOfWeek\` INT NOT NULL,
  \`periodIndex\` INT NOT NULL,
  \`subject\` VARCHAR(191) NOT NULL,
  \`teacherId\` VARCHAR(191) NULL,
  \`room\` VARCHAR(191) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`timetableentry_schoolId_classId_academicYear_dayOfWeek_periodIndex_key\` (\`schoolId\`, \`classId\`, \`academicYear\`, \`dayOfWeek\`, \`periodIndex\`),
  KEY \`timetableentry_schoolId_classId_academicYear_idx\` (\`schoolId\`, \`classId\`, \`academicYear\`),
  CONSTRAINT \`timetableentry_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`timetableentry_classId_fkey\` FOREIGN KEY (\`classId\`) REFERENCES \`schoolclass\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`timetableentry_teacherId_fkey\` FOREIGN KEY (\`teacherId\`) REFERENCES \`staff\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CONFIG_SQL = `
CREATE TABLE IF NOT EXISTS \`schooltimetableconfig\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NOT NULL,
  \`academicYear\` VARCHAR(191) NOT NULL DEFAULT '2025-26',
  \`daysJson\` TEXT NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`schooltimetableconfig_schoolId_academicYear_key\` (\`schoolId\`, \`academicYear\`),
  CONSTRAINT \`schooltimetableconfig_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const RELEASE_SQL = `
CREATE TABLE IF NOT EXISTS \`classtimetablerelease\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NOT NULL,
  \`classId\` VARCHAR(191) NOT NULL,
  \`academicYear\` VARCHAR(191) NOT NULL DEFAULT '2025-26',
  \`isReleased\` BOOLEAN NOT NULL DEFAULT false,
  \`releasedAt\` DATETIME(3) NULL,
  \`releasedBy\` VARCHAR(191) NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`classtimetablerelease_schoolId_classId_academicYear_key\` (\`schoolId\`, \`classId\`, \`academicYear\`),
  KEY \`classtimetablerelease_schoolId_academicYear_isReleased_idx\` (\`schoolId\`, \`academicYear\`, \`isReleased\`),
  CONSTRAINT \`classtimetablerelease_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`classtimetablerelease_classId_fkey\` FOREIGN KEY (\`classId\`) REFERENCES \`schoolclass\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function ensureTable(name: string, sql: string) {
  if (await tableExists(name)) {
    console.log(`✓ Table ${name} already exists`);
    return;
  }
  console.log(`Creating table ${name}...`);
  await prisma.$executeRawUnsafe(sql);
  console.log(`✓ Table ${name} created`);
}

async function seedDefaultConfigs() {
  const academicYear = "2025-26";
  const daysJson = serializeDaySchedules(defaultSchoolSchedule());
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });

  let inserted = 0;
  for (const school of schools) {
    const existing = await prisma.schoolTimetableConfig.findUnique({
      where: { schoolId_academicYear: { schoolId: school.id, academicYear } },
    });
    if (existing) continue;

    await prisma.schoolTimetableConfig.create({
      data: { schoolId: school.id, academicYear, daysJson },
    });
    inserted++;
    console.log(`  + Default schedule for: ${school.name}`);
  }

  if (inserted === 0) {
    console.log("✓ Default timetable config already exists for all schools");
  } else {
    console.log(`✓ Inserted default schedule for ${inserted} school(s)`);
  }
}

async function main() {
  console.log("Timetable migration — connecting to database...\n");

  await ensureTable("timetableentry", TIMETABLE_ENTRY_SQL);
  await ensureTable("schooltimetableconfig", CONFIG_SQL);
  await ensureTable("classtimetablerelease", RELEASE_SQL);

  console.log("\nSeeding default day schedules (Mon–Fri 10–5, Sat 7–11)...");
  await seedDefaultConfigs();

  console.log("\n✅ Timetable migration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
