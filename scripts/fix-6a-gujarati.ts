/**
 * Fix Gujarati names for Class 6-A (24261004404) using curated dictionary.
 * Run: npx tsx scripts/fix-6a-gujarati.ts
 */
import { prisma } from "../src/lib/db";
import {
  studentFullNameEn,
  studentFullNameGu,
  studentListName,
} from "../src/lib/student-names";

const SCHOOL_CODE = "24261004404";

const GU: Record<string, string> = {
  // First names
  AADI: "આદિ",
  AARUSHI: "આરુષિ",
  ADITI: "આદિતિ",
  AKSHAY: "અક્ષય",
  ANKITA: "અંકિતા",
  ARAV: "આરવ",
  BHAVIN: "ભાવિન",
  DAX: "દક્ષ",
  DRASHTI: "દ્રષ્ટિ",
  EKTA: "એકતા",
  GOPAL: "ગોપાલ",
  HANI: "હાની",
  HARSHKUMAR: "હર્ષકુમાર",
  HIRAL: "હિરલ",
  JASVINDARSING: "જસવિંદરસિંગ",
  JEFHRINKUMAR: "જેફ્રીનકુમાર",
  JENIL: "જેનિલ",
  KINJAL: "કિંજલ",
  KUNAL: "કુનાલ",
  LOKESH: "લોકેશ",
  MAHEK: "મહેક",
  MEET: "મીટ",
  MIT: "મિત",
  MOHIT: "મોહિત",
  MUKHBITAH: "મુખબિતાહ",
  NILESH: "નિલેશ",
  PAREE: "પારી",
  PAVAN: "પવન",
  PRASHANT: "પ્રશાંત",
  PRIYAL: "પ્રિયલ",
  PRIYANSHI: "પ્રિયાંશી",
  PUSHPA: "પુષ્પા",
  RAM: "રામ",
  REENA: "રીના",
  RIYA: "રિયા",
  RUDRA: "રુદ્ર",
  SANJA: "સંજા",
  SANTOSH: "સંતોષ",
  SHRADDHA: "શ્રદ્ધા",
  SHREYANSH: "શ્રેયાંશ",
  SHIV: "શિવ",
  SUNDAR: "સુંદર",
  VANSHKUMAR: "વંશકુમાર",
  VIDHYESH: "વિધ્યેશ",
  VIKRAM: "વિક્રમ",
  VISHAL: "વિશાલ",
  YUNESH: "યુનેશ",

  // Middles / fathers
  AFZAL: "અફઝલ",
  AJAYBHAI: "અજયભાઈ",
  ANILBHAI: "અનિલભાઈ",
  ARJUNBHAI: "અર્જુનભાઈ",
  ARVIND: "અરવિંદ",
  BABLUBHAI: "બાબુલુભાઈ",
  BHOLABHAI: "ભોલાભાઈ",
  BUDABHAI: "બુદાભાઈ",
  DANABHAI: "દાનાભાઈ",
  DOLATBHAI: "દોલતભાઈ",
  GANESH: "ગણેશ",
  GANESHBHAI: "ગણેશભાઈ",
  HITESHKUMAR: "હિતેશકુમાર",
  JAYPRAKASH: "જયપ્રકાશ",
  JETHABHAI: "જેઠાભાઈ",
  JITUBHAI: "જીતુભાઈ",
  JIVANBHAI: "જીવનભાઈ",
  JOSEFBHAI: "જોસેફભાઈ",
  KISANBHAI: "કિસનભાઈ",
  MAHENDRABHAI: "મહેન્દ્રભાઈ",
  MAHESHBHAI: "મહેશભાઈ",
  MANJESH: "મન્જેશ",
  MANJIBHAI: "મનજીભાઈ",
  MONAJBHAI: "મનોજભાઈ",
  NARENDRABHAI: "નરેન્દ્રભાઈ",
  NARAYAN: "નારાયણ",
  NITINBHAI: "નિતિનભાઈ",
  PINTUBHAI: "પિંટુભાઈ",
  PRABHATSINH: "પ્રભાતસિંહ",
  RAHUL: "રાહુલ",
  RAJUBHAI: "રાજુભાઈ",
  RAMSINGBHAI: "રામસિંગભાઈ",
  RANABHAI: "રાનાભાઈ",
  RAVANBHAI: "રાવણભાઈ",
  RAVIBHAI: "રવિભાઈ",
  RAKESH: "રાકેશ",
  SANJAY: "સંજય",
  SANJAYBHAI: "સંજયભાઈ",
  SANTOSHBHAI: "સંતોષભાઈ",
  SUKNTAR: "સુખંતર",
  SUNILBHAI: "સુનીલભાઈ",
  UMESHBHAI: "ઉમેશભાઈ",
  VIKAS: "વિકાસ",
  "VIKAS KUMAR": "વિકાસ કુમાર",
  VITTHALBHAI: "વિઠ્ઠલભાઈ",
  YOGESHBHAI: "યોગેશભાઈ",
  KUMAR: "કુમાર",

  // Mothers
  ASHWINI: "અશ્વિની",
  CHANDABEN: "ચંદાબેન",
  DIMPAL: "દિમ્પલ",
  GEETABEN: "ગીતાબેન",
  HEMUBEN: "હેમુબેન",
  JALUBEN: "જલુબેન",
  JAYA: "જયા",
  JYOTIBEN: "જ્યોતિબેન",
  KALIBEN: "કાળીબેન",
  KARUNABEN: "કરુણાબેન",
  KAVITABEN: "કવિતાબેન",
  KIRANBEN: "કિરણબેન",
  KOMALBEN: "કોમલબેન",
  LAXMIBEN: "લક્ષ્મીબેન",
  MANISHABEN: "મનીષાબેન",
  MANJULABEN: "મંજુલાબેન",
  MANGLABEN: "મંગલાબેન",
  NAGMABEN: "નાગમાબેન",
  NAYNABEN: "નયનાબેન",
  NILAMBEN: "નીલમબેન",
  NITABEN: "નીતાબેન",
  NITUBEN: "નીતુબેન",
  PRIYANKABEN: "પ્રિયંકાબેન",
  PUNAM: "પૂનમ",
  PUNAMBEN: "પૂનમબેન",
  RAHIMA: "રહીમા",
  RAJKAMALBAI: "રાજકમલબાઈ",
  RANJANA: "રંજના",
  RAVITA: "રવિતા",
  REKHABEN: "રેખાબેન",
  RITABEN: "રીતાબેન",
  RUPALI: "રુપાલી",
  RYABEN: "રયાબેન",
  SANGITABEN: "સંગીતાબેન",
  SHARDABEN: "શારદાબેન",
  SONALBEN: "સોનલબેન",
  SUMITRABEN: "સુમિત્રાબેન",
  SUNITABEN: "સુનીતાબેન",
  ARUNABEN: "અરુણાબેન",

  // Surnames
  AAHIRE: "આહિરે",
  BHARVAD: "ભરવાડ",
  CHAUDHARI: "ચૌધરી",
  DHODIYA: "ધોડિયા",
  DIVAKAR: "દિવાકર",
  GAMIT: "ગામીત",
  GIRI: "ગિરી",
  GOD: "ગોડ",
  HAVELIWALA: "હવેલીવાલા",
  KHAIRNAR: "ખૈરનાર",
  KOKANI: "કોંકણી",
  KONKANI: "કોંકણી",
  MALLAH: "મલ્લાહ",
  MOHITE: "મોહિતે",
  PATIL: "પાટીલ",
  PAVAR: "પવાર",
  PRAJAPATI: "પ્રજાપતિ",
  SANDHU: "સંધુ",
  SHINDHE: "શિંધે",
  SOLANKI: "સોલંકી",
  SONAWANE: "સોનવાને",
  SONVANE: "સોનવાને",
  SONI: "સોની",
  SUTHAR: "સુથાર",
  UMARVAISHYA: "ઉમરવૈશ્ય",
  VISHWAKARMA: "વિશ્વકર્મા",

  // Common parts
  BHAI: "ભાઈ",
  BEN: "બેન",
};

