import { prisma } from "@/lib/db";
import {
  createVerificationOtp,
  hashOtp,
  verificationExpiry,
  verifyOtpCode,
} from "@/lib/email-verification";
import { buildOtpVerificationEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { isEmailEnabled } from "@/lib/platform-settings";

const OTP_LENGTH = 6;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getEmailVerificationRequired(): Promise<boolean> {
  return isEmailEnabled();
}

export async function sendPendingAdminEmailOtp(params: {
  email: string;
  adminName: string;
  schoolName?: string;
}): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  const email = normalizeEmail(params.email);
  const adminName = params.adminName.trim();
  const schoolName = params.schoolName?.trim() || null;

  if (!email) return { ok: false, error: "Admin email is required" };
  if (!adminName) return { ok: false, error: "Admin name is required" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "This email is already registered" };

  const enabled = await isEmailEnabled();
  if (!enabled) {
    return { ok: false, error: "Email service is not configured. Enable SMTP in Admin → Email Settings." };
  }

  const otp = createVerificationOtp();
  const expiresAt = verificationExpiry();

  await prisma.pendingAdminEmailVerification.upsert({
    where: { email },
    create: {
      email,
      adminName,
      schoolName,
      otpHash: hashOtp(otp),
      expiresAt,
      verifiedAt: null,
    },
    update: {
      adminName,
      schoolName,
      otpHash: hashOtp(otp),
      expiresAt,
      verifiedAt: null,
    },
  });

  const template = buildOtpVerificationEmail({
    name: adminName,
    schoolName,
    otp,
    expiresMinutes: 10,
  });

  await sendMail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { ok: true, sent: true };
}

export async function verifyPendingAdminEmailOtp(
  email: string,
  otp: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = otp.replace(/\D/g, "").trim();

  if (!normalizedEmail) return { ok: false, error: "Admin email is required" };
  if (normalizedOtp.length !== OTP_LENGTH) {
    return { ok: false, error: `Enter the ${OTP_LENGTH}-digit OTP from your email` };
  }

  const pending = await prisma.pendingAdminEmailVerification.findUnique({
    where: { email: normalizedEmail },
  });

  if (!pending) {
    return { ok: false, error: "No OTP found for this email. Click Send OTP first." };
  }
  if (pending.verifiedAt) {
    return { ok: true, email: normalizedEmail };
  }
  if (pending.expiresAt < new Date()) {
    return { ok: false, error: "OTP has expired. Click Resend OTP." };
  }
  if (!verifyOtpCode(normalizedOtp, pending.otpHash)) {
    return { ok: false, error: "Invalid OTP. Check your email and try again." };
  }

  await prisma.pendingAdminEmailVerification.update({
    where: { email: normalizedEmail },
    data: { verifiedAt: new Date() },
  });

  return { ok: true, email: normalizedEmail };
}

export async function isPendingAdminEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const pending = await prisma.pendingAdminEmailVerification.findUnique({
    where: { email: normalizedEmail },
    select: { verifiedAt: true },
  });

  return Boolean(pending?.verifiedAt);
}

export async function consumePendingAdminEmailVerification(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  await prisma.pendingAdminEmailVerification.deleteMany({ where: { email: normalizedEmail } });
}

export async function clearPendingAdminEmailVerification(email: string): Promise<void> {
  await consumePendingAdminEmailVerification(email);
}
