import { prisma } from "@/lib/db";
import { verifyPassword, AuthError, type SessionUser } from "@/lib/auth";
import type { UserRole } from "@/lib/roles";
import {
  assertAccountNotLocked,
  clearLoginFailures,
  recordLoginFailure,
  checkIpBeforeLogin,
  MAX_LOGIN_ATTEMPTS,
  AccountLockedError,
} from "@/lib/login-security";
import { EmailNotVerifiedError } from "@/lib/email-verification";
import { isEmailEnabled } from "@/lib/platform-settings";

type UserWithSchool = NonNullable<
  Awaited<ReturnType<typeof prisma.user.findUnique>> & {
    school: {
      id: string;
      name: string;
      code: string;
      isActive: boolean;
    } | null;
  }
>;

async function assertUserCanLogin(user: UserWithSchool): Promise<void> {
  if (!user.isActive) {
    throw new AuthError("Account is inactive. Contact your super administrator.", 403);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw new AccountLockedError(
      `Account locked. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      user.lockedUntil,
      retryAfterSeconds,
    );
  }

  if (user.role === "school_admin" && !user.emailVerified && (await isEmailEnabled())) {
    throw new EmailNotVerifiedError();
  }

  if (user.role === "ca") {
    const assignments = await prisma.caSchoolAssignment.findMany({
      where: { userId: user.id },
      include: { school: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    const activeSchool =
      user.school ||
      assignments.find((a) => a.isPrimary)?.school ||
      assignments[0]?.school;
    if (!activeSchool?.isActive) {
      throw new AuthError("No active school assigned for CA", 403);
    }
  } else if (user.role !== "super_admin" && (!user.schoolId || !user.school?.isActive)) {
    throw new AuthError("School inactive or not assigned", 403);
  }
}

export async function buildSessionUser(user: UserWithSchool): Promise<SessionUser> {
  let activeSchoolId = user.schoolId;
  let activeSchool = user.school;

  if (user.role === "ca") {
    const primaryAssignment = await prisma.caSchoolAssignment.findFirst({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      include: { school: true },
    });
    activeSchoolId = user.schoolId || primaryAssignment?.schoolId || null;
    activeSchool = user.school || primaryAssignment?.school || null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    schoolId: activeSchoolId,
    schoolName: activeSchool?.name ?? null,
    schoolCode: activeSchool?.code ?? null,
    activeSchoolId,
    activeSchoolName: activeSchool?.name ?? null,
    staffId: user.staffId,
    studentId: user.studentId,
  };
}

/** Finalize a successful login. */
export async function completeSuccessfulLogin(
  user: UserWithSchool,
  ip: string,
): Promise<SessionUser> {
  await assertUserCanLogin(user);
  await clearLoginFailures(user.email, ip);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });
  return buildSessionUser(user);
}

export async function authenticateCredentials(
  email: string,
  password: string,
  ip: string,
): Promise<SessionUser> {
  if (!email || !password) {
    throw new AuthError("Email aur password required", 400);
  }

  const normalized = String(email).trim().toLowerCase();
  checkIpBeforeLogin(ip, normalized);
  await assertAccountNotLocked(normalized);

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: { school: true },
  });

  if (!user) {
    await recordLoginFailure(normalized, ip);
    throw new AuthError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AuthError("Account is inactive. Contact your super administrator.", 403);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw new AccountLockedError(
      `Account locked. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      user.lockedUntil,
      retryAfterSeconds,
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const result = await recordLoginFailure(normalized, ip);
    if (result.lockedUntil) {
      const retryAfterSeconds = Math.ceil((result.lockedUntil.getTime() - Date.now()) / 1000);
      throw new AccountLockedError(
        "Too many failed attempts. Account locked for 15 minutes.",
        result.lockedUntil,
        retryAfterSeconds,
      );
    }
    const left = result.attemptsLeft ?? MAX_LOGIN_ATTEMPTS;
    throw new AuthError(
      left > 0
        ? `Invalid email or password. ${left} attempt(s) remaining.`
        : "Invalid email or password",
      401,
    );
  }

  return completeSuccessfulLogin(user as UserWithSchool, ip);
}