function getGu(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || clean === "—") return "";
  const key = clean.toUpperCase();
  if (GU[key]) return GU[key];

  const words = clean.split(" ");
  if (words.length > 1) {
    return words.map((w) => getGu(w)).join(" ");
  }

  // suffix split
  const u = key;
  if (u.endsWith("BHAI") && u.length > 4) {
    const root = u.slice(0, -4);
    if (GU[root]) return GU[root] + "ભાઈ";
    if (GU[root + "BHAI"]) return GU[root + "BHAI"];
  }
  if (u.endsWith("BEN") && u.length > 3) {
    const root = u.slice(0, -3);
    if (GU[root]) return GU[root] + "બેન";
  }
  if (u.endsWith("KUMAR") && u.length > 5) {
    const root = u.slice(0, -5);
    if (GU[root]) return GU[root] + "કુમાર";
  }

  // last resort: keep English (better than broken mixed script)
  return clean;
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
  });
  if (!school) throw new Error("School not found");

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      standard: "6",
      section: "A",
      status: { not: "archived" },
    },
    orderBy: { rollNumber: "asc" },
  });

  console.log(`Fixing Gujarati for ${students.length} Class 6-A students\n`);

  for (const s of students) {
    const firstNameGu = getGu(s.firstName);
    const middleNameGu = s.middleName ? getGu(s.middleName) : null;
    const surnameGu = getGu(s.surname);
    const fatherNameGu = getGu(s.fatherName);
    const motherNameGu =
      s.motherName && s.motherName !== "—" ? getGu(s.motherName) : null;
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
        motherNameGu,
        aadhaarNameGu,
      },
    });

    console.log(
      `Roll ${String(s.rollNumber).padStart(2, " ")}: ${studentFullNameEn(updated)} → ${studentListName(updated)}`,
    );
  }

  // count check vs mapped expectation
  const count = await prisma.student.count({
    where: {
      schoolId: school.id,
      standard: "6",
      section: "A",
      status: { not: "archived" },
    },
  });
  console.log(`\nClass 6-A total: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
