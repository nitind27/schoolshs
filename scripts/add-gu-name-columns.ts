import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createPrismaClient } from "../src/lib/prisma-factory";

const prisma = createPrismaClient();

const alters = [
  "ALTER TABLE student ADD COLUMN firstNameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN middleNameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN surnameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN aadhaarNameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN motherNameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN fatherNameGu VARCHAR(191) NULL",
  "ALTER TABLE student ADD COLUMN guardianNameGu VARCHAR(191) NULL",
];

async function main() {
  for (const sql of alters) {
    const col = sql.match(/ADD COLUMN (\w+)/)?.[1] || sql;
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK", col);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(msg.includes("Duplicate column") ? "EXISTS" : "ERR", col, msg.slice(0, 100));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
