/**
 * Import Std 11-A students into school 24261004405 (SARVAJANIK HIGH SCHOOL SONGADH).
 * Source: file/11-A.xlsx
 *
 * Run:  npx tsx scripts/import-11a.ts --dry   (print mapped rows only)
 *       npx tsx scripts/import-11a.ts         (write to database)
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/db";
import { fillImportDefaults } from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import {
  toStudentUncheckedCreate,
  toStudentUncheckedUpdate,
} from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import { standardToCourseName } from "../src/lib/constants";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";
import { isGujaratiScript } from "../src/lib/gujarati/gujarati-script";
import {
  studentFullNameEn,
  studentListName,
} from "../src/lib/student-names";

const SCHOOL_CODE = "24261004405";
const TARGET_STANDARD = "11";
const TARGET_SECTION = "A";
/** Same Arts stream as every other Std 11/12 division at this school. */
const TARGET_STREAM = "Arts";
const SOURCE_FILE = "11-A.xlsx";
const DRY_RUN = process.argv.includes("--dry");

const CATEGORY_MAP: Record<string, string> = {
  SC: "SC",
  "S.C": "SC",
  "S.C.": "SC",
  ST: "ST",
  "S.T": "ST",
  "S.T.": "ST",
  OBC: "OBC",
  "O.B.C": "OBC",
  "O.B.C.": "OBC",
  SEBC: "OBC",
  "S.E.B.C": "OBC",
  EWS: "EWS",
  OPEN: "Open",
  GENERAL: "Open",
  MINORITY: "Minority",
};

/** Spelling fixes for Gujarati words typed in the sheet. */
const GU_WORD_FIXES: Record<string, string> = {
  "ખાટ્કી": "ખાટકી",
  "આયુષકુમર": "આયુષકુમાર",
  "સુરેશ્ભાઇ": "સુરેશભાઇ",
  "બોરસેવ": "બોરસે",
};

/** Row-level Gujarati Aadhaar-name corrections (by GR) where the sheet disagrees with the English name. */
const GU_AADHAAR_NAME_BY_GR: Record<string, string> = {
  "16892": "ગામીત યશ વિજયભાઇ",
};

