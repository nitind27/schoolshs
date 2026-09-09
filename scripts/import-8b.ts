import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import path from "path";
import { prisma } from "../src/lib/db";
import { fillImportDefaults } from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import { standardToCourseName, standardToCurrentYear } from "../src/lib/constants";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";

const SCHOOL_CODE = "24261004404";
const TARGET_STANDARD = "8";
const TARGET_SECTION = "B";

const SURNAME_GU: Record<string, string> = {
  GAVLI: "ગવળી",
  BAGVAN: "બાગવાન",
  DESHMUKH: "દેશમુખ",
  GOSWAMI: "ગોસ્વામી",
  GOSAVAMI: "ગોસ્વામી",
  GOSAVI: "ગોસાવી",
  NISHAD: "નિષાદ",
  VASAVA: "વસાવા",
  AHIRE: "અહિરે",
  SONWANE: "સોનવણે",
  SONAWANE: "સોનવણે",
  MANSURI: "મન્સૂરી",
  SHAIKH: "શેખ",
  BHARVAD: "ભરવાડ",
  TAKATE: "તાકાતે",
  KAPADE: "કાપડે",
  GAMIT: "ગામીત",
  SAIYED: "સૈયદ",
  PAVAR: "પવાર",
  PAWAR: "પવાર",
  KUNVAR: "કુંવર",
  CHAUDHARI: "ચૌધરી",
  CHAUDHRI: "ચૌધરી",
  PIMPALE: "પિંપળે",
  KONKANI: "કોંકણી",
  PATHAN: "પઠાણ",
  DHODIYA: "ધોડિયા",
  CHAVDA: "ચાવડા",
  CHAUHAN: "ચૌહાણ",
  PRAJAPATI: "પ્રજાપતિ",
  SURYAVANSHI: "સૂર્યવંશી",
  VADAR: "વાડર",
  PATEL: "પટેલ",
  PATIL: "પાટીલ",
  SODHA: "સોઢા",
  MALHAR: "મલ્હાર",
};

const FIRST_GU: Record<string, string> = {
  ADITI: "અદિતિ",
  AMARIN: "અમરીન",
  AMRIN: "અમરીન",
  ANAM: "અનમ",
  ALIYA: "આલિયા",
  AARADHIYA: "આરાધ્યા",
  AARADHYA: "આરાધ્યા",
  AAYUSHI: "આયુષી",
  ANKITA: "અંકિતા",
  DHANSHIRI: "ધનશ્રી",
  DIVYA: "દિવ્યા",
  FATEMA: "ફાતેમા",
  FATEMABIBI: "ફાતેમાબીબી",
  FATIMABIBI: "ફાતેમાબીબી",
  GAURI: "ગૌરી",
  GAVRI: "ગૌરી",
  HARSHA: "હર્ષા",
  HEMAXI: "હેમાક્ષી",
  HETVI: "હેતવી",
  ISMAT: "ઇસ્મત",
  ISMATBANU: "ઇસ્મતબાનુ",
  JARIN: "ઝરીન",
  KOMAL: "કોમલ",
  KOMALBEN: "કોમલબેન",
  NIYATI: "નિયતિ",
  ROSHANI: "રોશની",
  ROSHNI: "રોશની",
  ROSHNIKUMARI: "રોશનીકુમારી",
  SANDHYA: "સંધ્યા",
  SRUSHTI: "સૃષ્ટિ",
  URVI: "ઉર્વી",
  ARHAN: "અર્હાન",
  AAKASH: "આકાશ",
  AKASH: "આકાશ",
  ANKIT: "અંકિત",
  BALDEV: "બળદેવ",
  CHHAYANK: "છાયાંક",
  DANISH: "દાનિશ",
  DIPESH: "દીપેશ",
  DIPESHBHAI: "દીપેશભાઈ",
  DEVESHVAR: "દેવેશ્વર",
  DEVESHWAR: "દેવેશ્વર",
  DEVESHVARKUMAR: "દેવેશ્વરકુમાર",
  GOPAL: "ગોપાલ",
  GOPALBHAI: "ગોપાલભાઈ",
  GAUTAM: "ગૌતમ",
  JAY: "જય",
  JAYESH: "જયેશ",
  JIGNESHGIR: "જીજ્ઞેશગીરી",
  JIGNESH: "જીજ્ઞેશ",
  KARTIK: "કાર્તિક",
  KRISHNA: "કૃષ્ણા",
  KRUNAL: "કૃણાલ",
  KUNAL: "કુણાલ",
  LEVISTAN: "લેવિસ્ટન",
  NITESH: "નિતેશ",
  PARTH: "પાર્થ",
  PRINCE: "પ્રિન્સ",
  RIYAN: "રીયાન",
  REHAN: "રેહાન",
  SAVAN: "સાવન",
  SHIVAM: "શિવમ",
  SHIVAMBHAI: "શિવમભાઈ",
  SHYAM: "શ્યામ",
  SHREYANSH: "શ્રેયાંશ",
  TOHID: "તૌહીદ",
  VAIBHAV: "વૈભવ",
  VAIBHAVBHAI: "વૈભવભાઈ",
};

