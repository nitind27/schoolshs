import { prisma } from "../src/lib/db";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";

async function main() {
  const students = await prisma.student.findMany({
    where: {
      email: { not: null },
      user: null,
    },
    select: {
      id: true,
      schoolId: true,
      email: true,
      firstName: true,
      middleName: true,
      surname: true,
    },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      await assertStudentAccountEmailAvailable(student.email, student.id);
      const account = await syncStudentPortalAccount(student);
      if (account) created++;
      else skipped++;
    } catch (error) {
      skipped++;
      errors.push(
        `${student.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  console.log(
    JSON.stringify(
      { scanned: students.length, created, skipped, errors },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
