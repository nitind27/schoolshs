import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  parseSessionToken,
  type SessionUser,
  type UserRole,
} from "@/lib/session-token";

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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await parseSessionToken(token);
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

export async function requireSchoolAuth(): Promise<SessionUser & { schoolId: string }> {
  const session = await requireAuth(["school_admin"]);
  if (!session.schoolId) throw new AuthError("School not assigned", 403);
  return session as SessionUser & { schoolId: string };
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function studentWhere(session: SessionUser) {
  if (session.role === "super_admin") return {};
  return { schoolId: session.schoolId! };
}

export function schoolScopeId(session: SessionUser): string | undefined {
  if (session.role === "super_admin") return undefined;
  return session.schoolId ?? undefined;
}
