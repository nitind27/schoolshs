import { prisma } from "../src/lib/db";

async function safeExec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("OK:", sql.slice(0, 80).replace(/\s+/g, " "));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 70).replace(/\s+/g, " "));
    } else {
      console.warn("WARN:", msg.slice(0, 180));
    }
  }
}

async function main() {
  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`galleryevent\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`schoolId\` VARCHAR(191) NOT NULL,
      \`activityName\` VARCHAR(191) NOT NULL,
      \`eventDate\` VARCHAR(191) NOT NULL,
      \`createdById\` VARCHAR(191) NULL,
      INDEX \`galleryevent_schoolId_eventDate_idx\`(\`schoolId\`, \`eventDate\`),
      INDEX \`galleryevent_schoolId_idx\`(\`schoolId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`gallerytitle\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`eventId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      INDEX \`gallerytitle_eventId_idx\`(\`eventId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(`
    CREATE TABLE IF NOT EXISTS \`galleryimage\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`titleId\` VARCHAR(191) NOT NULL,
      \`filePath\` VARCHAR(191) NOT NULL,
      \`originalName\` VARCHAR(191) NULL,
      \`uploadedById\` VARCHAR(191) NULL,
      \`uploadedByName\` VARCHAR(191) NULL,
      INDEX \`galleryimage_titleId_idx\`(\`titleId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await safeExec(
    "ALTER TABLE `galleryevent` ADD CONSTRAINT `galleryevent_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  );
  await safeExec(
    "ALTER TABLE `gallerytitle` ADD CONSTRAINT `gallerytitle_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `galleryevent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  );
  await safeExec(
    "ALTER TABLE `galleryimage` ADD CONSTRAINT `galleryimage_titleId_fkey` FOREIGN KEY (`titleId`) REFERENCES `gallerytitle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
  );

  console.log("Gallery schema ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
