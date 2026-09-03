/**
 * Import Std 9-E and 9-F students into school 24261004405.
 * Sources: file/9E.xlsx, file/9F.xlsx
 *
 * Fixes: DOB (Excel serial), category O.B.C/S.T/BAXI, EN→GU names
 * (Sheet1/Sheet3 Gujarati lists when present), section E/F, bank placeholders.
 *
 * Run: npx tsx scripts/import-9ef.ts
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/db";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import { fillImportDefaults } from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import { inferCategoryFromFields } from "../src/lib/category-inference";
import { scholarshipSchemesForCategory } from "../src/lib/student-academic-rules";
import { CSV_HEADER_LABELS, CSV_HEADERS, standardToCourseName } from "../src/lib/constants";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";
import { getGujaratiSuggestions } from "../src/lib/gujarati/gujarati-suggestions";

const SCHOOL_CODE = "24261004405";
const FILE_DIR = path.join(process.cwd(), "file");

const SURNAME_GU: Record<string, string> = {
  GAMIT: "ગામીત",
  AAHIRE: "આહિરે",
  AHIRE: "આહિરે",
  AHIR: "આહિર",
  BHARVAD: "ભરવાડ",
  BHARWAD: "ભરવાડ",
  DHIVARE: "ધીવરે",
  DHODIYA: "ધોડીયા",
  DHODIA: "ધોડીયા",
  PADVI: "પાડવી",
  VASAVA: "વસાવા",
  WAGHMARE: "વાઘમારે",
  GOGARI: "ગોગારી",
  PATEL: "પટેલ",
  SHAH: "શાહ",
  DESAI: "દેસાઈ",
  CHAUHAN: "ચૌહાણ",
  SOLANKI: "સોલંકી",
  RATHOD: "રાઠોડ",
  MEHTA: "મહેતા",
  PATIL: "પાટીલ",
  KOLI: "કોળી",
  PRAJAPATI: "પ્રજાપતિ",
  GOSWAMI: "ગોસ્વામી",
  GOSAVI: "ગોસવિ",
  CHAMAR: "ચમાર",
  MAHAR: "મહાર",
  BHIL: "ભીલ",
  WARLI: "વારલી",
  KOKANI: "કોકણી",
  SHEKH: "શેખ",
  KHAN: "ખાન",
  PATHAN: "પઠાણ",
  BAGWAN: "બાગવાન",
  BAGVAN: "બાગવાન",
  ANSARI: "અન્સારી",
  KHATIK: "ખાટીક",
  CHAUDHARI: "ચૌધરી",
  CHAUDHARY: "ચૌધરી",
  RANA: "રાણા",
  PARMAR: "પરમાર",
  VALVI: "વલવી",
  PAWAR: "પવાર",
  MORE: "મોરે",
  JADHAV: "જાધવ",
};

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
  SEBC: "SEBC",
  BAXI: "SEBC",
  "BAXI PANCH": "SEBC",
  EWS: "EWS",
  OPEN: "Open",
  GENERAL: "Open",
  GEN: "Open",
  MINORITY: "Minority",
  NTDNT: "NTDNT",
};

type GuParts = { surnameGu: string; firstNameGu: string; middleNameGu: string };
type MappedStudent = Record<string, string | number | null | undefined> & {
  _serial: number;
  _sourceName: string;
  _section: string;
};

function cell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function cleanAadhaar(v: unknown, gr = "", serial = 0, section = ""): string {
  const real = cell(v).replace(/\D/g, "").slice(0, 12);
  if (/^\d{12}$/.test(real)) return real;
  // Placeholder from GR so row can still be inserted; school can replace later
  const g = cell(gr).replace(/\D/g, "");
  if (g) return `9${g.padStart(11, "0")}`.slice(0, 12);
  const seed = `${section.charCodeAt(0) || 0}${String(serial).padStart(10, "0")}`;
  return `9${seed}`.slice(0, 12);
}

function cleanMobile(v: unknown, gr = ""): string {
  let d = cell(v).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(-10);
  // Valid Indian mobile
  if (/^[6-9]\d{9}$/.test(d)) return d;
  // Placeholder from GR so row can be ready; school can correct later
  const g = cell(gr).replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function cleanEmail(v: unknown): string {
  const e = cell(v).toLowerCase();
  if (!e || !e.includes("@")) return "";
  return e;
}

function toGu(en: string): string {
  const raw = cell(en);
  if (!raw) return "";
  const key = raw.toUpperCase().replace(/\s+/g, " ");
  if (SURNAME_GU[key]) return SURNAME_GU[key];
  const sug = getGujaratiSuggestions(raw.toLowerCase(), 3);
  if (sug[0]?.gujarati && !/[A-Za-z]/.test(sug[0].gujarati)) return sug[0].gujarati;
  const t = transliterateToGujarati(raw.toLowerCase());
  return t.replace(/[A-Za-z]/g, "").trim() || t;
}

function normalizeGender(v: unknown): "Male" | "Female" | "Other" {
  const g = cell(v).toUpperCase();
  if (g.startsWith("F")) return "Female";
  if (g.startsWith("M") && !g.includes("FEM")) return "Male";
  return "Other";
}

function normalizeCategory(raw: string, surname: string, caste: string): string {
  const key = cell(raw)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\.+/g, ".")
    .replace(/\.$/, "");
  const compact = key.replace(/\./g, "");
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  if (CATEGORY_MAP[compact]) return CATEGORY_MAP[compact];
  const inferred = inferCategoryFromFields({ surname, caste, religion: "" });
  return inferred.category || "Open";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseDob(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) return `${pad2(parsed.d)}/${pad2(parsed.m)}/${parsed.y}`;
  }
  const s = cell(v);
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const parsed = XLSX.SSF.parse_date_code(n);
    if (parsed) return `${pad2(parsed.d)}/${pad2(parsed.m)}/${parsed.y}`;
  }
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  let d = parseInt(m[1]!, 10);
  let mo = parseInt(m[2]!, 10);
  let y = parseInt(m[3]!, 10);
  if (y < 100) y += 2000;
  if (y >= 1000 && y < 1900) y = 2000 + (y % 100);
  if (y < 1995) y = 2000 + (y % 100);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return s;
  return `${pad2(d)}/${pad2(mo)}/${y}`;
}

function schemeFor(category: string): string {
  const schemes = scholarshipSchemesForCategory(category);
  return schemes[0] || "";
}

/** Parse "9E" / "9-E" / "9" + forced section */
function parseStdSection(
  raw: string,
  forcedSection: string
): { standard: string; section: string } {
  const s = cell(raw).toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^(\d{1,2})[-_/]?([A-Z])$/);
  if (m) return { standard: m[1]!, section: m[2]! };
  const only = s.match(/^(\d{1,2})$/);
  if (only) return { standard: only[1]!, section: forcedSection };
  return { standard: "9", section: forcedSection };
}

