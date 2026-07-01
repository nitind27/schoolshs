import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { applyDatabaseUrlFromEnv, getMysqlConfig } from "./env";

/**
 * Prisma schema uses MySQL — always MariaDB adapter (never libsql/sqlite).
 */
export function createPrismaClient(): PrismaClient {
  applyDatabaseUrlFromEnv();
  const adapter = new PrismaMariaDb(getMysqlConfig());
  return new PrismaClient({ adapter });
}
