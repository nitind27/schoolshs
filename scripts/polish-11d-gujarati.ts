/**
 * Polish common 11-D Gujarati surnames/suffixes after transliteration.
 */
import { prisma } from "../src/lib/db";
import { isGujaratiScript } from "../src/lib/gujarati/gujarati-script";
import {
  studentFullNameEn,
  studentListName,
} from "../src/lib/student-names";

const SCHOOL_CODE = "24261004405";

const WORD_GU: Record<string, string> = {
  GAMIT: "ગામીત",
  VASAVA: "વસાવા",
  VASAVE: "વસાવે",
  CHAUDHARI: "ચૌધરી",
  CHAUHAN: "ચૌહાણ",
  BHARVAD: "ભરવાડ",
  PATIL: "પાટીલ",
  THAKOR: "ઠાકોર",
  PRADHAN: "પ્રધાન",
  SHAIKH: "શેખ",
  WAGH: "વાઘ",
  RATHOD: "રાઠોડ",
  GOSAVI: "ગોસાવી",
  MORE: "મોરે",
  NAIK: "નાયક",
  BHOI: "ભોઈ",
  SHINDE: "શિંદે",
  DEVRE: "દેવરે",
  KEDAR: "કેદાર",
  DHIVARE: "ધિવરે",
  SHIHORA: "શિહોરા",
  KOTVALIYA: "કોતવાળિયા",
  BHAI: "ભાઈ",
  BEN: "બેન",
  KUMAR: "કુમાર",
  KUMARI: "કુમારી",
};

function polishWord(en: string, gu: string | null | undefined): string {
  const key = en.trim().toUpperCase();
  if (WORD_GU[key]) return WORD_GU[key];

  if (key.endsWith("BHAI") && key.length > 4) {
    const root = key.slice(0, -4);
    const rootGu = WORD_GU[root];
    // keep existing gu stem if already Gujarati, else use en translit leftover
    if (rootGu) return rootGu + "ભાઈ";
    const g = (gu || "").replace(/ભાી$|ભાઈ$|ભાઇ$/u, "");
    if (g && isGujaratiScript(g)) return g + "ભાઈ";
  }
  if (key.endsWith("BEN") && key.length > 3) {
    const root = key.slice(0, -3);
    if (WORD_GU[root]) return WORD_GU[root] + "બેન";
    const g = (gu || "").replace(/બેન$/u, "");
    if (g && isGujaratiScript(g)) return g + "બેન";
  }
  if (key.endsWith("KUMARI") && key.length > 6) {
    const root = key.slice(0, -6);
    if (WORD_GU[root]) return WORD_GU[root] + "કુમારી";
    const g = (gu || "").replace(/કુમારી$/u, "");
    if (g && isGujaratiScript(g)) return g + "કુમારી";
  }
  if (key.endsWith("KUMAR") && key.length > 5) {
    const root = key.slice(0, -5);
    if (WORD_GU[root]) return WORD_GU[root] + "કુમાર";
    const g = (gu || "").replace(/કુમાર$/u, "");
    if (g && isGujaratiScript(g)) return g + "કુમાર";
  }

  if (gu && isGujaratiScript(gu)) {
    return gu
      .replace(/ભાી/gu, "ભાઈ")
      .replace(/ભાઇ/gu, "ભાઈ");
  }
  return gu || en;
}

async function main() {
  const school = await prisma.school.findFirst({ where: { code: SCHOOL_CODE } });
  if (!school) throw new Error("school missing");

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      standard: "11",
      section: "D",
      status: { not: "archived" },
    },
    orderBy: { rollNumber: "asc" },
  });

  for (const s of students) {
    const firstNameGu = polishWord(s.firstName, s.firstNameGu);
    const middleNameGu = s.middleName
      ? polishWord(s.middleName, s.middleNameGu)
      : null;
    const surnameGu = polishWord(s.surname, s.surnameGu);
    const fatherNameGu = s.fatherName
      ? polishWord(s.fatherName, s.fatherNameGu)
      : middleNameGu;
    const aadhaarNameGu = [firstNameGu, middleNameGu, surnameGu]
      .filter(Boolean)
      .join(" ");

    const updated = await prisma.student.update({
      where: { id: s.id },
      data: {
        firstNameGu,
        middleNameGu,
        surnameGu,
        fatherNameGu,
        aadhaarNameGu,
      },
    });
    console.log(
      `R${String(s.rollNumber).padStart(2, " ")}: ${studentListName(updated)}`,
    );
  }
  console.log(`\nDone: ${students.length} students`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
