/**
 * Apply student-delete cascade FK changes on MySQL (production DBs not baselined in _prisma_migrations).
 */
import { prisma } from "../src/lib/db";

async function dropStudentFk(table: string, column: string) {
  const rows = await prisma.$queryRaw<{ CONSTRAINT_NAME: string }[]>`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
      AND REFERENCED_TABLE_NAME = 'student'
    LIMIT 1
  `;
  const fk = rows[0]?.CONSTRAINT_NAME;
  if (!fk) {
    console.log(`No FK on ${table}.${column} → skip drop`);
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk}\``);
  console.log(`Dropped ${table}.${fk}`);
}

async function addCascadeFk(
  table: string,
  column: string,
  constraintName: string,
) {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`${table}\`
      ADD CONSTRAINT \`${constraintName}\`
      FOREIGN KEY (\`${column}\`) REFERENCES \`student\`(\`id\`)
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log(`Added ${constraintName} on ${table}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("already exists")) {
      console.log(`${constraintName} already exists — OK`);
      return;
    }
    throw e;
  }
}

async function main() {
  await dropStudentFk("generalregisterentry", "studentId");
  await addCascadeFk(
    "generalregisterentry",
    "studentId",
    "generalregisterentry_studentId_fkey",
  );

  await dropStudentFk("user", "studentId");
  await addCascadeFk("user", "studentId", "user_studentId_fkey");

  console.log("Student delete cascade FK migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
