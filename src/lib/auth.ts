import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  parseSessionToken,
  type SessionUser,
} from "@/lib/session-token";
import type { UserRole } from "@/lib/roles";
import {
  ACCOUNTING_ROLES,
  SCHOOL_ROLES,
  STAFF_ROLES,
} from "@/lib/roles";
import { buildAccountingSession, type AccountingSession } from "@/lib/accounting-scope";
import { extractBearerToken } from "@/lib/mobile-api";

export type { SessionUser, UserRole };
export { parseSessionToken };

const SESSION_COOKIE = "shs_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(expected, actual);
}

export async function getSession(): Promise<SessionUser | null> {
  const headerStore = await headers();
  const bearer = extractBearerToken(headerStore.get("authorization"));

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;

  const token = bearer || cookieToken;
  if (!token) return null;
  return await parseSessionToken(token);
}

export async function createAuthToken(user: SessionUser): Promise<string> {
  return createSessionToken(user);
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  const token = await createSessionToken(user);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireAuth(roles?: UserRole[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError("Login required", 401);
  if (roles && !roles.includes(session.role)) throw new AuthError("Access denied", 403);
  return session;
}

export async function requireSchoolAuth(roles?: UserRole[]): Promise<SessionUser & { schoolId: string }> {
  const allowed = roles || SCHOOL_ROLES;
  const session = await requireAuth(allowed);
  if (!session.schoolId) throw new AuthError("School not assigned", 403);
  return session as SessionUser & { schoolId: string };
}

export async function requireStaffAuth(): Promise<SessionUser & { schoolId: string }> {
  return requireSchoolAuth(STAFF_ROLES);
}

export async function requireAccountingAuth(roles?: UserRole[]): Promise<AccountingSession> {
  const session = await requireSchoolAuth(roles || ACCOUNTING_ROLES);
  return buildAccountingSession(session);
}

export type { AccountingSession };

export async function requireStudentAuth(): Promise<SessionUser & { schoolId: string; studentId: string }> {
  const session = await requireSchoolAuth(["student"]);
  if (!session.studentId) throw new AuthError("Student profile not linked", 403);
  return session as SessionUser & { schoolId: string; studentId: string };
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function studentWhere(session: SessionUser) {
  if (session.role === "super_admin") return {};
  if (session.role === "student" && session.studentId) return { id: session.studentId };
  return { schoolId: session.schoolId! };
}

export function schoolScopeId(session: SessionUser): string | undefined {
  if (session.role === "super_admin") return undefined;
  return session.schoolId ?? undefined;
}
