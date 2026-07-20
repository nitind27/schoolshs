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
    CREATE TABLE IF NOT EXISTS \`chatroom\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`type\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NULL,
      \`directKey\` VARCHAR(191) NULL,
      UNIQUE INDEX \`chatroom_directKey_key\`(\`directKey\`),
      INDEX \`chatroom_schoolId_idx\`(\`schoolId\`),
      INDEX \`chatroom_schoolId_type_idx\`(\`schoolId\`, \`type\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`chatparticipant\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`roomId\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`joinedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`lastReadAt\` DATETIME(3) NULL,
      UNIQUE INDEX \`chatparticipant_roomId_userId_key\`(\`roomId\`, \`userId\`),
      INDEX \`chatparticipant_userId_idx\`(\`userId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`chatmessage\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`roomId\` VARCHAR(191) NOT NULL,
      \`senderId\` VARCHAR(191) NOT NULL,
      \`type\` VARCHAR(191) NOT NULL DEFAULT 'text',
      \`content\` TEXT NULL,
      INDEX \`chatmessage_roomId_createdAt_idx\`(\`roomId\`, \`createdAt\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`chatattachment\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`messageId\` VARCHAR(191) NOT NULL,
      \`fileName\` VARCHAR(191) NOT NULL,
      \`mimeType\` VARCHAR(191) NOT NULL,
      \`filePath\` VARCHAR(191) NOT NULL,
      \`fileSize\` INT NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  console.log("Chat schema ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
