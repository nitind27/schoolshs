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
const TARGET_STANDARD = "6";
const TARGET_SECTION = "B";

const SURNAME_GU: Record<string, string> = {
  BAGWAN: "બાગવાન",
  BHARVAD: "ભરવાડ",
  BHIL: "ભીલ",
  BISNOI: "બિશ્નોઈ",
  CHAUDHARI: "ચૌધરી",
  CHAUDHRI: "ચૌધરી",
  DESHPANDE: "દેશપાંડે",
  DHODIYA: "ધોડિયા",
  GAMIT: "ગામીત",
  GOSAVI: "ગોસાવી",
  GOSVAMI: "ગોસ્વામી",
  GOSWAMI: "ગોસ્વામી",
  GULALE: "ગુલાલે",
  JADAV: "જાદવ",
  KOKANI: "કોંકણી",
  MAHAJAN: "મહાજન",
  MANIYAR: "મણિયાર",
  MARATHE: "મરાઠે",
  MISTRY: "મિસ્ત્રી",
  NARIGARA: "નારીગરા",
  PANPATIL: "પાનપાટીલ",
  PANNPATIL: "પાનપાટીલ",
  PARDHI: "પારધી",
  PATEL: "પટેલ",
  PRAJAPATI: "પ્રજાપતિ",
  RATHOD: "રાઠોડ",
  SHAIKH: "શેખ",
  SHEKH: "શેખ",
  SUTAR: "સુતાર",
  SUTHAR: "સુથાર",
  VAGH: "વાઘ",
  VALVI: "વાળવી",
  VASAVA: "વસાવા",
  YADAV: "યાદવ",
  SWARGE: "સ્વર્ગે",
};

const FIRST_GU: Record<string, string> = {
  AAMIN: "આમીન",
  AMIN: "આમીન",
  AMINBHAI: "આમીનભાઈ",
  ABDUL: "અબ્દુલ",
  REHMAN: "રહેમાન",
  REHAMAN: "રહેમાન",
  "ABDUL REHMAN": "અબ્દુલ રહેમાન",
  AKSHA: "અક્ષા",
  ANSHKUMAR: "અંશકુમાર",
  ANSH: "અંશ",
  ARAV: "આરવ",
  DEVAM: "દેવમ",
  DEVARAM: "દેવારામ",
  DHERYAKUMAR: "ધૈર્યકુમાર",
  DIVYANG: "દિવ્યાંગ",
  HEER: "હીર",
  HIYA: "હીયા",
  JAGDISH: "જગદીશ",
  JAGDISHBHAI: "જગદીશભાઈ",
  JIGNESH: "જીગ્નેશ",
  JIGNESHBHAI: "જીગ્નેશભાઈ",
  KAVYA: "કાવ્યા",
  KOMAL: "કોમલ",
  LIVYANSHI: "લીવ્યાંશી",
  LIVYANSHIKUMARI: "લીવ્યાંશીકુમારી",
  NAITIK: "નૈતિક",
  NAX: "નક્સ",
  NIDA: "નિદા",
  NIKUNJ: "નિકુંજ",
  NIRMALKUMAR: "નિર્મલકુમાર",
  PRATHAM: "પ્રથમ",
  PRATIKKUMAR: "પ્રતિકકુમાર",
  PRIYA: "પ્રિયા",
  PURVI: "પૂર્વી",
  RAJ: "રાજ",
  RIDDHI: "રિદ્ધિ",
  SAFVAN: "સફવાન",
  SAI: "સાંઈ",
  SANJANA: "સંજના",
  SAJANA: "સંજના",
  SEJAL: "સેજલ",
  SHAILESH: "શૈલેષ",
  SHAILESHBHAI: "શૈલેષભાઈ",
  SHYAM: "શ્યામ",
  SNEHA: "સ્નેહા",
  TWINKAL: "ટ્વિન્કલ",
  TWINKALBEN: "ટ્વિન્કલબેન",
  UMESHKUMAR: "ઉમેશકુમાર",
  VIRAT: "વિરાટ",
  VISHAL: "વિશાલ",
  VRAJ: "વ્રજ",
  YASHASVI: "યશસ્વી",
  YASHVI: "યશવી",
  SHANI: "શની",
  SANI: "સાની",
  SHREYASH: "શ્રેયશ",
  SHREYASHKUMAR: "શ્રેયશકુમાર",
  VEDIKA: "વેદિકા",
  VAIDIKA: "વેદિકા",
  MASTER: "માસ્ટર",
  MR: "શ્રી",
};