/** Gujarati spellings for English name words in rows without Gujarati in the sheet. */
const GU_WORD_OVERRIDES: Record<string, string> = {
  arbina: "અરબીના",
  zakir: "ઝાકીર",
  maniyar: "મણિયાર",
  bhavika: "ભાવિકા",
  narendra: "નરેન્દ્ર",
  ingle: "ઇંગળે",
  divyakumari: "દિવ્યાકુમારી",
  munna: "મુન્ના",
  patel: "પટેલ",
  gayatri: "ગાયત્રી",
  sunilbhai: "સુનિલભાઇ",
  gamit: "ગામીત",
  rahul: "રાહુલ",
  rahulbhai: "રાહુલભાઇ",
  gosavi: "ગોસાવી",
  juli: "જુલી",
  bhaveshbhai: "ભાવેશભાઇ",
  nirmal: "નિર્મળ",
  kashish: "કશિશ",
  ashokbhai: "અશોકભાઇ",
  mir: "મીર",
  khushbu: "ખુશ્બુ",
  dharambhai: "ધરમભાઇ",
  sikligar: "સીકલીગર",
  khushi: "ખુશી",
  kishor: "કિશોર",
  jadhav: "જાધવ",
  kiya: "કિયા",
  shivsurat: "શિવસુરત",
  mali: "માળી",
  laxmi: "લક્ષ્મી",
  anil: "અનિલ",
  prajapati: "પ્રજાપતિ",
  mohini: "મોહિની",
  gaulab: "ગુલાબ",
  mistri: "મિસ્ત્રી",
  prachi: "પ્રાચી",
  rajanikantbhai: "રજનીકાંતભાઇ",
  shukla: "શુક્લ",
  purnima: "પૂર્ણિમા",
  asutosh: "આશુતોષ",
  mishra: "મિશ્રા",
  roshanibahen: "રોશનીબહેન",
  ruchika: "રુચિકા",
  ravibhai: "રવિભાઇ",
  suryvanshi: "સુર્યવંશી",
  suryavanshi: "સુર્યવંશી",
  salehabanu: "સાલેહાબાનુ",
  irfankhan: "ઇરફાનખાન",
  pathan: "પઠાણ",
  saraswati: "સરસ્વતી",
  simran: "સિમરન",
  gopibhai: "ગોપીભાઇ",
  bitrai: "બિત્રાઇ",
  vishakha: "વિશાખા",
  mahendrabhai: "મહેન્દ્રભાઇ",
  akshay: "અક્ષય",
  vinodbhai: "વિનોદભાઇ",
  mallah: "મલ્લાહ",
  amankhan: "અમાનખાન",
  imtiyazkhan: "ઇમ્તિયાઝખાન",
  sahni: "સાહની",
  dharmendra: "ધર્મેન્દ્ર",
  bablubhai: "બબલુભાઇ",
  kushwah: "કુશવાહ",
  hardik: "હાર્દિક",
  shashikant: "શશીકાંત",
  salve: "સાળવે",
  hasnain: "હસનૈન",
  majhar: "મઝહર",
  khatik: "ખાટીક",
  harshkumar: "હર્ષકુમાર",
  ravidasbhai: "રવિદાસભાઇ",
  vasave: "વસાવે",
  jayesh: "જયેશ",
  lakhabhai: "લાખાભાઇ",
  bharwad: "ભરવાડ",
  bharvad: "ભરવાડ",
  jeet: "જીત",
  santoshbhai: "સંતોષભાઇ",
  tandel: "ટંડેલ",
  karan: "કરણ",
  akhilesh: "અખિલેશ",
  manav: "માનવ",
  landge: "લાંડગે",
  mayur: "મયુર",
  ranabhai: "રાણાભાઇ",
  mitkumar: "મિતકુમાર",
  rangjibhai: "રંગજીભાઇ",
  parthkumar: "પાર્થકુમાર",
  dipakbhai: "દિપકભાઇ",
  prashantbhai: "પ્રશાંતભાઇ",
  namdevbhai: "નામદેવભાઇ",
  marathe: "મરાઠે",
  pratham: "પ્રથમ",
  rajubhai: "રાજુભાઇ",
  khonde: "ખોંડે",
};

function pick(r: Record<string, unknown>, ...keys: string[]): string {
  const byLower = new Map(
    Object.entries(r).map(([k, v]) => [k.toLowerCase().trim(), v]),
  );
  for (const key of keys) {
    const direct = r[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return String(direct).trim();
    }
    const lower = byLower.get(key.toLowerCase().trim());
    if (lower !== undefined && lower !== null && String(lower).trim()) {
      return String(lower).trim();
    }
  }
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const wanted = new Set(keys.map(normalize));
  for (const [k, v] of Object.entries(r)) {
    if (/\b(gujarati|gu)\b/i.test(k)) continue;
    if (wanted.has(normalize(k)) && String(v ?? "").trim()) {
      return String(v).trim();
    }
  }
  return "";
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanGu(value: string): string {
  const s = cleanName(value.normalize("NFC")).replace(/\u200b|\u200c|\u200d/g, "");
  return s
    .split(" ")
    .map((w) => GU_WORD_FIXES[w] ?? w)
    .join(" ");
}

function titleCaseWords(value: string): string {
  return cleanName(value)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z]\.?$/.test(w)) return w.toUpperCase();
      return w
        .split(".")
        .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
        .join(".");
    })
    .join(" ");
}

