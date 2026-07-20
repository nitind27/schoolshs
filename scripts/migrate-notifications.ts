/**
 * Create notification table if missing + seed welcome samples for school users.
 * Run: npm run db:migrate-notifications
 */
import { loadEnv } from "../src/lib/load-env";
import { prisma } from "../src/lib/db";
import { randomBytes } from "crypto";

loadEnv();

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    name
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

const SQL = `
CREATE TABLE IF NOT EXISTS \`notification\` (
  \`id\` VARCHAR(191) NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  \`schoolId\` VARCHAR(191) NULL,
  \`userId\` VARCHAR(191) NOT NULL,
  \`type\` VARCHAR(191) NOT NULL DEFAULT 'system',
  \`title\` VARCHAR(191) NOT NULL,
  \`body\` TEXT NULL,
  \`href\` VARCHAR(191) NULL,
  \`metaJson\` TEXT NULL,
  \`readAt\` DATETIME(3) NULL,
  PRIMARY KEY (\`id\`),
  KEY \`notification_userId_readAt_createdAt_idx\` (\`userId\`, \`readAt\`, \`createdAt\`),
  KEY \`notification_schoolId_createdAt_idx\` (\`schoolId\`, \`createdAt\`),
  KEY \`notification_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
  CONSTRAINT \`notification_schoolId_fkey\` FOREIGN KEY (\`schoolId\`) REFERENCES \`school\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`notification_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

function nid() {
  return `ntf_${randomBytes(12).toString("hex")}`;
}

async function seedWelcomeSamples() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["school_admin", "teacher", "clerk", "ca"] },
      schoolId: { not: null },
    },
    select: { id: true, schoolId: true, role: true },
  });

  let created = 0;
  for (const u of users) {
    const existing = await prisma.notification.count({ where: { userId: u.id } });
    if (existing > 0) continue;

    const roleHome =
      u.role === "teacher"
        ? "/teacher"
        : u.role === "clerk"
          ? "/dashboard"
          : u.role === "ca"
            ? "/ca"
            : "/dashboard";

    await prisma.notification.createMany({
      data: [
        {
          id: nid(),
          userId: u.id,
          schoolId: u.schoolId,
          type: "system",
          title: "Welcome to notifications",
          body: "Chat messages, new students, and important school updates will appear here.",
          href: roleHome,
        },
        {
          id: nid(),
          userId: u.id,
          schoolId: u.schoolId,
          type: "chat",
          title: "Staff Chat is available",
          body: "Message admin, teachers, and clerks from the Chat page.",
          href: "/chat",
        },
      ],
    });
    created += 2;
  }
  console.log(`✓ Seeded ${created} sample notification(s)`);
}

async function main() {
  if (await tableExists("notification")) {
    console.log("✓ Table notification already exists");
  } else {
    console.log("Creating table notification...");
    await prisma.$executeRawUnsafe(SQL);
    console.log("✓ Table notification created");
  }

  await seedWelcomeSamples();
  console.log("✅ Notification migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
