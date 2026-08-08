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
import type { LoginContext } from "@/lib/login-geo";
import {
  createUserSession,
  isMultiDeviceWebRole,
  listActiveWebSessions,
  newSessionKey,
  revokeOtherWebSessions,
  type ActiveSessionInfo,
  type SessionAction,
} from "@/lib/user-sessions";
import { ensureStudentFirstLoginOtp } from "@/lib/student-first-login";

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

export type AuthenticateOk = {
  kind: "ok";
  session: SessionUser;
  revokedOthers: boolean;
};

export type AuthenticateDeviceChoice = {
  kind: "device_choice";
  sessions: ActiveSessionInfo[];
  name: string;
  email: string;
  role: string;
};

export type AuthenticateStudentSetup = {
  kind: "student_setup";
  email: string;
  name: string;
  otpSent: boolean;
};

export type AuthenticateResult =
  | AuthenticateOk
  | AuthenticateDeviceChoice
  | AuthenticateStudentSetup;

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
    const { assertPortalFeatureForRole } = await import("@/lib/school-feature-access");
    await assertPortalFeatureForRole(activeSchool.id, "ca");
  } else if (user.role !== "super_admin" && (!user.schoolId || !user.school?.isActive)) {
    throw new AuthError("School inactive or not assigned", 403);
  } else if (user.schoolId && ["teacher", "clerk", "student"].includes(user.role)) {
    const { assertPortalFeatureForRole } = await import("@/lib/school-feature-access");
    await assertPortalFeatureForRole(user.schoolId, user.role);
  }
}

export async function buildSessionUser(
  user: UserWithSchool,
  sid?: string | null,
): Promise<SessionUser> {
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
    sid: sid ?? null,
  };
}

/** Finalize a successful login: IP/geo audit + device session row. */
export async function completeSuccessfulLogin(
  user: UserWithSchool,
  ctx: LoginContext,
  options?: { sessionAction?: SessionAction | null },
): Promise<{ session: SessionUser; revokedOthers: boolean }> {
  await assertUserCanLogin(user);
  await clearLoginFailures(user.email, ctx.ip);

  const sessionKey = newSessionKey();
  let revokedOthers = false;

  if (ctx.source === "web" && options?.sessionAction === "logout_others") {
    await revokeOtherWebSessions(user.id);
    revokedOthers = true;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginIp: ctx.ip,
        lastLoginLat: ctx.latitude,
        lastLoginLon: ctx.longitude,
        lastLoginAccuracyM: ctx.accuracyM,
        lastLoginUserAgent: ctx.userAgent,
        lastLoginCity: ctx.city,
        lastLoginRegion: ctx.region,
        lastLoginCountry: ctx.country,
        lastLoginGeoSource: ctx.geoSource,
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        ip: ctx.ip,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        accuracyM: ctx.accuracyM,
        userAgent: ctx.userAgent,
        source: ctx.source,
        geoSource: ctx.geoSource,
        city: ctx.city,
        region: ctx.region,
        country: ctx.country,
      },
    }),
  ]);

  await createUserSession({
    userId: user.id,
    sessionKey,
    channel: ctx.source === "mobile" ? "mobile" : "web",
    ctx,
  });

  const session = await buildSessionUser(user, sessionKey);
  return { session, revokedOthers };
}

async function loadUserForLogin(email: string, ip: string): Promise<UserWithSchool> {
  if (!email) {
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

  return user as UserWithSchool;
}

/** Web login — school code required; account must belong to that school. */
async function assertSchoolCodeForWebLogin(
  user: UserWithSchool,
  schoolCode: string | null | undefined,
  ctx: LoginContext,
): Promise<void> {
  if (ctx.source !== "web") return;

  // Super Admin — no school code; ignore any code entered
  if (user.role === "super_admin") {
    return;
  }

  if (user.role === "ca") {
    if (!schoolCode?.trim()) return;
    const code = schoolCode.trim().toUpperCase();
    const school = await prisma.school.findFirst({
      where: { code, isActive: true },
    });
    if (!school) {
      throw new AuthError("School not found for this code", 404);
    }
    const assigned = await prisma.caSchoolAssignment.findFirst({
      where: { userId: user.id, schoolId: school.id },
    });
    if (!assigned) {
      throw new AuthError(
        "You are not assigned to this school. Check the school code.",
        403,
      );
    }
    return;
  }

  const code = schoolCode?.trim().toUpperCase();
  if (!code) {
    throw new AuthError("School code is required", 400);
  }

  const school = await prisma.school.findFirst({
    where: { code, isActive: true },
  });
  if (!school) {
    throw new AuthError("School not found for this code", 404);
  }

  if (user.schoolId !== school.id) {
    throw new AuthError(
      "This account does not belong to the selected school. Check your school code.",
      403,
    );
  }
}

export async function authenticateCredentials(
  email: string,
  password: string,
  ctx: LoginContext,
  options?: { sessionAction?: SessionAction | null; schoolCode?: string | null },
): Promise<AuthenticateResult> {
  if (!password) {
    throw new AuthError("Email aur password required", 400);
  }

  const user = await loadUserForLogin(email, ctx.ip);
  const normalized = user.email;

  if (!verifyPassword(password, user.passwordHash)) {
    const result = await recordLoginFailure(normalized, ctx.ip);
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

  await assertSchoolCodeForWebLogin(user, options?.schoolCode, ctx);

  if (
    user.role === "student" &&
    (user.mustChangePassword || !user.emailVerified)
  ) {
    await assertUserCanLogin(user);
    await clearLoginFailures(user.email, ctx.ip);
    const otpResult = await ensureStudentFirstLoginOtp(user);
    return {
      kind: "student_setup",
      email: user.email,
      name: user.name,
      otpSent: otpResult.sent,
    };
  }

  // Multi-device gate for web admin/clerk roles
  if (
    ctx.source === "web" &&
    isMultiDeviceWebRole(user.role) &&
    options?.sessionAction !== "keep_all" &&
    options?.sessionAction !== "logout_others"
  ) {
    const sessions = await listActiveWebSessions(user.id);
    if (sessions.length > 0) {
      return {
        kind: "device_choice",
        sessions,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }
  }

  const { session, revokedOthers } = await completeSuccessfulLogin(user, ctx, {
    sessionAction: options?.sessionAction ?? null,
  });
  return { kind: "ok", session, revokedOthers };
}
