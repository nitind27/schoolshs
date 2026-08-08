import { prisma } from "../src/lib/db";
import { SONGADH_PRIMARY_LETTERHEAD } from "../src/lib/letterhead/defaults";

async function main() {
  const codes = ["24261004403", "24261004404"];
  for (const code of codes) {
    const school = await prisma.school.findFirst({ where: { code } });
    if (!school) {
      console.log("skip missing", code);
      continue;
    }
    await prisma.schoolSettings.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        schoolName: school.name,
        letterheadJson: SONGADH_PRIMARY_LETTERHEAD as object,
      },
      update: {
        letterheadJson: SONGADH_PRIMARY_LETTERHEAD as object,
      },
    });
    console.log("seeded letterhead", code, school.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
