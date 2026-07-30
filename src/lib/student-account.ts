import type { Student } from "@/generated/prisma/client";
import { AuthError, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const STUDENT_TEMPORARY_PASSWORD = "123456";

function normalizeStudentEmail(value: string | null | undefined): string | null {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function studentAccountName(student: Pick<Student, "firstName" | "middleName" | "surname">) {
  return [student.firstName, student.middleName, student.surname]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * Check the globally unique User.email before mutating a student record so a
 * duplicate login cannot leave the student update half-finished.
 */
export async function assertStudentAccountEmailAvailable(
  emailValue: string | null | undefined,
  studentId?: string,
) {
  const email = normalizeStudentEmail(emailValue);
  if (!email) return;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { studentId: true },
  });
  if (existing && existing.studentId !== studentId) {
    throw new AuthError(
      "This email is already used by another portal account. Enter a different student email.",
      409,
    );
  }
}

/**
 * Keep the portal User account tied to Student.email.
 *
 * New accounts receive temporary password 123456. Changing the student email
 * resets verification/password setup and revokes every existing session so the
 * old address can no longer access the portal.
 */
export async function syncStudentPortalAccount(
  student: Pick<
    Student,
    "id" | "schoolId" | "email" | "firstName" | "middleName" | "surname"
  >,
) {
  const email = normalizeStudentEmail(student.email);
  const linked = await prisma.user.findUnique({
    where: { studentId: student.id },
  });

  if (!email) {
    if (linked?.isActive) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: linked.id },
          data: { isActive: false },
        }),
        prisma.userSession.updateMany({
          where: { userId: linked.id, revokedAt: null },
          data: {
            revokedAt: new Date(),
            revokeReason: "student_email_removed",
          },
        }),
      ]);
    }
    return null;
  }

  const name = studentAccountName(student) || "Student";
  if (!linked) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(STUDENT_TEMPORARY_PASSWORD),
        name,
        role: "student",
        schoolId: student.schoolId,
        studentId: student.id,
        isActive: true,
        emailVerified: false,
        mustChangePassword: true,
      },
    });
  }

  const emailChanged = linked.email !== email;
  const updated = await prisma.user.update({
    where: { id: linked.id },
    data: {
      email,
      name,
      schoolId: student.schoolId,
      role: "student",
      isActive: true,
      ...(emailChanged
        ? {
            passwordHash: hashPassword(STUDENT_TEMPORARY_PASSWORD),
            emailVerified: false,
            emailVerifiedAt: null,
            emailVerificationToken: null,
            emailVerificationExpires: null,
            mustChangePassword: true,
            passwordChangedAt: null,
          }
        : {}),
    },
  });

  if (emailChanged) {
    await prisma.userSession.updateMany({
      where: { userId: linked.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokeReason: "student_email_changed",
      },
    });
  }

  return updated;
}
