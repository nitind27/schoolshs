import { randomInt } from "crypto";
import { AuthError, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRequestPublicOrigin } from "@/lib/env-auth";
import { buildOtpVerificationEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { isEmailEnabled } from "@/lib/platform-settings";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_LENGTH = 6;

export function createVerificationOtp(): string {
  return String(randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH));
}

export function verificationExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function hashOtp(otp: string): string {
  return hashPassword(otp.trim());
}

export function verifyOtpCode(otp: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  return verifyPassword(otp.trim(), storedHash);
}

export async function issueEmailVerification(userId: string) {
  const otp = createVerificationOtp();
  const expires = verificationExpiry();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: false,
      emailVerificationToken: hashOtp(otp),
      emailVerificationExpires: expires,
      emailVerifiedAt: null,
    },
  });
  return { otp, expires };
}

export async function markEmailVerified(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      emailVerifiedAt: new Date(),
    },
  });
}

export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super(
      "Please verify your email with the OTP sent to your inbox before signing in.",
      403,
    );
  }
}

export async function sendSchoolAdminVerificationEmail(
  userId: string,
  _requestOrigin: string,
): Promise<{ sent: boolean; reason?: string }> {
  const enabled = await isEmailEnabled();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { school: { select: { name: true } } },
  });
  if (!user) throw new Error("User not found");
  if (user.role !== "school_admin") {
    return { sent: false, reason: "not_school_admin" };
  }
  if (user.emailVerified) {
    return { sent: false, reason: "already_verified" };
  }

  const { otp } = await issueEmailVerification(userId);

  if (!enabled) {
    return { sent: false, reason: "smtp_disabled" };
  }

  const template = buildOtpVerificationEmail({
    name: user.name,
    schoolName: user.school?.name,
    otp,
    expiresMinutes: OTP_TTL_MS / 60000,
  });

  await sendMail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { sent: true };
}

export async function onboardSchoolAdminUser(userId: string, requestOrigin: string) {
  const enabled = await isEmailEnabled();
  if (enabled) {
    return sendSchoolAdminVerificationEmail(userId, requestOrigin);
  }
  await markEmailVerified(userId);
  return { sent: false, reason: "smtp_disabled" as const };
}

export async function verifyEmailByOtp(
  email: string,
  otp: string,
  password: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp = otp.replace(/\D/g, "").trim();

  if (!normalizedEmail) return { ok: false, error: "Email is required" };
  if (normalizedOtp.length !== OTP_LENGTH) {
    return { ok: false, error: `Enter the ${OTP_LENGTH}-digit OTP from your email` };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      emailVerified: true,
      emailVerificationToken: true,
      emailVerificationExpires: true,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password" };
  }
  if (user.role !== "school_admin") {
    return { ok: false, error: "Email verification applies to school admin accounts only" };
  }
  if (user.emailVerified) {
    return { ok: true, email: user.email };
  }
  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    return { ok: false, error: "OTP has expired. Request a new code using Resend OTP." };
  }
  if (!verifyOtpCode(normalizedOtp, user.emailVerificationToken)) {
    return { ok: false, error: "Invalid OTP. Check the code in your email and try again." };
  }

  await markEmailVerified(user.id);
  return { ok: true, email: user.email };
}

export async function resendVerificationForCredentials(
  email: string,
  password: string,
  requestOrigin: string,
) {
  const { verifyPassword } = await import("@/lib/auth");
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "Invalid email or password" };
  }
  if (user.role !== "school_admin") {
    return { ok: false as const, error: "Email verification applies to school admin accounts only" };
  }
  if (user.emailVerified) {
    return { ok: false as const, error: "Email is already verified" };
  }

  const result = await sendSchoolAdminVerificationEmail(user.id, requestOrigin);
  if (!result.sent && result.reason === "smtp_disabled") {
    return { ok: false as const, error: "Email service is not configured yet. Contact super admin." };
  }

  return { ok: true as const, sent: result.sent };
}

export function getRequestOriginFromHeaders(headers: Headers, fallback = "http://localhost:3000") {
  return getRequestPublicOrigin({
    nextUrl: { origin: fallback },
    headers: { get: (name: string) => headers.get(name) },
  });
}