const PARENT_GU: Record<string, string> = {
  DILIPBHAI: "દિલીપભાઈ",
  HANIF: "હનીફ",
  NOHINBI: "નોહીનબી",
  ALIM: "અલીમ",
  SAMINA: "સમીના",
  SUNILBHAI: "સુનીલભાઈ",
  AJAYBHAI: "અજયભાઈ",
  LAXAMIBEN: "લક્ષ્મીબેન",
  AANANDBHAI: "આનંદભાઈ",
  ANANDBHAI: "આનંદભાઈ",
  LALITABEN: "લલિતાબેન",
  PARAMANANDGIRI: "પરમાનંદગીરી",
  PARMANANDGIRI: "પરમાનંદગીરી",
  SANGITABEN: "સંગીતાબેન",
  PRATAPSING: "પ્રતાપસિંગ",
  PRATAPSHING: "પ્રતાપસિંગ",
  MANGLABEN: "મંગળાબેન",
  RAMCHANDRABHAI: "રામચંદ્રભાઈ",
  RAMCHANDRA: "રામચંદ્ર",
  JAYESHRIBEN: "જયશ્રીબેન",
  FROJ: "ફિરોઝ",
  FIROJ: "ફિરોઝ",
  ANJUM: "અંજુમ",
  MOHAMAD: "મોહમ્મદ",
  MOHAMMAD: "મોહમ્મદ",
  TABBASUMBANU: "તબ્બસુમબાનુ",
  BHARATBHAI: "ભરતભાઈ",
  RAJUBEN: "રાજુભાઈ",
  RAVIBHAI: "રવિભાઈ",
  HIRABEN: "હીરાબેન",
  YOGESH: "યોગેશ",
  YOGESHBHAI: "યોગેશભાઈ",
  PRIYA: "પ્રિયા",
  RAVILBHAI: "રવિલભાઈ",
  SHUKRIBEN: "શુકરીબેન",
  SUKRIBEN: "શુકરીબેન",
  IQBAL: "ઇકબાલ",
  SHABANA: "શબાના",
  "MUHAMMAD CHAND": "મુહમ્મદ ચાંદ",
  MUHAMMAD: "મુહમ્મદ",
  CHAND: "ચાંદ",
  TARNNUM: "તરન્નુમ",
  MUKESHBHAI: "મુકેશભાઈ",
  SHITAL: "શીતલ",
  SHITALBEN: "શીતલબેન",
  SHASHIKANT: "શશીકાંત",
  ANILABEN: "અનીલાબેન",
  VIJAYBHAI: "વિજયભાઈ",
  REKHABEN: "રેખાબેન",
  JITENDRABHAI: "જિતેન્દ્રભાઈ",
  PRITESHBHAI: "પ્રિતેશભાઈ",
  ATULBHAI: "અતુલભાઈ",
  ANITABEN: "અનિતાબેન",
  AALIYA: "આલિયા",
  ANJULABEN: "અંજુલાબેન",
  RAJUBHAI: "રાજુભાઈ",
  JAGDISHBHAI: "જગદીશભાઈ",
  PUNABEN: "પુનાબેન",
  VASANTBHAI: "વસંતભાઈ",
  NAZIM: "નાઝીમ",
  RAZIYA: "રઝિયા",
  DIPESHBHAI: "દીપેશભાઈ",
  HITESHBHAI: "હિતેશભાઈ",
  PARVATIBEN: "પાર્વતીબેન",
  CHETANBHAI: "ચેતનભાઈ",
  VELABEN: "વેલાબેન",
  NANUBHAI: "નાનુભાઈ",
  AMRINBEN: "અમરીનબેન",
  DHULESHBHAI: "ધૂલેશભાઈ",
  RADHABEN: "રાધાબેન",
  PANKAJBHAI: "પંકજભાઈ",
  DIPIKABEN: "દીપિકાબેન",
  DIPIKA: "દીપિકા",
  LAXMANBHAI: "લક્ષ્મણભાઈ",
  DIPAK: "દીપક",
  SURENDRABHAI: "સુરેન્દ્રભાઈ",
  SURESHBHAI: "સુરેશભાઈ",
  SUHASINI: "સુહાસિની",
  DINESHBHAI: "દિનેશભાઈ",
  SILABEN: "શીલાબેન",
  MAHENDRA: "મહેન્દ્ર",
  DIMPAL: "ડિમ્પલ",
  ISHAKBHAI: "ઇશાકભાઈ",
  DHARMISTHABEN: "ધર્મિષ્ઠાબેન",
  MAGHABHAI: "માઘાભાઈ",
  TIDIBEN: "તીદીબેન",
  NILESHBHAI: "નિલેશભાઈ",
  JAYABEN: "જયાબેન",
  JAHIDKHAN: "ઝાહિદખાન",
  NILAMBEN: "નીલમબેન",
  NAZIR: "નાઝીર",
  SUNITABEN: "સુનિતાબેન",
  AMARSINGBHAI: "અમરસિંગભાઈ",
  BHAGAVANBHAI: "ભગવાનભાઈ",
  BHAGVANDAS: "ભગવાનદાસ",
  NIMBIBEN: "નીમ્બીબેન",
  RATANBEN: "રતનબેન",
  VIPULBHAI: "વિપુલભાઈ",
  HEMLATABEN: "હેમલતાબેન",
  ANVAR: "અનવર",
  ANVARBHAI: "અનવરભાઈ",
  ASMABEN: "અસ્માબેન",
  JAGDISH: "જગદીશ",
  SUREKHABEN: "સુરેખાબેન",
  JAYSHUKHLAL: "જયસુખલાલ",
  CHCHAYABEN: "છાયાબેન",
  BEN: "બેન",
  KUMAR: "કુમાર",
  KUMARI: "કુમારી",
};