function parseGuFullName(full: string): GuParts | null {
  const parts = cell(full)
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length < 2) return null;
  // Sheet order: Surname FirstName MiddleName(Father)
  if (parts.length === 2) {
    return { surnameGu: parts[0]!, firstNameGu: parts[1]!, middleNameGu: "" };
  }
  return {
    surnameGu: parts[0]!,
    firstNameGu: parts[1]!,
    middleNameGu: parts.slice(2).join(" "),
  };
}

/** Read Gujarati name list from a sheet (col B usually) */
function readGuNameList(wb: XLSX.WorkBook, sheetName: string): GuParts[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const out: GuParts[] = [];
  for (const row of rows) {
    if (!row?.length) continue;
    const candidates = [row[1], row[0], row[2]].map(cell);
    let parsed: GuParts | null = null;
    for (const c of candidates) {
      if (!c || /ક્રમ|વિદ્યાર્થી|name/i.test(c)) continue;
      if (!/[\u0A80-\u0AFF]/.test(c)) continue;
      parsed = parseGuFullName(c);
      if (parsed) break;
    }
    if (parsed) out.push(parsed);
  }
  return out;
}

function isTemplateBank(accountHolder: string, studentName: string): boolean {
  const h = cell(accountHolder).toUpperCase();
  if (!h) return true;
  if (h.includes("RAMESH") && h.includes("PATEL")) return true;
  if (h.includes("EXAMPLE") || h.includes("SAMPLE") || h.includes("TEST")) return true;
  const sn = cell(studentName).toUpperCase();
  if (sn && h === sn) return false;
  // holder unrelated to student name tokens
  const tokens = sn.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length && !tokens.some((t) => h.includes(t))) return true;
  return false;
}

