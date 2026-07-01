import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema changes — forces fresh client in dev HMR */
const SCHEMA_VERSION = 9;

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
export { createPrismaClient };
