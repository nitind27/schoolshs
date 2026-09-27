/**
 * Fix 11-D Gujarati: if GU field lacks Gujarati script, transliterate from English.
 * Run: npx tsx scripts/fix-11d-gujarati.ts
 */
import { prisma } from "../src/lib/db";
import { isGujaratiScript } from "../src/lib/gujarati/gujarati-script";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";
import {
  studentFullNameEn,
  studentListName,
} from "../src/lib/student-names";

const SCHOOL_CODE = "24261004405";

function guOf(en: string | null | undefined, gu: string | null | undefined): string | null {
  const g = (gu || "").trim();
  if (g && isGujaratiScript(g)) return g;
  const e = (en || "").trim();
  if (!e || e === "—") return null;
  const t = transliterateToGujarati(e);
  return t || null;
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
  });
  if (!school) throw new Error("school not found");

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      standard: "11",
      section: "D",
      status: { not: "archived" },
    },
    orderBy: { rollNumber: "asc" },
  });

  console.log(`Fixing Gujarati for ${students.length} Class 11-D students\n`);

  for (const s of students) {
    const firstNameGu = guOf(s.firstName, s.firstNameGu);
    const middleNameGu = guOf(s.middleName, s.middleNameGu);
    const surnameGu = guOf(s.surname, s.surnameGu);
    const fatherNameGu = guOf(s.fatherName, s.fatherNameGu) || middleNameGu;
    const motherNameGu = guOf(
      s.motherName !== "—" ? s.motherName : null,
      s.motherNameGu,
    );
    const aadhaarNameGu =
      guOf(s.aadhaarName, s.aadhaarNameGu) ||
      [firstNameGu, middleNameGu, surnameGu].filter(Boolean).join(" ") ||
      null;

    const updated = await prisma.student.update({
      where: { id: s.id },
      data: {
        firstNameGu,
        middleNameGu,
        surnameGu,
        fatherNameGu,
        motherNameGu,
        aadhaarNameGu,
        aadhaarName:
          [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ") ||
          s.aadhaarName,
      },
    });

    console.log(
      `R${String(s.rollNumber).padStart(2, " ")}: ${studentFullNameEn(updated)} → ${studentListName(updated)}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