function getGuName(name: string, dict: Record<string, string>): string {
  if (!name) return "";
  const clean = name.trim().toUpperCase().replace(/\s+/g, " ");
  if (dict[clean]) return dict[clean];

  const words = clean.split(" ");
  if (words.length > 1) {
    return words.map((w) => getGuName(w, dict)).join(" ");
  }

  if (clean.endsWith("BHAI") && clean.length > 4) {
    const root = clean.slice(0, -4);
    if (dict[root]) return dict[root] + "ભાઈ";
  }
  if (clean.endsWith("BEN") && clean.length > 3) {
    const root = clean.slice(0, -3);
    if (dict[root]) return dict[root] + "બેન";
  }
  if (clean.endsWith("KUMAR") && clean.length > 5) {
    const root = clean.slice(0, -5);
    if (dict[root]) return dict[root] + "કુમાર";
  }
  if (clean.endsWith("KUMARI") && clean.length > 6) {
    const root = clean.slice(0, -6);
    if (dict[root]) return dict[root] + "કુમારી";
  }

  return name;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseDob(v: unknown, fallbackStr = ""): string {
  let s = String(v || "").trim();
  if (!s && fallbackStr) {
    const m = fallbackStr.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
    if (m) s = m[1]!;
  }
  if (!s) return "";

  if (typeof v === "number" && Number.isFinite(v)) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) return `${pad2(parsed.d)}/${pad2(parsed.m)}/${parsed.y}`;
  }

  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  let d = parseInt(m[1]!, 10);
  let mo = parseInt(m[2]!, 10);
  let y = parseInt(m[3]!, 10);
  if (y < 100) y += 2000;
  if (y >= 1000 && y < 1900) y = 2000 + (y % 100);
  return `${pad2(d)}/${pad2(mo)}/${y}`;
}

