import { AuthError, verifyPassword } from "@/lib/auth";
import { passwordRecord } from "@/lib/user-password";
import { prisma } from "@/lib/db";
import {
  createVerificationOtp,
  hashOtp,
  verificationExpiry,
  verifyOtpCode,
} from "@/lib/email-verification";
import { buildStudentFirstLoginOtpEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import {
  getSmtpConfigIssue,
  isEmailEnabled,
} from "@/lib/platform-settings";
import { STUDENT_TEMPORARY_PASSWORD } from "@/lib/student-account";

const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;

type StudentSetupUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  emailVerified: boolean;
  mustChangePassword: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  school: { name: string } | null;
};

async function loadStudentSetupUser(email: string): Promise<StudentSetupUser | null> {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      emailVerified: true,
      mustChangePassword: true,
      emailVerificationToken: true,
      emailVerificationExpires: true,
      school: { select: { name: true } },
    },
  });
}

function assertStudentSetupAccount(user: StudentSetupUser | null): asserts user is StudentSetupUser {
  if (!user || user.role !== "student") {
    throw new AuthError("Invalid email or password", 401);
  }
  if (!user.mustChangePassword && user.emailVerified) {
    throw new AuthError("Student account setup is already complete. Sign in normally.", 400);
  }
}

export async function sendStudentFirstLoginOtp(
  user: Pick<StudentSetupUser, "id" | "email" | "name" | "school">,
) {
  if (!(await isEmailEnabled())) {
    const issue = await getSmtpConfigIssue();
    throw new AuthError(
      issue ||
        "Email OTP service is not configured. Contact your school administrator.",
      503,
    );
  }

  const otp = createVerificationOtp();
  const expires = verificationExpiry();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: false,
      emailVerifiedAt: null,
      emailVerificationToken: hashOtp(otp),
      emailVerificationExpires: expires,
    },
  });

  const template = buildStudentFirstLoginOtpEmail({
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
  return { sent: true as const, expires };
}

export async function ensureStudentFirstLoginOtp(
  user: Pick<
    StudentSetupUser,
    "id" | "email" | "name" | "school" | "emailVerificationToken" | "emailVerificationExpires"
  >,
) {
  if (
    user.emailVerificationToken &&
    user.emailVerificationExpires &&
    user.emailVerificationExpires > new Date()
  ) {
    return { sent: false as const, alreadySent: true as const };
  }
  return sendStudentFirstLoginOtp(user);
}

export async function resendStudentFirstLoginOtp(email: string, currentPassword: string) {
  const user = await loadStudentSetupUser(email);
  assertStudentSetupAccount(user);
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new AuthError("Invalid email or password", 401);
  }

  const earliestResendExpiry = new Date(
    Date.now() + OTP_TTL_MS - OTP_RESEND_COOLDOWN_MS,
  );
  if (
    user.emailVerificationToken &&
    user.emailVerificationExpires &&
    user.emailVerificationExpires > earliestResendExpiry
  ) {
    throw new AuthError("Please wait one minute before requesting another OTP.", 429);
  }
  return sendStudentFirstLoginOtp(user);
}

export async function completeStudentFirstLogin(input: {
  email: string;
  currentPassword: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await loadStudentSetupUser(input.email);
  assertStudentSetupAccount(user);

  if (!verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new AuthError("Invalid email or temporary password", 401);
  }
  const otp = input.otp.replace(/\D/g, "");
  if (otp.length !== 6) throw new AuthError("Enter the 6-digit OTP from your email.", 400);
  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw new AuthError("OTP expired. Request a new OTP.", 400);
  }
  if (!verifyOtpCode(otp, user.emailVerificationToken)) {
    throw new AuthError("Invalid OTP. Check the email code and try again.", 400);
  }

  const newPassword = input.newPassword;
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new AuthError(
      "New password must be at least 8 characters and include a letter and number.",
      400,
    );
  }
  if (newPassword === STUDENT_TEMPORARY_PASSWORD) {
    throw new AuthError("Choose a new password instead of the temporary password.", 400);
  }
  if (newPassword !== input.confirmPassword) {
    throw new AuthError("New password and confirm password do not match.", 400);
  }
  if (verifyPassword(newPassword, user.passwordHash)) {
    throw new AuthError("New password must be different from the current password.", 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        ...passwordRecord(newPassword),
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: "student_first_login_completed",
      },
    }),
  ]);

  return { ok: true as const, email: user.email };
}
