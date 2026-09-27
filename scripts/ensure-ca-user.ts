/**
 * Ensure CA portal user exists: ca@songadh.local / CA@12345
 * Run: npx tsx scripts/ensure-ca-user.ts
 */
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const EMAIL = "ca@songadh.local";
const PASSWORD = "CA@12345";

async function main() {
  const schools = await prisma.school.findMany({
    where: {
      code: { in: ["24261004403", "24261004404", "24261004405"] },
    },
    select: { id: true, code: true, name: true },
  });

  if (!schools.length) {
    throw new Error("No Songadh schools found to assign CA");
  }

  const primary =
    schools.find((s) => s.code === "24261004405") || schools[0]!;

  const caUser = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      passwordHash: hashPassword(PASSWORD),
      name: "CA Audit Firm",
      role: "ca",
      schoolId: primary.id,
      emailVerified: true,
      mustChangePassword: false,
    },
    update: {
      passwordHash: hashPassword(PASSWORD),
      name: "CA Audit Firm",
      role: "ca",
      schoolId: primary.id,
      emailVerified: true,
      mustChangePassword: false,
    },
  });

  for (const school of schools) {
    await prisma.caSchoolAssignment.upsert({
      where: {
        userId_schoolId: { userId: caUser.id, schoolId: school.id },
      },
      create: {
        userId: caUser.id,
        schoolId: school.id,
        isPrimary: school.id === primary.id,
      },
      update: { isPrimary: school.id === primary.id },
    });
  }

  console.log("CA user ready");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Login:    /login?portal=ca`);
  console.log("  Assigned schools:");
  for (const s of schools) {
    console.log(
      `   - ${s.code} ${s.name}${s.id === primary.id ? " (primary)" : ""}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
