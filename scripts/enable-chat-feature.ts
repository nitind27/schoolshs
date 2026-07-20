import { prisma } from "../src/lib/db";
import { normalizeFeatureList } from "../src/lib/school-features";

async function main() {
  const subs = await prisma.schoolSubscription.findMany({
    select: { id: true, schoolId: true, enabledFeatures: true },
  });

  for (const sub of subs) {
    const features = normalizeFeatureList(sub.enabledFeatures);
    if (features.includes("chat")) continue;
    const updated = [...features, "chat"];
    await prisma.schoolSubscription.update({
      where: { id: sub.id },
      data: { enabledFeatures: updated },
    });
    console.log("Enabled chat for school", sub.schoolId);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