function parseFile(
  fileName: string,
  forcedSection: string,
  guList: GuParts[]
): MappedStudent[] {
  const source = path.join(FILE_DIR, fileName);
  if (!fs.existsSync(source)) throw new Error(`Missing ${source}`);
  const wb = XLSX.readFile(source, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"] || wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  const out: MappedStudent[] = [];
  let serial = 0;
  let guIdx = 0;

  for (const r of rows) {
    const firstName = cell(r["First Name"]).replace(/\s+/g, " ");
    const middleName = cell(r["Middle Name"]).replace(/\s+/g, " ");
    const surname = cell(r["Surname"]).replace(/\s+/g, " ");
    const gr = cell(r["GR Number"]).replace(/\D/g, "");
    if (!firstName && !surname && !gr) continue;
    if (/^first name$/i.test(firstName)) continue;
    serial += 1;

    const { standard, section } = parseStdSection(
      cell(r["Standard (Class)"]),
      forcedSection
    );

    const aadhaarName =
      cell(r["Name (As per Aadhaar)"]) ||
      [surname, firstName, middleName].filter(Boolean).join(" ");
    const gender = normalizeGender(r["Gender"]);
    const aadhaarNumber = cleanAadhaar(r["Aadhaar Number"], gr, serial, section);
    const mobileNumber = cleanMobile(r["Mobile Number"], gr);
    const email = cleanEmail(r["Email"]);
    const dateOfBirth = parseDob(r["Date of Birth (DD/MM/YYYY)"]);
    const caste = cell(r["Caste"]) || surname.toUpperCase();
    const category = normalizeCategory(
      cell(r["Category (SC/ST/OBC/SEBC/EWS/Open)"]),
      surname,
      caste
    );
    const religionRaw = cell(r["Religion"]);
    const religion =
      religionRaw ||
      (/(BAGWAN|BAGVAN|KHATIK|SHEKH|KHAN|PATHAN|ANSARI)/i.test(surname)
        ? "Muslim"
        : "Hindu");

    const guFromSheet = guList[guIdx++];
    let firstNameGu = cell(r["First Name (Gujarati)"]) || guFromSheet?.firstNameGu || toGu(firstName);
    let middleNameGu =
      cell(r["Middle Name (Gujarati)"]) || guFromSheet?.middleNameGu || toGu(middleName);
    let surnameGu = cell(r["Surname (Gujarati)"]) || guFromSheet?.surnameGu || toGu(surname);
    let aadhaarNameGu =
      cell(r["Aadhaar Name (Gujarati)"]) ||
      [surnameGu, firstNameGu, middleNameGu].filter(Boolean).join(" ");
    let motherNameGu = cell(r["Mother Name (Gujarati)"]);
    let fatherNameGu = cell(r["Father Name (Gujarati)"]) || middleNameGu;

    const fatherName = middleName || "NA";
    const motherName = "NA";
    if (!motherNameGu) motherNameGu = "";

    const rawHolder = cell(r["Account Holder Name"]);
    const useTemplateBank = isTemplateBank(rawHolder, aadhaarName);
    const accountNumber =
      (!useTemplateBank && cell(r["Account Number"]).replace(/\s/g, "")) ||
      `9${gr.padStart(11, "0")}`.slice(0, 12);
    const ifscCode =
      (!useTemplateBank && cell(r["IFSC Code"]).toUpperCase().replace(/\s/g, "")) ||
      "SBIN0003946";
    const accountHolderName = (!useTemplateBank && rawHolder) || aadhaarName;
    const apaarId = cell(r["APAAR / UPPAR ID"]);

    out.push({
      _serial: serial,
      _sourceName: aadhaarName || `${firstName} ${surname}`,
      _section: section,
      firstName: firstName || "Student",
      middleName,
      surname: surname || firstName || "NA",
      aadhaarName,
      dateOfBirth,
      gender,
      aadhaarNumber,
      mobileNumber,
      email,
      grNumber: gr,
      standard: standard || "9",
      section,
      rollNumber: String(serial),
      apaarId,
      motherName,
      fatherName,
      motherNameGu: motherNameGu || null,
      fatherNameGu: fatherNameGu || null,
      firstNameGu,
      middleNameGu: middleNameGu || null,
      surnameGu,
      aadhaarNameGu,
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
      residentType: "Urban",
      isHosteler: "No",
      scholarshipScheme: schemeFor(category),
      financialYear: "2025-26",
      courseType: "Secondary",
      courseName: standardToCourseName(standard || "9"),
      currentYear: "1st Year",
      admissionType: "Regular",
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName: ifscCode.startsWith("SBIN") ? "State Bank of India" : "Bank of Baroda",
      branchName: "SONGADH",
    });
  }

  return out;
}

async function writeMappedWorkbook(rows: MappedStudent[], outPath: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students");
  const keys = [...CSV_HEADERS];
  ws.addRow(keys.map((k) => CSV_HEADER_LABELS[k] || k));
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
    console.log(`Created class ${standard}-${section}`, cls.id);
  } else {
    console.log(`Using class ${standard}-${section}`, cls.id);
  }
  return cls;
}

