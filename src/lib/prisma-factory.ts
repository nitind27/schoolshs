import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { applyDatabaseUrlFromEnv, getDbProvider, getMysqlConfig } from "./env";

export function createPrismaClient(): PrismaClient {
  const provider = getDbProvider();
  applyDatabaseUrlFromEnv();

  if (provider === "mysql") {
    const adapter = new PrismaMariaDb(getMysqlConfig());
    return new PrismaClient({ adapter });
  }

  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}
