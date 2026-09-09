import { prisma } from "../src/lib/db";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";

async function main() {
  const school = await prisma.school.findFirst({ where: { code: "24261004404" } });
  if (!school) throw new Error("school not found");

  const empty = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      standard: { in: ["6", "7", "8"] },
      status: { not: "archived" },
      OR: [{ middleName: null }, { middleName: "" }],
    },
    select: {
      id: true,
      grNumber: true,
      firstName: true,
      fatherName: true,
      fatherNameGu: true,
      standard: true,
      section: true,
      aadhaarName: true,
    },
  });
  console.log("emptyMiddle", empty.length, JSON.stringify(empty, null, 2));

  for (const s of empty) {
    if (!s.fatherName || s.fatherName === "—") continue;
    const middleNameGu =
      s.fatherNameGu || transliterateToGujarati(s.fatherName) || null;
    await prisma.student.update({
      where: { id: s.id },
      data: { middleName: s.fatherName, middleNameGu },
    });
    console.log("fixed", s.standard + "-" + s.section, s.grNumber, s.firstName, "->", s.fatherName);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