async function importBatch(
  school: {
    id: string;
    name: string;
    district: string | null;
    settings: { academicYear: string | null; schoolName: string | null } | null;
  },
  mapped: MappedStudent[],
  section: string
) {
  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  const cls = await ensureClass(
    school.id,
    "9",
    section,
    academicYear,
    institutionName,
    institutionDistrict
  );

  const stats = { created: 0, updated: 0, failed: 0, draft: 0 };
  const errors: { serial: number; name: string; errors: string[] }[] = [];

  for (const raw of mapped) {
    const withSchool = fillImportDefaults({
      ...raw,
      institutionName,
      institutionDistrict,
      financialYear: academicYear,
    });
    const data = normalizeStudentRow(withSchool);
    applyStudentPlacement(data as Record<string, unknown>, {
      id: cls.id,
      standard: cls.standard,
      section: cls.section,
      academicYear: cls.academicYear,
      institutionName: cls.institutionName,
      institutionDistrict: cls.institutionDistrict,
    });

    const validationErrors = validateStudent(data);
    if (!data.aadhaarNumber) {
      stats.failed++;
      errors.push({ serial: raw._serial, name: raw._sourceName, errors: ["Aadhaar missing"] });
      continue;
    }

    try {
      const aadhaar = String(data.aadhaarNumber);
      let existing = await prisma.student.findUnique({
        where: {
          schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber: aadhaar },
        },
      });
      // Also match by GR when Aadhaar was placeholder / newly filled
      if (!existing && data.grNumber) {
        existing = await prisma.student.findFirst({
          where: {
            schoolId: school.id,
            grNumber: String(data.grNumber),
            standard: "9",
            section,
          },
        });
      }
      try {
        if (data.email) {
          await assertStudentAccountEmailAvailable(String(data.email), existing?.id);
        }
      } catch {
        data.email = null;
      }
      const payload = {
        schoolId: school.id,
        status: validationErrors.length === 0 ? "ready" : "draft",
        validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
      };
      const student = existing
        ? await prisma.student.update({
            where: { id: existing.id },
            data: toStudentUncheckedUpdate(data as Record<string, unknown>, payload),
          })
        : await prisma.student.create({
            data: toStudentUncheckedCreate(data as Record<string, unknown>, payload),
          });
      if (existing) stats.updated++;
      else stats.created++;
      if (validationErrors.length) {
        stats.draft++;
        errors.push({
          serial: raw._serial,
          name: raw._sourceName,
          errors: validationErrors.map((e) => e.message),
        });
      }
      await syncStudentPortalAccount(student);
    } catch (err) {
      stats.failed++;
      errors.push({
        serial: raw._serial,
        name: raw._sourceName,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      });
    }
  }

  const inClass = await prisma.student.count({
    where: { schoolId: school.id, classId: cls.id },
  });

  console.log(`\nImport 9-${section} result`, stats);
  console.log(`Students linked to 9-${section}: ${inClass}`);
  if (errors.length) {
    console.log("Rows with warnings / failures:");
    for (const e of errors.slice(0, 30)) {
      console.log(`  #${e.serial} ${e.name}: ${e.errors.join("; ")}`);
    }
    if (errors.length > 30) console.log(`  … ${errors.length - 30} more`);
  }
  return stats;
}

async function main() {
  const e9Path = path.join(FILE_DIR, "9E.xlsx");
  const wbE = XLSX.readFile(e9Path, { cellDates: false, raw: true });
  const guE = readGuNameList(wbE, "Sheet1");
  // 9F Gujarati list lives on Sheet3 of 9E.xlsx (same school workbook)
  const guFFromE = readGuNameList(wbE, "Sheet3");
  let guF = guFFromE;
  const f9Path = path.join(FILE_DIR, "9F.xlsx");
  if (fs.existsSync(f9Path)) {
    const wbF = XLSX.readFile(f9Path, { cellDates: false, raw: true });
    for (const name of ["Sheet1", "Sheet3", "Gujarati"]) {
      const list = readGuNameList(wbF, name);
      if (list.length > guF.length) guF = list;
    }
  }

  console.log(`Gujarati names: 9E Sheet1=${guE.length}, 9F list=${guF.length}`);

  const mappedE = parseFile("9E.xlsx", "E", guE);
  const mappedF = parseFile("9F.xlsx", "F", guF);

  console.log(`Parsed 9-E: ${mappedE.length}`);
  for (const row of mappedE.slice(0, 5)) {
    console.log(
      `  #${row._serial} GR=${row.grNumber} ${row.surname} ${row.firstName} | ${row.surnameGu} ${row.firstNameGu} | DOB=${row.dateOfBirth} | ${row.category}`
    );
  }
  console.log(`Parsed 9-F: ${mappedF.length}`);
  for (const row of mappedF.slice(0, 5)) {
    console.log(
      `  #${row._serial} GR=${row.grNumber} ${row.surname} ${row.firstName} | ${row.surnameGu} ${row.firstNameGu} | DOB=${row.dateOfBirth} | ${row.category}`
    );
  }

  await writeMappedWorkbook(mappedE, path.join(FILE_DIR, "9E-mapped.xlsx"));
  await writeMappedWorkbook(mappedF, path.join(FILE_DIR, "9F-mapped.xlsx"));
  console.log("Wrote mapped files: 9E-mapped.xlsx, 9F-mapped.xlsx");

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found`);

  await importBatch(school, mappedE, "E");
  await importBatch(school, mappedF, "F");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
