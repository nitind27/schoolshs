/**
 * Reset Play Store demo student so first login asks for the fixed OTP,
 * then password stays 123456.
 *
 * Run: npx tsx scripts/fix-playstore-demo-student.ts
 */
import { loadEnv } from "../src/lib/load-env";
loadEnv();

import { prisma } from "../src/lib/db";
import { passwordRecord } from "../src/lib/user-password";
import { hashOtp } from "../src/lib/email-verification";
import {
  PLAYSTORE_DEMO_SCHOOL_CODE,
  PLAYSTORE_DEMO_STUDENT_EMAIL,
  PLAYSTORE_DEMO_STUDENT_OTP,
  PLAYSTORE_DEMO_STUDENT_PASSWORD,
} from "../src/lib/playstore-demo-student";

async function main() {
  const school = await prisma.school.findUnique({
    where: { code: PLAYSTORE_DEMO_SCHOOL_CODE },
    select: { id: true, name: true, code: true },
  });
  if (!school) {
    throw new Error(`School ${PLAYSTORE_DEMO_SCHOOL_CODE} not found. Seed it first.`);
  }

  const user = await prisma.user.findUnique({
    where: { email: PLAYSTORE_DEMO_STUDENT_EMAIL },
    select: { id: true, email: true, role: true, schoolId: true },
  });
  if (!user || user.role !== "student" || user.schoolId !== school.id) {
    throw new Error(
      `Student ${PLAYSTORE_DEMO_STUDENT_EMAIL} not found under ${PLAYSTORE_DEMO_SCHOOL_CODE}.`,
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...passwordRecord(PLAYSTORE_DEMO_STUDENT_PASSWORD),
      isActive: true,
      emailVerified: false,
      emailVerifiedAt: null,
      emailVerificationToken: hashOtp(PLAYSTORE_DEMO_STUDENT_OTP),
      emailVerificationExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await prisma.userSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokeReason: "playstore_demo_reset",
    },
  });

  console.log(`
Play Store demo student ready
  School  : ${school.name} (${school.code})
  Email   : ${PLAYSTORE_DEMO_STUDENT_EMAIL}
  Password: ${PLAYSTORE_DEMO_STUDENT_PASSWORD}
  OTP     : ${PLAYSTORE_DEMO_STUDENT_OTP}  (first login only)
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
