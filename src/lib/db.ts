import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema changes — forces fresh client in dev HMR */
const SCHEMA_VERSION = 8;

function getDbUrl(): string {
  const dbPath = process.env.DATABASE_URL || "file:./dev.db";
  if (dbPath.startsWith("file:")) {
    const relative = dbPath.replace(/^file:/, "");
    return `file:${path.resolve(process.cwd(), relative)}`;
  }
  return dbPath;
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: getDbUrl() });
  return new PrismaClient({ adapter });
}

function isClientFresh(client: PrismaClient): boolean {
  return "user" in client && "automationJob" in client && "school" in client && "smsInboxMessage" in client;
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isClientFresh(cached) && globalForPrisma.prismaSchemaVersion === SCHEMA_VERSION) {
    return cached;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
  return client;
}

export const prisma = getPrismaClient();
