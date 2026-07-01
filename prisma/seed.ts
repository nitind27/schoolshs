import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const filePath = path.resolve(process.cwd(), (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, ""));
const adapter = new PrismaLibSql({ url: `file:${filePath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Run scripts/setup-multi-tenant.ts for auth users and schools.");
  console.log("Run scripts/add-dummy-student.ts for sample student.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
