import { loadEnv } from "./load-env";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./prisma-factory";

loadEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema changes — forces fresh client in dev HMR */
const SCHEMA_VERSION = 24;

function isClientFresh(client: PrismaClient): boolean {
  const hasLoginSecurity =
    "lockedUntil" in Prisma.UserScalarFieldEnum &&
    "failedLoginCount" in Prisma.UserScalarFieldEnum;
  const hasEmailVerification = "emailVerified" in Prisma.UserScalarFieldEnum;

  return (
    "user" in client &&
    "automationJob" in client &&
    "school" in client &&
    "voucher" in client &&
    "studentAttendanceMonth" in client &&
    "chatRoom" in client &&
    "classSubject" in client &&
    "platformSettings" in client &&
    "pendingAdminEmailVerification" in client &&
    "dailyAttendanceBook" in client &&
    hasLoginSecurity &&
    hasEmailVerification
  );
}

export function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isClientFresh(cached) && globalForPrisma.prismaSchemaVersion === SCHEMA_VERSION) {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
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
