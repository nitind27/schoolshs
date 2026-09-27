/**
 * Normalize any Gujarati digits in student GR / roll / seat / UID fields to English.
 * Run: npx tsx scripts/normalize-latin-digits.ts
 */
import { prisma } from "../src/lib/db";
import { toLatinDigits } from "../src/lib/digits";

const FIELDS = [
  "rollNumber",
  "grNumber",
  "standard",
  "childUid",
  "apaarId",
  "penNumber",
  "sscSeatNumber",
  "hscSeatNumber",
  "dateOfBirth",
] as const;

function needsFix(value: string | null | undefined): boolean {
  return Boolean(value && /[૦-૯]/.test(value));
}

async function main() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      rollNumber: true,
      grNumber: true,
      standard: true,
      childUid: true,
      apaarId: true,
      penNumber: true,
      sscSeatNumber: true,
      hscSeatNumber: true,
      dateOfBirth: true,
    },
  });

  let updated = 0;
  for (const s of students) {
    const data: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = s[f];
      if (needsFix(v)) data[f] = toLatinDigits(v);
    }
    if (!Object.keys(data).length) continue;
    await prisma.student.update({ where: { id: s.id }, data });
    updated++;
  }
  console.log(`Students scanned: ${students.length}, updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
