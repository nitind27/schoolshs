/**
 * Backfill SchoolSubscription for schools created before super-admin v2.
 * Run: npx tsx scripts/backfill-school-subscriptions.ts
 */
import { prisma } from "../src/lib/db";
import { SCHOOL_FEATURE_KEYS } from "../src/lib/school-features";
import { Prisma } from "../src/generated/prisma/client";

async function main() {
  const schools = await prisma.school.findMany({
    where: { subscription: null },
    select: { id: true, name: true },
  });

  if (!schools.length) {
    console.log("All schools already have subscriptions.");
    return;
  }

  for (const school of schools) {
    await prisma.schoolSubscription.create({
      data: {
        schoolId: school.id,
        planName: "enterprise",
        enabledFeatures: [...SCHOOL_FEATURE_KEYS],
        paymentStatus: "paid",
        paidAmount: new Prisma.Decimal(0),
      },
    });
    console.log(`Created subscription for: ${school.name}`);
  }

  console.log(`Done. Backfilled ${schools.length} school(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
