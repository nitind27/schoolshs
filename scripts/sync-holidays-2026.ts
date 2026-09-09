import { prisma } from "../src/lib/db";
import { getPublicHolidays } from "../src/lib/holidays/public-holidays";

const SCHOOL_CODE = "24261004405";
const YEAR = 2026;

function ayFor(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return m! >= 4 ? `${y}-${String(y! + 1).slice(2)}` : `${y! - 1}-${String(y!).slice(2)}`;
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found`);

  const existing = await prisma.holiday.findMany({
    where: {
      schoolId: school.id,
      date: { gte: `${YEAR}-01-01`, lte: `${YEAR}-12-31` },
    },
    orderBy: { date: "asc" },
  });
  console.log(`Existing 2026 holidays: ${existing.length}`);
  for (const h of existing) console.log("  OLD", h.date, h.name);

  if (existing.length) {
    const del = await prisma.holiday.deleteMany({
      where: {
        schoolId: school.id,
        date: { gte: `${YEAR}-01-01`, lte: `${YEAR}-12-31` },
      },
    });
    console.log(`Deleted ${del.count} old 2026 rows`);
  }

  const catalog = getPublicHolidays(YEAR);
  for (const h of catalog) {
    await prisma.holiday.create({
      data: {
        schoolId: school.id,
        date: h.date,
        name: h.name,
        nameGu: h.nameGu,
        type: h.type,
        academicYear: ayFor(h.date),
        description: "Gujarat Gazette / GSHSEB 2026",
      },
    });
  }

  console.log(`\nInserted ${catalog.length} corrected 2026 holidays:`);
  for (const h of catalog) console.log(`  ${h.date}  ${h.name}  (${h.type})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
