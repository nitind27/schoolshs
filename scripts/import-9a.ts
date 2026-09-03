/**
 * Import Std 9-A students into school 24261004405.
 * Source: file/9-A.xlsx (Students sheet — English template, Gujarati columns empty)
 *
 * Fixes: DOB (Excel serial + bad years), category BAXI→SEBC, EN→GU names,
 * section A, standard 9, clean Aadhaar/mobile.
 *
 * Run: npx tsx scripts/import-9a.ts
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
const SOURCE = path.join(FILE_DIR, "9-A.xlsx");
const MAPPED_OUT = path.join(FILE_DIR, "9-A-mapped.xlsx");

/** Common Songadh / Tapi surnames — preferred Gujarati spelling */
const SURNAME_GU: Record<string, string> = {
  GAMIT: "ગામીત",
  AAHIRE: "આહિરે",
  AHIRE: "આહિરે",
  AHIR: "આહિર",
  BHARVAD: "ભરવાડ",
  BHARWAD: "ભરવાડ",
  DHIVARE: "ધીવરે",
  DHODIYA: "ધોડિયા",
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
  CHAMAR: "ચમાર",
  MAHAR: "મહાર",
  BHIL: "ભીલ",
  WARLI: "વારલી",
  KOKANI: "કોકણી",
  SHEKH: "શેખ",
  KHAN: "ખાન",
  PATHAN: "પઠાણ",
  BAGWAN: "બાગવાન",
  ANSARI: "અન્સારી",
};

const CATEGORY_MAP: Record<string, string> = {
  SC: "SC",
  ST: "ST",
  OBC: "OBC",
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

type MappedStudent = Record<string, string | number | null | undefined> & {
  _serial: number;
  _sourceName: string;
};

function cell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function cleanAadhaar(v: unknown): string {
  return cell(v).replace(/\D/g, "").slice(0, 12);
}

function cleanMobile(v: unknown): string {
  const d = cell(v).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d.slice(-10);
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
  const key = cell(raw).toUpperCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  const inferred = inferCategoryFromFields({ surname, caste, religion: "" });
  return inferred.category || "Open";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Excel serial or DD/MM/YYYY / D/M/YYYY → DD/MM/YYYY */
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
  // OCR / typo: 1012 → 2012, 1013 → 2013
  if (y >= 1000 && y < 1900) y = 2000 + (y % 100);
  if (y < 1995) y = 2000 + (y % 100);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return s;
  return `${pad2(d)}/${pad2(mo)}/${y}`;
}

function schemeFor(category: string): string {
  const schemes = scholarshipSchemesForCategory(category);
  return schemes[0] || "";
}

function parseStudents(): MappedStudent[] {
  if (!fs.existsSync(SOURCE)) throw new Error(`Missing ${SOURCE}`);
  const wb = XLSX.readFile(SOURCE, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"] || wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  const out: MappedStudent[] = [];
  let serial = 0;

  for (const r of rows) {
    const firstName = cell(r["First Name"]).replace(/\s+/g, " ");
    const middleName = cell(r["Middle Name"]).replace(/\s+/g, " ");
    const surname = cell(r["Surname"]).replace(/\s+/g, " ");
    const gr = cell(r["GR Number"]).replace(/\D/g, "");
    if (!firstName && !surname && !gr) continue;
    if (/^first name$/i.test(firstName)) continue;
    serial += 1;

    const aadhaarName =
      cell(r["Name (As per Aadhaar)"]) ||
      [surname, firstName, middleName].filter(Boolean).join(" ");
    const gender = normalizeGender(r["Gender"]);
    const aadhaarNumber = cleanAadhaar(r["Aadhaar Number"]);
    const mobileNumber = cleanMobile(r["Mobile Number"]) || "0000000000";
    const email = cleanEmail(r["Email"]);
    const dateOfBirth = parseDob(r["Date of Birth (DD/MM/YYYY)"]);
    const standard = cell(r["Standard (Class)"]).replace(/^class\s+/i, "") || "9";
    const caste = cell(r["Caste"]) || surname.toUpperCase();
    const category = normalizeCategory(
      cell(r["Category (SC/ST/OBC/SEBC/EWS/Open)"]),
      surname,
      caste
    );
    const religion = cell(r["Religion"]) || "Hindu";

    let firstNameGu = cell(r["First Name (Gujarati)"]) || toGu(firstName);
    let middleNameGu = cell(r["Middle Name (Gujarati)"]) || toGu(middleName);
    let surnameGu = cell(r["Surname (Gujarati)"]) || toGu(surname);
    let aadhaarNameGu =
      cell(r["Aadhaar Name (Gujarati)"]) ||
      [surnameGu, firstNameGu, middleNameGu].filter(Boolean).join(" ");
    let motherNameGu = cell(r["Mother Name (Gujarati)"]);
    let fatherNameGu = cell(r["Father Name (Gujarati)"]) || middleNameGu;

    const fatherName =
      cell(r["Account Holder Name"]).includes(middleName) && middleName
        ? middleName
        : middleName || "NA";
    const motherName = "NA";
    if (!motherNameGu) motherNameGu = "";

    const accountNumber =
      cell(r["Account Number"]).replace(/\s/g, "") ||
      `9${gr.padStart(11, "0")}`.slice(0, 12);
    const ifscCode =
      cell(r["IFSC Code"]).toUpperCase().replace(/\s/g, "") || "SBIN0003946";
    const accountHolderName = cell(r["Account Holder Name"]) || aadhaarName;
    const apaarId = cell(r["APAAR / UPPAR ID"]);

    out.push({
      _serial: serial,
      _sourceName: aadhaarName || `${firstName} ${surname}`,
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
      section: "A",
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

async function writeMappedWorkbook(rows: MappedStudent[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students");
  const keys = [...CSV_HEADERS];
  ws.addRow(keys.map((k) => CSV_HEADER_LABELS[k] || k));
  for (const row of rows) {
    ws.addRow(keys.map((k) => (row[k] as string | number | undefined) ?? ""));
  }
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(MAPPED_OUT);
}

async function main() {
  const mapped = parseStudents();
  console.log(`Parsed ${mapped.length} students from ${path.basename(SOURCE)}`);
  for (const row of mapped.slice(0, 8)) {
    console.log(
      `  #${row._serial} GR=${row.grNumber} ${row.surname} ${row.firstName} | ${row.surnameGu} ${row.firstNameGu} | DOB=${row.dateOfBirth} | ${row.category}`
    );
  }
  await writeMappedWorkbook(mapped);
  console.log(`Wrote mapped file: ${MAPPED_OUT}`);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found`);

  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  let cls = await prisma.schoolClass.findFirst({
    where: { schoolId: school.id, standard: "9", section: "A", academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: "Class 9-A",
        standard: "9",
        section: "A",
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, "9", "");
    console.log("Created class 9-A", cls.id);
  } else {
    console.log("Using class 9-A", cls.id);
  }

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
      const uniqueWhere = {
        schoolId_aadhaarNumber: {
          schoolId: school.id,
          aadhaarNumber: data.aadhaarNumber,
        },
      };
      const existing = await prisma.student.findUnique({ where: uniqueWhere });
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
            where: uniqueWhere,
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

  console.log("\nImport result", stats);
  console.log(`Students linked to 9-A: ${inClass}`);
  if (errors.length) {
    console.log("\nRows with warnings / failures:");
    for (const e of errors.slice(0, 40)) {
      console.log(`  #${e.serial} ${e.name}: ${e.errors.join("; ")}`);
    }
    if (errors.length > 40) console.log(`  … ${errors.length - 40} more`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
