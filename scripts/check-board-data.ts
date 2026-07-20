import { prisma } from "../src/lib/db";

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, code: true, name: true } });
  console.log("=== SCHOOLS ===", schools);

  for (const s of schools) {
    const all = await prisma.student.findMany({
      where: { schoolId: s.id },
      select: {
        id: true, firstName: true, surname: true, standard: true, section: true,
        grNumber: true, childUid: true, rollNumber: true,
        board10th: true, percentage10th: true, year10th: true,
        board12th: true, percentage12th: true, year12th: true,
        notes: true, createdAt: true, marksheet10Path: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\n=== ${s.code} (${s.name}) — ${all.length} students ===`);
    const std10 = all.filter((x) => x.standard === "10");
    const dummy = std10.filter((x) => x.notes?.includes("SSC GSEB"));
    const real10 = std10.filter((x) => !x.notes?.includes("SSC GSEB"));
    console.log(`Std 10: ${std10.length} (dummy: ${dummy.length}, other: ${real10.length})`);

    const withPct = all.filter((x) => x.percentage10th > 0);
    console.log(`With percentage10th > 0: ${withPct.length}`);
    withPct.slice(0, 10).forEach((x) => {
      console.log(`  ${x.standard}-${x.section} | ${x.firstName} ${x.surname} | GR:${x.grNumber} | UID:${x.childUid} | ${x.percentage10th}% | year:${x.year10th} | notes:${x.notes?.slice(0,40)}`);
    });

    const withGr = all.filter((x) => x.grNumber && x.grNumber !== "6604" && x.grNumber !== "6605");
    console.log(`With GR (non-seed): ${withGr.length}`);
    withGr.slice(0, 15).forEach((x) => {
      console.log(`  ${x.standard}-${x.section} | ${x.firstName} ${x.surname} | GR:${x.grNumber} | pct:${x.percentage10th}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
