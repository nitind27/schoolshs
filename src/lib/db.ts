import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./prisma-factory";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema changes — forces fresh client in dev HMR */
const SCHEMA_VERSION = 12;

function isClientFresh(client: PrismaClient): boolean {
  return "user" in client && "automationJob" in client && "school" in client && "voucher" in client;
}

export function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isClientFresh(cached) && globalForPrisma.prismaSchemaVersion === SCHEMA_VERSION) {
    return cached;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
  return client;
}

/** Lazy proxy — no DB connect until first query (safer for Vercel build) */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

export { createPrismaClient };