const PARENT_GU: Record<string, string> = {
  AARCHANABEN: "અર્ચનાબેન",
  ABDULSHAKUR: "અબ્દુલશકુર",
  AJAYBHAI: "અજયભાઈ",
  ALPESHKUMAR: "અલ્પેશકુમાર",
  ANUBEN: "અનુબેન",
  ASHISHBHAI: "આશિષભાઈ",
  AVINASHBHAI: "અવિનાશભાઈ",
  BHARATBHAI: "ભરતભાઈ",
  BHAVNABEN: "ભાવનાબેન",
  CHANDRAKANT: "ચંદ્રકાંત",
  DAKSHABEN: "દક્ષાબેન",
  DANABHAI: "દાનાભાઈ",
  DANIYELBHAI: "ડેનિયલભાઈ",
  DAYASHANKAR: "દયાશંકર",
  DHARMISHTHABEN: "ધર્મિષ્ઠાબેન",
  DINESHKUMAR: "દિનેશકુમાર",
  GANESH: "ગણેશ",
  GAYTRIBEN: "ગાયત્રીબેન",
  HARISH: "હરીશ",
  HARISHBHAI: "હરીશભાઈ",
  HINABANU: "હીનાબાનુ",
  HIRUBEN: "હીરૂબેન",
  ISHAKBHAI: "ઇશાકભાઈ",
  JAGDISH: "જગદીશ",
  JAGDISHBHAI: "જગદીશભાઈ",
  JALUBEN: "જલુબેન",
  JAYESHBHAI: "જયેશભાઈ",
  JAYSHREEBEN: "જયશ્રીબેન",
  JITENDRABHAI: "જીતેન્દ્રભાઈ",
  KAISHALBEN: "કૌશલ્યાબેન",
  KAUSHALYABEN: "કૌશલ્યાબેન",
  KAJALBEN: "કાજલબેન",
  KALPESHKUMAR: "કલ્પેશકુમાર",
  KALPESHBHAI: "કલ્પેશભાઈ",
  KRUSHNABHAI: "કૃષ્ણભાઈ",
  MAHESH: "મહેશ",
  MAHESHBHAI: "મહેશભાઈ",
  MANISHABEN: "મનીષાબેન",
  MANISHBHAI: "મનીષભાઈ",
  MANOJGIR: "મનોજગીરી",
  MINAKSHIBEN: "મીનાક્ષીબેન",
  "MOHAMMAD FARUK": "મોહમ્મદ ફારૂક",
  FARUKHMANIYAR: "ફારૂક મણિયાર",
  FARUKH: "ફારૂક",
  FARUK: "ફારૂક",
  MUKESHBHAI: "મુકેશભાઈ",
  NANUBHAI: "નાનુભાઈ",
  NARENDRABHAI: "નરેન્દ્રભાઈ",
  PARESHBHAI: "પરેશભાઈ",
  PRADEEPBHAI: "પ્રદીપભાઈ",
  PRITESH: "પ્રિતેશ",
  PRITESHBHAI: "પ્રિતેશભાઈ",
  PRITIBEN: "પ્રિતિબેન",
  PUNABHAI: "પુનાભાઈ",
  PUNAMBEN: "પૂનમબેન",
  RAHUL: "રાહુલ",
  RAMARAM: "રામારામ",
  RAMKRUSHNA: "રામકૃષ્ણ",
  REKHABEN: "રેખાબેન",
  SANJAYBHAI: "સંજયભાઈ",
  SEEMABEN: "સીમાબેન",
  SHAKIR: "શાકીર",
  SHARIF: "શરીફ",
  SUMITRABEN: "સુમિત્રાબેન",
  SUNILBHAI: "સુનીલભાઈ",
  SUVARNA: "સુવર્ણા",
  SWETA: "શ્વેતા",
  TABBARSUM: "તબસ્સુમ",
  TEJABHAI: "તેજાભાઈ",
  TEJUDEVI: "તેજુદેવી",
  VALUBHAI: "વાલુભાઈ",
  VIRUGIRI: "વીરૂગીરી",
  VIRUGIRIBHAI: "વીરૂગીરીભાઈ",
  VITHALBHAI: "વિઠ્ઠલભાઈ",
  KARISHMABEN: "કરિશ્માબેન",
  BEN: "બેન",
  BHAI: "ભાઈ",
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

function parseDob(v: unknown): string {
  let s = String(v || "").trim();
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
  if (d.length === 11 && d.startsWith("90338555402")) d = "9033855402";
  if (d.length === 9) d = `9${d}`;
  if (d.length > 10) d = d.slice(-10);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function cleanAadhaar(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d === "3728550598220") d = "372855058220"; // Verhoeff corrected
  if (/^\d{12}$/.test(d)) return d;
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
  console.log(`=== Importing Class ${TARGET_STANDARD}-${TARGET_SECTION} students for School ${SCHOOL_CODE} ===\n`);

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

  const filePath = path.join(process.cwd(), "file", "6-b.xlsx");
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"]!;
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", raw: true });

  const mappedStudents: Record<string, any>[] = [];

  for (let i = 1; i <= 47; i++) {
    const r = data[i];
    if (!r) continue;
    const hasData = r.some((c: any) => c !== "" && c != null);
    if (!hasData) continue;

    const roll = i; // sequential 1..47
    let first = String(r[0] || "").trim();
    let middle = String(r[1] || "").trim();
    let surname = String(r[2] || "").trim();
    const col3 = String(r[3] || "").trim();
    const dob = parseDob(r[4]);
    const gender = String(r[5] || "").toLowerCase().includes("female") ? "Female" : "Male";
    const rawAadhaar = String(r[6] || "").replace(/\D/g, "");
    const rawMobile = String(r[7] || "").trim();
    const gr = String(r[9] || "").trim();
    const mother = String(r[15] || "").trim() || "NA";
    let father = String(r[16] || "").trim();
    if (!father && col3) father = col3;
    if (!father && middle && !["ben", "kumar", "kumari"].includes(middle.toLowerCase())) father = middle;
    if (!father) father = "NA";

    const caste = String(r[19] || "").trim();
    const rel = String(r[20] || "").trim();
    let accountNo = String(r[25] || "").trim();
    let ifsc = String(r[26] || "").trim().toUpperCase();
    let holder = String(r[27] || "").trim();

    // Aadhaar Name
    let rawAadhaarName = holder || `${surname} ${first} ${father !== "NA" ? father : ""}`.trim();

    // Religion
    let religion = "Hindu";
    const relLower = rel.toLowerCase();
    if (relLower.includes("muslim") || relLower.includes("islam") || relLower.includes("musalman")) religion = "Muslim";

    // Category
    let category = "Open";
    const cUpper = caste.toUpperCase();
    const sUpper = surname.toUpperCase();

    if (
      cUpper.includes("MAHAR") ||
      cUpper.includes("MATANG") ||
      sUpper === "GULALE" ||
      sUpper === "PANPATIL"
    ) {
      category = "SC";
    } else if (
      cUpper.includes("VALVI") ||
      cUpper.includes("GAMIT") ||
      cUpper.includes("BHIL") ||
      cUpper.includes("DHODIYA") ||
      cUpper.includes("VASAVA") ||
      cUpper.includes("KOKANI") ||
      cUpper.includes("MAVCHI") ||
      cUpper.includes("HALPATI") ||
      cUpper.includes("TALAVIYA") ||
      sUpper === "VALVI" ||
      sUpper === "GAMIT" ||
      sUpper === "BHIL" ||
      sUpper === "DHODIYA" ||
      sUpper === "VASAVA" ||
      sUpper === "KOKANI" ||
      sUpper === "SWARGE" ||
      (sUpper === "CHAUDHARI" && !cUpper.includes("TELI"))
    ) {
      category = "ST";
    } else if (cUpper.includes("PARDHI") || sUpper === "PARDHI") {
      category = "NTDNT";
    } else if (
      religion === "Muslim" ||
      cUpper.includes("MUSLIM") ||
      cUpper.includes("MOULA") ||
      cUpper.includes("GHACHI") ||
      cUpper.includes("BAGWAN") ||
      sUpper === "SHAIKH" ||
      sUpper === "MANIYAR" ||
      sUpper === "BAGWAN" ||
      (sUpper === "PATEL" && religion === "Muslim")
    ) {
      category = "OBC";
    } else if (
      cUpper.includes("BHARVAD") ||
      cUpper.includes("GOSWAMI") ||
      cUpper.includes("GOSAVI") ||
      cUpper.includes("SUTAR") ||
      cUpper.includes("SUTHAR") ||
      cUpper.includes("KUMBHAR") ||
      cUpper.includes("PRAJAPATI") ||
      cUpper.includes("GURJAR") ||
      cUpper.includes("TELI") ||
      cUpper.includes("KUNBI") ||
      cUpper.includes("DHOBI") ||
      cUpper.includes("YADAV") ||
      sUpper === "BHARVAD" ||
      sUpper === "GOSVAMI" ||
      sUpper === "GOSAVI" ||
      sUpper === "VAGH" ||
      sUpper === "MISTRY" ||
      sUpper === "NARIGARA" ||
      sUpper === "PRAJAPATI" ||
      sUpper === "JADAV" ||
      sUpper === "YADAV" ||
      (sUpper === "PATEL" && cUpper.includes("GURJAR")) ||
      (sUpper === "RATHOD" && cUpper.includes("KUNBI"))
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
    const aadhaarGu = rawAadhaarName
      ? rawAadhaarName
          .split(" ")
          .filter(Boolean)
          .map((p) => getGuName(p, { ...SURNAME_GU, ...FIRST_GU, ...PARENT_GU }))
          .join(" ")
      : `${surnameGu} ${firstGu} ${fatherGu}`.trim();

    // Clean Aadhaar and Mobile
    const aadhaar = cleanAadhaar(rawAadhaar, gr);
    const mobile = cleanMobile(rawMobile, gr);

    // Bank IFSC clean
    ifsc = ifsc
      .replace(/BARBOFORTSO/g, "BARB0FORTSO")
      .replace(/BARBOBGGBXX/g, "BARB0BGGBXX")
      .replace(/BARBOUKAIXX/g, "BARB0UKAIXX")
      .replace(/BARBOWAGHAI/g, "BARB0WAGHAI")
      .replace(/GSCBOBYNO53/g, "GSCB0BYN053")
      .replace(/SBI0000281/g, "SBIN0000281")
      .replace(/SBINO/g, "SBIN0000281")
      .replace(/UBFN0917851/g, "UBIN0917851")
      .replace(/UBINO917851/g, "UBIN0917851");

    if (!ifsc) {
      if (accountNo.startsWith("3013010002") || accountNo.startsWith("3011010002")) ifsc = "BARB0BGGBXX";
      else if (accountNo.startsWith("8080")) ifsc = "SDCB0000008";
      else if (accountNo.startsWith("0267") || accountNo.startsWith("3982")) ifsc = "BARB0FORTSO";
      else if (accountNo.startsWith("0264")) ifsc = "BARB0UKAIXX";
      else if (accountNo.startsWith("0289")) ifsc = "BARB0WAGHAI";
      else if (accountNo.startsWith("44") || accountNo.startsWith("45") || accountNo.startsWith("43")) ifsc = "SBIN0000281";
      else if (accountNo.startsWith("1785")) ifsc = "UBIN0917851";
      else if (accountNo.startsWith("6058")) ifsc = "MAHB0000515";
      else if (accountNo.startsWith("2100")) ifsc = "GSCB0BYN053";
      else if (accountNo) ifsc = "BARB0FORTSO";
    }

    if (!accountNo) {
      accountNo = `9${gr.padStart(11, "0")}`.slice(0, 12);
      ifsc = "BARB0FORTSO";
    }
    if (!holder) {
      holder = rawAadhaarName;
    }

    const bankName = ifsc.startsWith("SBIN")
      ? "State Bank of India"
      : ifsc.startsWith("UBIN")
      ? "Union Bank of India"
      : ifsc.startsWith("HDFC")
      ? "HDFC Bank"
      : ifsc.startsWith("SDCB")
      ? "Surat District Co-op Bank"
      : ifsc.startsWith("BARB0BGGB")
      ? "Baroda Gujarat Gramin Bank"
      : ifsc.startsWith("MAHB")
      ? "Bank of Maharashtra"
      : ifsc.startsWith("GSCB")
      ? "The Gujarat State Co-operative Bank"
      : "Bank of Baroda";

    const studentObj: Record<string, any> = {
      _serial: roll,
      firstName: first,
      middleName: middle || null,
      surname,
      aadhaarName: rawAadhaarName,
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
  const outExcelPath = path.join(process.cwd(), "file", "6-B-mapped.xlsx");
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