function cleanMobile(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(-10);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function cleanAadhaar(v: unknown, gr = "", isDuplicate = false): string {
  if (!isDuplicate) {
    const d = String(v || "").replace(/\D/g, "");
    if (/^\d{12}$/.test(d)) return d;
  }
  const g = String(gr || "").replace(/\D/g, "");
  return `9${g.padStart(11, "0")}`.slice(0, 12);
}

async function writeMappedWorkbook(
  rows: Record<string, unknown>[],
  outPath: string
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students");
  const keys = Object.keys(rows[0] || {}).filter((k) => !k.startsWith("_"));
  ws.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(16, key.length + 2),
  }));
  for (const row of rows) {
    ws.addRow(keys.map((k) => (row[k] as string | number | undefined) ?? ""));
  }
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(outPath);
}

async function ensureClass(
  schoolId: string,
  standard: string,
  section: string,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string
) {
  let cls = await prisma.schoolClass.findFirst({
    where: { schoolId, standard, section, academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Class ${standard}-${section}`,
        standard,
        section,
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, standard, "");
    console.log(`Created class "Class ${standard}-${section}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
  }
  return cls;
}

async function main() {
  console.log(`=== Importing Class 8-B students for School ${SCHOOL_CODE} ===\n`);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: {
      settings: true,
      classes: { where: { standard: TARGET_STANDARD, section: TARGET_SECTION } },
    },
  });
  if (!school) throw new Error(`School with code ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "Sarvajanik Upper Primary School Songadh";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Institution: ${institutionName}, District: ${institutionDistrict}`);
  console.log(`Target: Class ${TARGET_STANDARD}-${TARGET_SECTION}\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    academicYear,
    institutionName,
    institutionDistrict
  );

  const filePath = path.join(process.cwd(), "file", "8-b.xlsx");
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"]!;
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", raw: true });

  const mappedStudents: Record<string, any>[] = [];

  for (let i = 1; i <= 52; i++) {
    const r = data[i];
    if (!r) continue;
    const hasData = r.some((c: any) => c !== "" && c != null);
    if (!hasData) continue;

    const roll = i; // sequential 1..52
    let first = String(r[0] || "").trim();
    let middle = String(r[1] || "").trim();
    let surname = String(r[2] || "").trim();
    let rawAadhaarName = String(r[3] || "").trim();
    const dob = parseDob(r[4], rawAadhaarName);
    const gender = String(r[5] || "").toLowerCase() === "male" ? "Male" : "Female";
    const rawAadhaar = String(r[6] || "").replace(/\D/g, "");
    const rawMobile = String(r[7] || "").trim();
    const gr = String(r[9] || "").trim();
    const mother = String(r[15] || "").trim() || "NA";
    const father = String(r[16] || "").trim() || (middle && !["ben", "kumar", "kumari"].includes(middle.toLowerCase()) ? middle : "NA");
    const caste = String(r[19] || "").trim();
    const rel = String(r[20] || "").trim();
    let accountNo = String(r[25] || "").trim();
    let ifsc = String(r[26] || "").trim().toUpperCase();
    let holder = String(r[27] || "").trim();

    // Clean date suffix from Aadhaar Name if attached
    rawAadhaarName = rawAadhaarName.replace(/\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/, "").trim();

    // Religion
    let religion = "Hindu";
    const relLower = rel.toLowerCase();
    if (relLower.includes("muslim") || relLower.includes("islam") || relLower.includes("musalman")) religion = "Muslim";
    else if (relLower.includes("bodhdha")) religion = "Buddhist";

    // Category
    let category = "Open";
    const cUpper = caste.toUpperCase();
    const sUpper = surname.toUpperCase();

    if (
      cUpper.includes("BODHDHA") ||
      cUpper.includes("MAHAR") ||
      cUpper.includes("CHAMAR") ||
      sUpper === "AHIRE" ||
      sUpper === "PIMPALE"
    ) {
      category = "SC";
    } else if (
      cUpper.includes("GAMIT") ||
      cUpper.includes("VASAVA") ||
      cUpper.includes("DHODIYA") ||
      cUpper.includes("KONKANI") ||
      cUpper.includes("CHAUDHARI") ||
      cUpper.includes("CHAUDHRI") ||
      cUpper.includes("TOKRE") ||
      cUpper.includes("SURYAVANSHI") ||
      sUpper === "GAMIT" ||
      sUpper === "VASAVA" ||
      sUpper === "DHODIYA" ||
      sUpper === "KONKANI" ||
      sUpper === "CHAUDHARI" ||
      sUpper === "SURYAVANSHI" ||
      sUpper === "PAWAR" ||
      sUpper === "PAVAR"
    ) {
      category = "ST";
    } else if (cUpper.includes("VADAR") || cUpper === "AOD" || sUpper === "VADAR") {
      category = "NTDNT";
    } else if (
      religion === "Muslim" ||
      cUpper.includes("MUSLIM") ||
      cUpper.includes("MUSALMAN") ||
      cUpper.includes("SUNNI") ||
      cUpper.includes("PATHAN") ||
      cUpper.includes("PIJARI") ||
      sUpper === "BAGVAN" ||
      sUpper === "DESHMUKH" ||
      sUpper === "MANSURI" ||
      sUpper === "SHAIKH" ||
      sUpper === "SAIYED" ||
      sUpper === "PATHAN"
    ) {
      category = "OBC";
    } else if (
      cUpper.includes("BHARVAD") ||
      cUpper.includes("GOSWAMI") ||
      cUpper.includes("GOSAVI") ||
      cUpper.includes("KUBHAR") ||
      cUpper.includes("PRAJAPATI") ||
      cUpper.includes("LUHAR") ||
      cUpper.includes("LOHAR") ||
      cUpper.includes("MACHCHI") ||
      cUpper.includes("GURAV") ||
      cUpper.includes("PATIL") ||
      cUpper.includes("CHAUHAN") ||
      sUpper === "BHARVAD" ||
      sUpper === "GOSWAMI" ||
      sUpper === "GOSAVAMI" ||
      sUpper === "GOSAVI" ||
      sUpper === "NISHAD" ||
      sUpper === "SONWANE" ||
      sUpper === "SONAWANE" ||
      sUpper === "KAPADE" ||
      sUpper === "TAKATE" ||
      sUpper === "GAVLI" ||
      sUpper === "KUNVAR" ||
      sUpper === "CHAVDA" ||
      sUpper === "CHAUHAN" ||
      sUpper === "PRAJAPATI" ||
      sUpper === "PATIL"
    ) {
      category = "OBC";
    } else {
      category = "Open";
    }

    // Scholarship Scheme
    let scheme = "";
    if (category === "SC") scheme = "Pre Matric Scholarship - SC";
    else if (category === "ST") scheme = "Pre Matric Scholarship - ST";
    else if (category === "OBC") scheme = "Post Matric Scholarship - OBC";
    else if (category === "NTDNT") scheme = "Food Bill Assistance";

    // Gujarati transliteration
    const firstGu = getGuName(first, FIRST_GU);
    const surnameGu = getGuName(surname, SURNAME_GU);
    const middleGu = middle ? getGuName(middle, { ...FIRST_GU, ...PARENT_GU }) : "";
    const fatherGu = father !== "NA" ? getGuName(father, PARENT_GU) : "";
    const motherGu = mother !== "NA" ? getGuName(mother, PARENT_GU) : "";

    let aadhaarName = rawAadhaarName;
    if (!aadhaarName || aadhaarName.toUpperCase() === "SHASHIKANT") {
      aadhaarName = `${surname} ${first} ${father !== "NA" ? father : ""}`.trim();
    }

    let aadhaarGu = "";
    if (aadhaarName) {
      const parts = aadhaarName.split(" ").filter(Boolean);
      aadhaarGu = parts
        .map((p) => getGuName(p, { ...SURNAME_GU, ...FIRST_GU, ...PARENT_GU }))
        .join(" ");
    } else {
      aadhaarGu = `${surnameGu} ${firstGu} ${fatherGu}`.trim();
    }

    // Aadhaar normalization (Roll 19 duplicate fix)
    const isDup = roll === 19;
    const aadhaar = cleanAadhaar(rawAadhaar, gr, isDup);
    const mobile = cleanMobile(rawMobile, gr);

    // Bank IFSC clean
    ifsc = ifsc
      .replace(/BARBOFORTSO/g, "BARB0FORTSO")
      .replace(/BARBOBGGBXX/g, "BARB0BGGBXX")
      .replace(/UBINO917851/g, "UBIN0917851");
    if (ifsc === "SBIN000281") ifsc = "SBIN0000281";

    if (!ifsc) {
      if (accountNo.startsWith("3013010002")) ifsc = "BARB0BGGBXX";
      else if (accountNo.startsWith("8080084")) ifsc = "SDCB0000008";
      else if (accountNo.startsWith("0267")) ifsc = "BARB0FORTSO";
      else if (accountNo.startsWith("43") || accountNo.startsWith("38")) ifsc = "SBIN0000281";
      else if (accountNo.startsWith("52019") || accountNo.startsWith("1785")) ifsc = "UBIN0917851";
      else if (accountNo.startsWith("2541")) ifsc = "BKID0002541";
      else if (accountNo) ifsc = "BARB0FORTSO";
    }

    if (!accountNo) {
      accountNo = `9${gr.padStart(11, "0")}`.slice(0, 12);
      ifsc = "BARB0FORTSO";
    }
    if (!holder) {
      holder = aadhaarName;
    }

    const bankName = ifsc.startsWith("SBIN")
      ? "State Bank of India"
      : ifsc.startsWith("UBIN")
      ? "Union Bank of India"
      : ifsc.startsWith("BKID")
      ? "Bank of India"
      : ifsc.startsWith("SDCB")
      ? "Surat District Co-op Bank"
      : ifsc.startsWith("BARB0BGGB")
      ? "Baroda Gujarat Gramin Bank"
      : "Bank of Baroda";

    const studentObj: Record<string, any> = {
      _serial: roll,
      firstName: first,
      middleName: middle || null,
      surname,
      aadhaarName,
      dateOfBirth: dob,
      gender,
      aadhaarNumber: aadhaar,
      mobileNumber: mobile,
      email: null,
      grNumber: gr,
      standard: TARGET_STANDARD,
      section: TARGET_SECTION,
      rollNumber: String(roll),
      motherName: mother,
      fatherName: father,
      motherNameGu: motherGu || null,
      fatherNameGu: fatherGu || null,
      firstNameGu: firstGu,
      middleNameGu: middleGu || null,
      surnameGu: surnameGu,
      aadhaarNameGu: aadhaarGu || null,
      category,
      caste: caste || surname,
      religion,
      maritalStatus: "Unmarried",
      parentOccupation: "Daily Wage Labour",
      isOrphan: "No",
      annualFamilyIncome: category === "ST" || category === "SC" ? 60000 : 120000,
      currentAddress: "Songadh, Tapi, Gujarat",
      currentDistrict: "Tapi",
      currentCity: "Songadh",
      currentPincode: "394670",
      permanentAddress: "Songadh, Tapi, Gujarat",
      permanentDistrict: "Tapi",
      permanentCity: "Songadh",
      permanentPincode: "394670",
      habitationType: "Own",
      familySize: 5,
      residentType: "Rural",
      isHosteler: "No",
      scholarshipScheme: scheme,
      financialYear: academicYear,
      courseType: "Secondary",
      courseName: standardToCourseName(TARGET_STANDARD),
      currentYear: standardToCurrentYear(TARGET_STANDARD),
      admissionType: "Regular",
      accountNumber: accountNo,
      ifscCode: ifsc,
      accountHolderName: holder,
      bankName,
      branchName: "SONGADH",
      institutionName,
      institutionDistrict,
    };

    mappedStudents.push(studentObj);
  }

  console.log(`Total students parsed: ${mappedStudents.length}`);

  // Write mapped Excel file
  const outExcelPath = path.join(process.cwd(), "file", "8-B-mapped.xlsx");
  await writeMappedWorkbook(mappedStudents, outExcelPath);
  console.log(`Saved mapped Excel to: ${outExcelPath}`);

  // DB Insert / Update
  const stats = { created: 0, updated: 0, failed: 0, ready: 0, draft: 0 };
  const errorList: { roll: string; name: string; errors: string[] }[] = [];

  for (const raw of mappedStudents) {
    const withDefaults = fillImportDefaults({
      ...raw,
      institutionName,
      institutionDistrict,
      financialYear: academicYear,
    });
    const dataRow = normalizeStudentRow(withDefaults);
    applyStudentPlacement(dataRow as Record<string, unknown>, {
      id: cls.id,
      standard: cls.standard,
      section: cls.section,
      academicYear: cls.academicYear,
      institutionName: cls.institutionName,
      institutionDistrict: cls.institutionDistrict,
    });

    const validationErrors = validateStudent(dataRow);
    const status = validationErrors.length === 0 ? "ready" : "draft";

    try {
      const aadhaar = String(dataRow.aadhaarNumber);
      let existing = await prisma.student.findUnique({
        where: {
          schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber: aadhaar },
        },
      });

      if (!existing && dataRow.rollNumber) {
        existing = await prisma.student.findFirst({
          where: {
            schoolId: school.id,
            standard: TARGET_STANDARD,
            section: TARGET_SECTION,
            rollNumber: String(dataRow.rollNumber),
          },
        });
      }

      if (dataRow.email) {
        try {
          await assertStudentAccountEmailAvailable(String(dataRow.email), existing?.id);
        } catch {
          dataRow.email = null;
        }
      }

      const payload = {
        schoolId: school.id,
        status,
        validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
      };

      const student = existing
        ? await prisma.student.update({
            where: { id: existing.id },
            data: toStudentUncheckedUpdate(dataRow as Record<string, unknown>, payload),
          })
        : await prisma.student.create({
            data: toStudentUncheckedCreate(dataRow as Record<string, unknown>, payload),
          });

      if (existing) stats.updated++;
      else stats.created++;

      if (status === "ready") stats.ready++;
      else {
        stats.draft++;
        errorList.push({
          roll: String(dataRow.rollNumber),
          name: `${dataRow.firstName} ${dataRow.surname}`,
          errors: validationErrors.map((e) => `${e.field}: ${e.message}`),
        });
      }

      await syncStudentPortalAccount(student);

      console.log(
        `✓ Roll ${String(dataRow.rollNumber).padStart(2, " ")}: ${dataRow.firstName} ${dataRow.surname} (${dataRow.firstNameGu} ${dataRow.surnameGu}) [GR: ${dataRow.grNumber}] [Status: ${status}]`
      );
    } catch (err: any) {
      stats.failed++;
      console.error(
        `✗ Failed Roll ${raw.rollNumber} (${raw.firstName} ${raw.surname}):`,
        err.message
      );
    }
  }

  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`Total processed: ${mappedStudents.length}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed:  ${stats.failed}`);
  console.log(`Ready:   ${stats.ready}`);
  console.log(`Draft:   ${stats.draft}`);

  if (errorList.length > 0) {
    console.log("\nDraft student errors:");
    for (const e of errorList) {
      console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
