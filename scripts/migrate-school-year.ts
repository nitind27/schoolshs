/**
 * Move a school's data from one academic year to another.
 *
 *   npx tsx scripts/migrate-school-year.ts <udise|code> [from=2025-26] [to=2026-27]          (dry run)
 *   npx tsx scripts/migrate-school-year.ts <udise|code> [from=2025-26] [to=2026-27] --apply  (write)
 *
 * Only rows whose year equals <from> are changed. Changed row ids are written to
 * tmp/year-migration-<code>-<timestamp>.json so the move can be reverted.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const CODE = args[0];
const FROM = args[1] || "2025-26";
const TO = args[2] || "2026-27";

if (!CODE) {
  console.error("Usage: npx tsx scripts/migrate-school-year.ts <udise|code> [from] [to] [--apply]");
  process.exit(1);
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ udiseCode: CODE }, { code: CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School ${CODE} not found`);
  const schoolId = school.id;

  console.log(`School: ${school.name} (${CODE})  settings.academicYear=${school.settings?.academicYear ?? "-"}`);
  console.log(`Move ${FROM} -> ${TO}  mode=${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const ids = {
    schoolClass: (await prisma.schoolClass.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    student: (await prisma.student.findMany({ where: { schoolId, financialYear: FROM }, select: { id: true } })).map((r) => r.id),
    generalRegisterEntry: (await prisma.generalRegisterEntry.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    exam: (await prisma.exam.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    reportCard: (await prisma.reportCard.findMany({ where: { student: { schoolId }, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    timetableEntry: (await prisma.timetableEntry.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    schoolTimetableConfig: (await prisma.schoolTimetableConfig.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    classTimetableRelease: (await prisma.classTimetableRelease.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    dailyAttendanceBook: (await prisma.dailyAttendanceBook.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    holiday: (await prisma.holiday.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    activity: (await prisma.activity.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
    idCardShareLink: (await prisma.idCardShareLink.findMany({ where: { schoolId, academicYear: FROM }, select: { id: true } })).map((r) => r.id),
  };

  for (const [table, list] of Object.entries(ids)) console.log(`  ${table.padEnd(24)} ${list.length}`);

  // Unique-key conflicts with rows already in the target year
  const conflicts: string[] = [];

  const fromClasses = await prisma.schoolClass.findMany({ where: { schoolId, academicYear: FROM } });
  const toClasses = await prisma.schoolClass.findMany({ where: { schoolId, academicYear: TO } });
  const classKey = (c: { standard: string; section: string; stream: string | null }) => `${c.standard}|${c.section}|${c.stream ?? ""}`;
  const toClassKeys = new Set(toClasses.map(classKey));
  for (const c of fromClasses) if (toClassKeys.has(classKey(c))) conflicts.push(`class ${c.standard}-${c.section} already exists in ${TO}`);

  const fromGr = await prisma.generalRegisterEntry.findMany({ where: { schoolId, academicYear: FROM }, select: { grNumber: true } });
  const toGr = new Set((await prisma.generalRegisterEntry.findMany({ where: { schoolId, academicYear: TO }, select: { grNumber: true } })).map((g) => g.grNumber));
  for (const g of fromGr) if (toGr.has(g.grNumber)) conflicts.push(`GR ${g.grNumber} already exists in ${TO}`);

  const toTtConfig = await prisma.schoolTimetableConfig.findFirst({ where: { schoolId, academicYear: TO } });
  if (toTtConfig && ids.schoolTimetableConfig.length) {
    console.log(`  (timetable config already exists in ${TO}; keeping it, ${FROM} config left as is)`);
    ids.schoolTimetableConfig = [];
  }

  const fromReleases = await prisma.classTimetableRelease.findMany({ where: { schoolId, academicYear: FROM }, select: { classId: true } });
  const toReleases = new Set((await prisma.classTimetableRelease.findMany({ where: { schoolId, academicYear: TO }, select: { classId: true } })).map((r) => r.classId));
  for (const r of fromReleases) if (toReleases.has(r.classId)) conflicts.push(`timetable release for class ${r.classId} already exists in ${TO}`);

  const fromBooks = await prisma.dailyAttendanceBook.findMany({ where: { schoolId, academicYear: FROM }, select: { dateIso: true } });
  const toBooks = new Set((await prisma.dailyAttendanceBook.findMany({ where: { schoolId, academicYear: TO }, select: { dateIso: true } })).map((b) => b.dateIso));
  for (const b of fromBooks) if (toBooks.has(b.dateIso)) conflicts.push(`daily attendance book ${b.dateIso} already exists in ${TO}`);

  const fromTt = await prisma.timetableEntry.findMany({ where: { schoolId, academicYear: FROM }, select: { classId: true, dayOfWeek: true, periodIndex: true } });
  const toTt = new Set((await prisma.timetableEntry.findMany({ where: { schoolId, academicYear: TO }, select: { classId: true, dayOfWeek: true, periodIndex: true } })).map((t) => `${t.classId}|${t.dayOfWeek}|${t.periodIndex}`));
  for (const t of fromTt) if (toTt.has(`${t.classId}|${t.dayOfWeek}|${t.periodIndex}`)) conflicts.push(`timetable slot ${t.classId} d${t.dayOfWeek} p${t.periodIndex} already exists in ${TO}`);

  if (conflicts.length) {
    console.log(`\n${conflicts.length} conflict(s):`);
    conflicts.slice(0, 30).forEach((c) => console.log("  - " + c));
    console.log("\nResolve these before applying.");
    process.exitCode = 2;
    return;
  }
  console.log("\nNo unique-key conflicts.");

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write changes.");
    return;
  }

  const backupDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `year-migration-${CODE}-${Date.now()}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify({ schoolId, code: CODE, from: FROM, to: TO, previousSettingsYear: school.settings?.academicYear ?? null, ids }, null, 2),
  );
  console.log(`Backup of changed ids: ${backupFile}`);

  const exams = await prisma.exam.findMany({ where: { id: { in: ids.exam } }, select: { id: true, name: true } });

  await prisma.$transaction(
    async (tx) => {
      await tx.schoolClass.updateMany({ where: { id: { in: ids.schoolClass } }, data: { academicYear: TO } });
      await tx.student.updateMany({ where: { id: { in: ids.student } }, data: { financialYear: TO } });
      await tx.generalRegisterEntry.updateMany({ where: { id: { in: ids.generalRegisterEntry } }, data: { academicYear: TO } });
      for (const ex of exams) {
        await tx.exam.update({ where: { id: ex.id }, data: { academicYear: TO, name: ex.name.split(FROM).join(TO) } });
      }
      await tx.reportCard.updateMany({ where: { id: { in: ids.reportCard } }, data: { academicYear: TO } });
      await tx.timetableEntry.updateMany({ where: { id: { in: ids.timetableEntry } }, data: { academicYear: TO } });
      await tx.schoolTimetableConfig.updateMany({ where: { id: { in: ids.schoolTimetableConfig } }, data: { academicYear: TO } });
      await tx.classTimetableRelease.updateMany({ where: { id: { in: ids.classTimetableRelease } }, data: { academicYear: TO } });
      await tx.dailyAttendanceBook.updateMany({ where: { id: { in: ids.dailyAttendanceBook } }, data: { academicYear: TO } });
      await tx.holiday.updateMany({ where: { id: { in: ids.holiday } }, data: { academicYear: TO } });
      await tx.activity.updateMany({ where: { id: { in: ids.activity } }, data: { academicYear: TO } });
      await tx.idCardShareLink.updateMany({ where: { id: { in: ids.idCardShareLink } }, data: { academicYear: TO } });
      if (school.settings) {
        await tx.schoolSettings.update({ where: { id: school.settings.id }, data: { academicYear: TO } });
      }
    },
    { timeout: 120_000 },
  );

  console.log("\nApplied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
