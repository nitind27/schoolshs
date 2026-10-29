/**
 * Seed notebook subjects for school 24261004403 (બાલવાટિકા Primary).
 *
 *   બાલવાટિકા   → 10+40 = 50
 *   ધોરણ 1-2    → 10+40 = 50
 *   ધોરણ 3 થી 5 → 80+20 = 100
 *
 * Run: npx tsx scripts/seed-subjects-24261004403.ts
 */
import { prisma } from "../src/lib/db";
import {
  SONGADH_PRIMARY_CODE,
  SONGADH_PRIMARY_STANDARDS,
  songadhPrimaryMasterSubjects,
  songadhPrimarySubjectsForStandard,
} from "../src/lib/results/marks-sheet-config";
import { setStandardSubjects } from "../src/lib/school-subjects";
import { replaceClassSubjects } from "../src/lib/class-subjects";
import { DEFAULT_ACADEMIC_YEAR } from "../src/lib/constants";

async function main() {
  const school = await prisma.school.findFirst({
    where: {
      OR: [{ code: SONGADH_PRIMARY_CODE }, { udiseCode: SONGADH_PRIMARY_CODE }],
    },
  });
  if (!school) {
    throw new Error(`School ${SONGADH_PRIMARY_CODE} not found`);
  }

  console.log(`School: ${school.name} (${school.code || school.udiseCode})`);
  console.log(`id: ${school.id}\n`);

  const catalog = songadhPrimaryMasterSubjects();
  const existing = await prisma.schoolSubject.findMany({
    where: { schoolId: school.id },
  });
  const byCode = new Map(existing.map((s) => [s.code, s]));

  for (const [i, def] of catalog.entries()) {
    const row = byCode.get(def.code);
    const maxMarks = def.type === "grade" ? 0 : def.maxMarks ?? 100;
    if (row) {
      await prisma.schoolSubject.update({
        where: { id: row.id },
        data: {
          name: def.name,
          shortName: def.shortName,
          type: def.type,
          maxMarks,
          sortOrder: i,
          isActive: true,
        },
      });
      console.log(`  update ${def.code}  ${row.name} → ${def.name}  (/${maxMarks})`);
    } else {
      const created = await prisma.schoolSubject.create({
        data: {
          schoolId: school.id,
          name: def.name,
          code: def.code,
          shortName: def.shortName,
          type: def.type,
          maxMarks,
          sortOrder: i,
          isActive: true,
        },
      });
      byCode.set(def.code, created);
      console.log(`  add    ${def.code}  ${def.name}  (/${maxMarks})`);
    }
  }

  const masters = await prisma.schoolSubject.findMany({
    where: { schoolId: school.id },
  });
  const masterByCode = new Map(masters.map((s) => [s.code, s]));

  const years = [
    ...new Set(
      (
        await prisma.schoolClass.findMany({
          where: { schoolId: school.id },
          select: { academicYear: true },
        })
      ).map((c) => c.academicYear),
    ),
  ];
  if (!years.length) years.push(DEFAULT_ACADEMIC_YEAR);

  for (const standard of SONGADH_PRIMARY_STANDARDS) {
    const defs = songadhPrimarySubjectsForStandard(standard);
    if (!defs?.length) continue;
    const ids = defs
      .map((d) => masterByCode.get(d.code)?.id)
      .filter(Boolean) as string[];
    if (ids.length !== defs.length) {
      throw new Error(`Missing master subject for ${standard}`);
    }
    await setStandardSubjects(school.id, standard, "", ids);
    console.log(`\n${standard}: ${defs.map((d) => d.name).join(" · ")}`);

    for (const academicYear of years) {
      let cls = await prisma.schoolClass.findFirst({
        where: {
          schoolId: school.id,
          standard,
          academicYear,
        },
        orderBy: { section: "asc" },
      });

      if (!cls && standard === "Balvatika") {
        cls = await prisma.schoolClass.create({
          data: {
            schoolId: school.id,
            name: "બાલવાટિકા",
            standard: "Balvatika",
            section: "",
            stream: "",
            academicYear,
            institutionName: school.name,
          },
        });
        console.log(`  created class બાલવાટિકા (${academicYear})`);
      }

      const classes = await prisma.schoolClass.findMany({
        where: { schoolId: school.id, standard, academicYear },
        orderBy: { section: "asc" },
      });

      if (!classes.length) {
        console.log(`  no class for ${standard} ${academicYear}`);
        continue;
      }

      const inputs = defs.map((d, i) => ({
        name: d.name,
        code: d.code,
        shortName: d.shortName,
        type: d.type,
        maxMarks: d.maxMarks ?? 100,
        sortOrder: i,
        isActive: true as const,
      }));

      for (const row of classes) {
        await replaceClassSubjects(row.id, school.id, inputs, true);
        console.log(
          `  ${row.name} [${row.academicYear}] → ${inputs.length} subjects, out-of ${inputs[0]?.maxMarks}`,
        );
      }
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
