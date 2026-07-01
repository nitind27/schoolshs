import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  console.log("Migrating to multi-tenant...");

  const defaultSchool = await prisma.school.upsert({
    where: { code: "SONGADH001" },
    create: {
      name: "Sarvjanik Upper Primary School Songadh",
      code: "SONGADH001",
      district: "Tapi",
      address: "Fort Songadh, Tapi, Gujarat - 394670",
      phone: "9712075792",
      email: "school@songadh.local",
    },
    update: {},
  });

  await prisma.schoolSettings.upsert({
    where: { schoolId: defaultSchool.id },
    create: {
      schoolId: defaultSchool.id,
      schoolName: defaultSchool.name,
      schoolAddress: defaultSchool.address,
      schoolPhone: defaultSchool.phone,
      schoolEmail: defaultSchool.email,
      tagline: "Education for All",
    },
    update: { schoolId: defaultSchool.id },
  });

  await prisma.student.updateMany({ data: { schoolId: defaultSchool.id } });
  await prisma.staff.updateMany({ data: { schoolId: defaultSchool.id } });
  await prisma.schoolClass.updateMany({ data: { schoolId: defaultSchool.id } });
  await prisma.bulkSubmission.updateMany({ data: { schoolId: defaultSchool.id } });

  await prisma.user.upsert({
    where: { email: "superadmin@shs.local" },
    create: {
      email: "superadmin@shs.local",
      passwordHash: hashPassword("SuperAdmin@123"),
      name: "Super Admin",
      role: "super_admin",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "admin@songadh.local" },
    create: {
      email: "admin@songadh.local",
      passwordHash: hashPassword("SchoolAdmin@123"),
      name: "Songadh School Admin",
      role: "school_admin",
      schoolId: defaultSchool.id,
    },
    update: { schoolId: defaultSchool.id },
  });

  console.log("✓ Migration done");
  console.log("Super Admin: superadmin@shs.local / SuperAdmin@123");
  console.log("School Admin: admin@songadh.local / SchoolAdmin@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
