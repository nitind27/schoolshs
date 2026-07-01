import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { applyDatabaseUrlFromEnv, getDbProvider, getMysqlConfig } from "./env";

export function createPrismaClient(): PrismaClient {
  const url = applyDatabaseUrlFromEnv();

  if (getDbProvider() === "mysql") {
    const adapter = new PrismaMariaDb(getMysqlConfig());
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}