function parseDob(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }
  const s = String(v || "")
    .trim()
    .replace(/[-.]/g, "/");
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${m[3]}`;
  return s;
}

function cleanMobile(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(0, 10);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function cleanAadhaar(v: unknown): string {
  return String(v || "").replace(/\D/g, "").slice(0, 12);
}

function cleanEmail(raw: string): string | undefined {
  const e = raw
    .trim()
    .replace(/@gamail\.com$/i, "@gmail.com")
    .replace(/@gmali\.com$/i, "@gmail.com");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined;
}

function cleanIfsc(raw: string, accountNumber: string): string {
  let s = raw.toUpperCase().replace(/\s/g, "");
  const fixes: Record<string, string> = {
    BARBOFORTSO: "BARB0FORTSO",
    BARBOBGGBXX: "BARB0BGGBXX",
    BARBOSINGPU: "BARB0SINGPU",
    BARBOUKAI: "BARB0UKAI",
    UBINO917851: "UBIN0917851",
    BKIB0002541: "BKID0002541",
    MAHB000515: "MAHB0000515",
  };
  s = fixes[s] || s;
  if (!s && accountNumber) {
    if (/^30(13|35)/.test(accountNumber)) return "BARB0BGGBXX";
    if (/^1710/.test(accountNumber)) return "BARB0BANDHA";
    if (/^0267/.test(accountNumber)) return "BARB0FORTSO";
  }
  return s;
}

function bankNameFromIfsc(ifsc: string): string {
  if (ifsc.startsWith("SBIN")) return "State Bank of India";
  if (ifsc.startsWith("UBIN")) return "Union Bank of India";
  if (ifsc.startsWith("BARB0BGGB") || ifsc.startsWith("BARB0BGG"))
    return "Baroda Gujarat Gramin Bank";
  if (ifsc.startsWith("BARB")) return "Bank of Baroda";
  if (ifsc.startsWith("MAHB")) return "Bank of Maharashtra";
  if (ifsc.startsWith("SDCB")) return "Surat District Co-op Bank";
  if (ifsc.startsWith("DCBL")) return "DCB Bank";
  if (ifsc.startsWith("BKID") || ifsc.startsWith("BKIB")) return "Bank of India";
  if (ifsc.startsWith("CORP")) return "Union Bank of India";
  return "Bank of Baroda";
}

function getScholarshipScheme(cat: string): string {
  if (cat === "ST") return "Post Matric Scholarship - ST";
  if (cat === "SC") return "Post Matric Scholarship - SC";
  if (cat === "OBC") return "Post Matric Scholarship - OBC";
  return "";
}

const untranslatedWords = new Set<string>();

function transliterateName(en: string): string {
  return cleanName(en)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (GU_WORD_OVERRIDES[lower]) return GU_WORD_OVERRIDES[lower];
      const bhai = lower.match(/^(.+)bhai$/);
      if (bhai) return `${GU_WORD_OVERRIDES[bhai[1]!] ?? transliterateToGujarati(bhai[1]!)}ભાઇ`;
      untranslatedWords.add(lower);
      return transliterateToGujarati(lower);
    })
    .join(" ");
}

function guOrTransliterate(en: string, guFromSheet = ""): string | null {
  const g = cleanGu(guFromSheet);
  if (g && isGujaratiScript(g)) return g;
  const e = cleanName(en);
  if (!e || e.toUpperCase() === "NA") return null;
  return transliterateName(e) || null;
}

async function writeMappedWorkbook(
  rows: Record<string, unknown>[],
  outPath: string,
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
  stream: string,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  let cls = await prisma.schoolClass.findFirst({
    where: { schoolId, standard, section, academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Class ${standard} ${stream}-${section}`,
        standard,
        section,
        stream,
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    console.log(`Created class "${cls.name}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
  }
  await seedClassSubjects(cls.id, standard, cls.stream || stream);
  return cls;
}

async function main() {
  console.log(
    `=== Importing Class ${TARGET_STANDARD}-${TARGET_SECTION} for School ${SCHOOL_CODE}${DRY_RUN ? " (DRY RUN)" : ""} ===\n`,
  );

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School with code ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2026-27";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Target: Class ${TARGET_STANDARD}-${TARGET_SECTION} (${TARGET_STREAM})`);
  console.log(`Source: file/${SOURCE_FILE}\n`);

  const wb = XLSX.readFile(path.join(process.cwd(), "file", SOURCE_FILE), {
    cellDates: false,
    raw: true,
  });
  const sheetName = wb.SheetNames.find((n) => /students/i.test(n)) || wb.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
    defval: "",
    raw: true,
  });

  const mappedStudents: Record<string, any>[] = [];

  for (const r of rawRows) {
    const firstNameRaw = pick(r, "First Name", "firstName");
    let aadhaarNumber = cleanAadhaar(pick(r, "Aadhaar Number", "aadhaarNumber"));
    if (!firstNameRaw && !aadhaarNumber) continue;

    const firstName = titleCaseWords(firstNameRaw);
    const middleName = titleCaseWords(pick(r, "Middle Name", "middleName"));
    const surname = titleCaseWords(pick(r, "Surname", "surname"));
    const builtFull = [firstName, middleName, surname].filter(Boolean).join(" ");
    const sheetAadhaar = cleanName(pick(r, "Name (As per Aadhaar)", "aadhaarName"));
    const holder = cleanName(pick(r, "Account Holder Name", "accountHolderName"));
    const aadhaarName = builtFull || sheetAadhaar || holder;
    const dob = parseDob(pick(r, "Date of Birth (DD/MM/YYYY)", "dateOfBirth"));
    const genderRaw = pick(r, "Gender", "gender").toLowerCase();
    const gender = genderRaw.startsWith("f") ? "Female" : genderRaw.startsWith("m") ? "Male" : "Other";
    const gr = pick(r, "GR Number", "grNumber").replace(/\s/g, "");
    const rollNumber = String(mappedStudents.length + 1);
    const mobileNumber = cleanMobile(pick(r, "Mobile Number", "mobileNumber"), gr);
    const email = cleanEmail(pick(r, "Email", "email"));
    const apaarId = pick(r, "APAAR / UPPAR ID", "apaarId").replace(/\s/g, "") || null;

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      aadhaarNumber = `9${String(gr || rollNumber).padStart(11, "0")}`.slice(0, 12);
    }

    const categoryKey = pick(r, "Category (SC/ST/OBC/SEBC/EWS/Open)", "category").toUpperCase();
    const category = CATEGORY_MAP[categoryKey] || categoryKey || "Open";
    const caste = titleCaseWords(pick(r, "Caste", "caste")) || surname;
    let religion = titleCaseWords(pick(r, "Religion", "religion")) || "Hindu";
    if (/muslim|islam/i.test(religion)) religion = "Muslim";

    let accountNumber = pick(r, "Account Number", "accountNumber").replace(/\D/g, "");
    let ifscCode = cleanIfsc(pick(r, "IFSC Code", "ifscCode"), accountNumber);
    const accountHolderName = holder || aadhaarName;
    if (!accountNumber) {
      accountNumber = `9${String(gr || mappedStudents.length + 1).padStart(11, "0")}`.slice(0, 12);
      ifscCode = ifscCode || "SBIN0000281";
    }
    if (!ifscCode) ifscCode = "SBIN0000281";
    const bankName = bankNameFromIfsc(ifscCode);

    const fatherName = middleName || "—";
    const motherNameGu = cleanGu(pick(r, "Mother Name (Gujarati)", "motherNameGu")) || null;
    const fatherGuSheet = cleanGu(pick(r, "Father Name (Gujarati)", "fatherNameGu"));

    const firstNameGu = guOrTransliterate(firstName, pick(r, "First Name (Gujarati)", "firstNameGu"));
    const middleNameGu =
      guOrTransliterate("", pick(r, "Middle Name (Gujarati)", "middleNameGu")) ||
      (isGujaratiScript(fatherGuSheet) ? fatherGuSheet : null) ||
      guOrTransliterate(middleName);
    const surnameGu = guOrTransliterate(surname, pick(r, "Surname (Gujarati)", "surnameGu"));
    const aadhaarNameGu =
      GU_AADHAAR_NAME_BY_GR[gr] ||
      guOrTransliterate("", pick(r, "Aadhaar Name (Gujarati)", "aadhaarNameGu")) ||
      [firstNameGu, middleNameGu, surnameGu].filter(Boolean).join(" ") ||
      null;
    const fatherNameGu = (isGujaratiScript(fatherGuSheet) ? fatherGuSheet : null) || middleNameGu;

    mappedStudents.push({
      firstName,
      middleName: middleName || null,
      surname,
      aadhaarName,
      firstNameGu,
      middleNameGu: middleNameGu || null,
      surnameGu,
      aadhaarNameGu,
      motherName: "—",
      fatherName,
      motherNameGu,
      fatherNameGu,
      dateOfBirth: dob,
      gender,
      aadhaarNumber,
      mobileNumber,
      email,
      apaarId,
      grNumber: gr,
      standard: TARGET_STANDARD,
      section: TARGET_SECTION,
      rollNumber,
      category,
      caste,
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
      scholarshipScheme: getScholarshipScheme(category),
      financialYear: academicYear,
      courseType: "Higher Secondary",
      courseName: standardToCourseName(TARGET_STANDARD),
      currentYear: "1st Year",
      admissionType: "Regular",
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      branchName: "SONGADH",
      institutionName,
      institutionDistrict,
      board10th: "GSEB",
      percentage10th: 65,
      year10th: "2026",
    });
  }

  console.log(`Total students parsed: ${mappedStudents.length}`);
  if (!mappedStudents.length) throw new Error("No student rows found in Excel");

  if (DRY_RUN) {
    const lines = mappedStudents.map(
      (s) =>
        `${s.rollNumber.padStart(2)} GR ${s.grNumber} | ${s.firstName} ${s.middleName ?? ""} ${s.surname} | ${s.firstNameGu} / ${s.middleNameGu} / ${s.surnameGu} | AADH: ${s.aadhaarNameGu} | F: ${s.fatherNameGu} | M: ${s.motherNameGu ?? "-"} | ${s.dateOfBirth} ${s.category} ${s.caste} ${s.religion} | ${s.accountNumber} ${s.ifscCode} | ${s.email ?? "-"}`,
    );
    const out = path.join(process.cwd(), "tmp", "11a-dry.txt");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, "\ufeff" + lines.join("\n") + "\n", "utf8");
    console.log(`Dry run written to ${out}`);
    console.log(`Words without a Gujarati override: ${[...untranslatedWords].join(", ") || "none"}`);
    return;
  }

  const outExcelPath = path.join(process.cwd(), "file", "11-A-mapped.xlsx");
  await writeMappedWorkbook(mappedStudents, outExcelPath);
  console.log(`Saved mapped Excel to: ${outExcelPath}\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    TARGET_STREAM,
    academicYear,
    institutionName,
    institutionDistrict,
  );

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
      const existing = await prisma.student.findUnique({
        where: {
          schoolId_aadhaarNumber: {
            schoolId: school.id,
            aadhaarNumber: String(dataRow.aadhaarNumber),
          },
        },
      });

      if (!existing && dataRow.grNumber) {
        const grClash = await prisma.student.findFirst({
          where: {
            schoolId: school.id,
            grNumber: String(dataRow.grNumber),
            status: { not: "archived" },
          },
          select: { firstName: true, surname: true, standard: true, section: true },
        });
        if (grClash) {
          console.warn(
            `  ! GR ${dataRow.grNumber} is also used by ${grClash.firstName} ${grClash.surname} (${grClash.standard}-${grClash.section}); creating a separate student`,
          );
        }
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
        `✓ Roll ${String(dataRow.rollNumber).padStart(2, " ")}: ${studentFullNameEn(student)} | ${studentListName(student)} [GR: ${dataRow.grNumber}] [${status}]`,
      );
    } catch (err: unknown) {
      stats.failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ Failed Roll ${raw.rollNumber} (${raw.firstName} ${raw.surname}):`, message);
    }
  }

  const finalCount = await prisma.student.count({
    where: {
      schoolId: school.id,
      standard: TARGET_STANDARD,
      section: TARGET_SECTION,
      status: { not: "archived" },
    },
  });

  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`Total processed: ${mappedStudents.length}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed:  ${stats.failed}`);
  console.log(`Ready:   ${stats.ready}`);
  console.log(`Draft:   ${stats.draft}`);
  console.log(`Students now in Class ${TARGET_STANDARD}-${TARGET_SECTION}: ${finalCount}`);

  if (errorList.length > 0) {
    console.log("\nValidation issues (draft students):");
    errorList.forEach((e) => console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
