import { loadEnv } from "./load-env";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "./prisma-factory";

loadEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema changes — forces fresh client in dev HMR */
const SCHEMA_VERSION = 46;

function isClientFresh(client: PrismaClient): boolean {
  const hasLoginSecurity =
    "lockedUntil" in Prisma.UserScalarFieldEnum &&
    "failedLoginCount" in Prisma.UserScalarFieldEnum;
  const hasEmailVerification = "emailVerified" in Prisma.UserScalarFieldEnum;
  const hasStaffGuNames =
    "firstNameGu" in Prisma.StaffScalarFieldEnum &&
    "lastNameGu" in Prisma.StaffScalarFieldEnum;
  const hasLoginGeo = "lastLoginIp" in Prisma.UserScalarFieldEnum;
  const hasExamTemplate =
    "examTemplate" in Prisma.SchoolSettingsScalarFieldEnum;
  const hasLetterheadJson = "letterheadJson" in Prisma.SchoolSettingsScalarFieldEnum;
  const hasPreviousStatus = "previousStatus" in Prisma.StudentScalarFieldEnum;
  const hasLcFonts = "lcFontJson" in Prisma.SchoolSettingsScalarFieldEnum;
  const hasDeactivateRollMode = "deactivateRollMode" in Prisma.StudentScalarFieldEnum;
  const hasAttendanceDayNotes = "attendanceDayNotesJson" in Prisma.SchoolSettingsScalarFieldEnum;
  const hasScholarshipDue = "scholarshipPapersDue" in Prisma.SchoolSettingsScalarFieldEnum;
  const hasThemeId = "themeId" in Prisma.SchoolSettingsScalarFieldEnum;

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
    "schoolRegistrationDraft" in client &&
    "dailyAttendanceBook" in client &&
    "examSeatAssignment" in client &&
    "loginEvent" in client &&
    "userSession" in client &&
    "holiday" in client &&
    "activity" in client &&
    "activityParticipant" in client &&
    "schoolReligion" in client &&
    "studentEditLink" in client &&
    "staffMarksGrant" in client &&
    "staffSupervisorClass" in client &&
    hasLoginSecurity &&
    hasEmailVerification &&
    hasStaffGuNames &&
    hasLoginGeo &&
    hasExamTemplate &&
    hasLetterheadJson &&
    hasPreviousStatus &&
    hasLcFonts &&
    hasDeactivateRollMode &&
    hasAttendanceDayNotes &&
    hasScholarshipDue &&
    hasThemeId &&
    "changeLog" in client
  );
}

export function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isClientFresh(cached) && globalForPrisma.prismaSchemaVersion === SCHEMA_VERSION) {
    return cached;
  }
  // Do not disconnect the previous client during dev HMR. Requests already
  // using its pool would otherwise fail with "pool is ending". The old module
  // instance is reclaimed with the dev process; schema bumps are rare.
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
