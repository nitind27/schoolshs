/**
 * Replace Class 6-A students for school 24261004404 from file/6 A.xlsx.
 * - Deletes existing 6-A students (and related rows)
 * - Imports with First + Middle/Father + Surname + Gujarati transliteration
 *
 * Run: npx tsx scripts/import-6a.ts
 */
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
import {
  standardToCourseName,
  standardToCurrentYear,
} from "../src/lib/constants";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";
import {
  studentFullNameEn,
  studentFullNameGu,
  studentListName,
} from "../src/lib/student-names";

const SCHOOL_CODE = "24261004404";
const TARGET_STANDARD = "6";
const TARGET_SECTION = "A";
const SOURCE_FILE = "6 A.xlsx";

const CATEGORY_MAP: Record<string, string> = {
  SC: "SC",
  ST: "ST",
  OBC: "OBC",
  SEBC: "OBC",
  EWS: "EWS",
  OPEN: "Open",
  GENERAL: "Open",
  NTDNT: "NTDNT",
  MINORITY: "Minority",
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
  return "";
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseWords(value: string): string {
  return cleanName(value)
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z]\.?$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseDob(v: unknown): string {
  if (typeof v === "number") {
    const jsDate = new Date(Math.round((v - 25569) * 86400 * 1000));
    const d = String(jsDate.getUTCDate()).padStart(2, "0");
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
    const y = jsDate.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  let s = String(v || "")
    .trim()
    .replace(/-/g, "/");
  // Fix glued typos like 06/092015
  const glued = s.match(/^(\d{1,2})\/(\d{2})(\d{4})$/);
  if (glued) s = `${glued[1]}/${glued[2]}/${glued[3]}`;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return s;
  const d = String(parseInt(m[1]!, 10)).padStart(2, "0");
  const mo = String(parseInt(m[2]!, 10)).padStart(2, "0");
  let y = parseInt(m[3]!, 10);
  if (y < 100) y += 2000;
  // future birth year in sheet → assume 10 years earlier typo
  const nowY = new Date().getFullYear();
  if (y > nowY) y -= 10;
  return `${d}/${mo}/${y}`;
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

function cleanAadhaar(v: unknown): string {
  return String(v || "").replace(/\D/g, "").slice(0, 12);
}

function cleanIfsc(raw: string): string {
  let s = raw.toUpperCase().replace(/\s/g, "");
  s = s
    .replace(/^BARBO/, "BARB0")
    .replace(/SBIN000281$/, "SBIN0000281")
    .replace(/SBINO/, "SBIN0")
    .replace(/UBINO/, "UBIN0")
    .replace(/BKIB/, "BKID");
  const fixes: Record<string, string> = {
    BARBOFORTSO: "BARB0FORTSO",
    BARBOVYARAX: "BARB0VYARAX",
    BARBOWAGHAI: "BARB0WAGHAI",
    BARBOBGGBXX: "BARB0BGGBXX",
    SBIN000281: "SBIN0000281",
    SBIN0003893: "SBIN0003893",
  };
  return fixes[s] || s;
}

function bankNameFromIfsc(ifsc: string): string {
  if (ifsc.startsWith("SBIN")) return "State Bank of India";
  if (ifsc.startsWith("UBIN")) return "Union Bank of India";
  if (ifsc.startsWith("BARB0BGGB") || ifsc.startsWith("BARB0BGG"))
    return "Baroda Gujarat Gramin Bank";
  if (ifsc.startsWith("BARB")) return "Bank of Baroda";
  if (ifsc.startsWith("MAHB")) return "Bank of Maharashtra";
  if (ifsc.startsWith("SDCB")) return "Surat District Co-op Bank";
  if (ifsc.startsWith("BKID")) return "Bank of India";
  if (ifsc.startsWith("HDFC")) return "HDFC Bank";
  if (ifsc.startsWith("GSCB")) return "The Gujarat State Co-operative Bank";
  return "Bank of Baroda";
}

function inferCategory(caste: string, surname: string, religion: string): string {
  const c = caste.toUpperCase();
  const s = surname.toUpperCase();
  const rel = religion.toLowerCase();

  if (
    c.includes("MAHAR") ||
    c.includes("MATANG") ||
    s === "GULALE" ||
    s === "PANPATIL"
  ) {
    return "SC";
  }
  if (
    c.includes("VALVI") ||
    c.includes("GAMIT") ||
    c.includes("BHIL") ||
    c.includes("DHODIYA") ||
    c.includes("VASAVA") ||
    c.includes("KOKANI") ||
    c.includes("KOKNI") ||
    c.includes("MAVCHI") ||
    c.includes("HALPATI") ||
    s === "VALVI" ||
    s === "GAMIT" ||
    s === "BHIL" ||
    s === "DHODIYA" ||
    s === "VASAVA" ||
    s === "KOKANI" ||
    s === "KOKNI"
  ) {
    return "ST";
  }
  if (c.includes("PARDHI") || s === "PARDHI") return "NTDNT";
  if (
    rel.includes("muslim") ||
    rel.includes("islam") ||
    c.includes("HAVELIWALA") ||
    s === "HAVELIWALA" ||
    s === "SHAIKH" ||
    s === "MANIYAR" ||
    s === "BAGWAN"
  ) {
    return "OBC";
  }
  if (
    c.includes("BHARVAD") ||
    c.includes("PRAJAPATI") ||
    c.includes("SUTHAR") ||
    c.includes("SUTAR") ||
    c.includes("DHOBI") ||
    c.includes("MALLAH") ||
    c.includes("SONI") ||
    c.includes("GIRI") ||
    s === "BHARVAD" ||
    s === "PRAJAPATI" ||
    s === "SUTHAR" ||
    s === "MALLAH" ||
    s === "SONI" ||
    s === "CHAUDHARI" ||
    s === "SOLANKI" ||
    s === "MOHITE" ||
    s === "DIVAKAR" ||
    s === "GOD" ||
    s === "PAVAR" ||
    s === "AAHIRE" ||
    s === "VISHWAKARMA"
  ) {
    return "OBC";
  }
  return "Open";
}

function getScholarshipScheme(cat: string): string {
  if (cat === "ST") return "Pre Matric Scholarship - ST";
  if (cat === "SC") return "Pre Matric Scholarship - SC";
  if (cat === "OBC") return "Post Matric Scholarship - OBC";
  if (cat === "NTDNT") return "Food Bill Assistance";
  return "";
}

function guOrTransliterate(en: string, guFromSheet = ""): string | null {
  const g = cleanName(guFromSheet);
  if (g) return g;
  const e = cleanName(en);
  if (!e || e.toUpperCase() === "NA") return null;
  const gu = transliterateToGujarati(e);
  return gu || null;
}

/** Prefer First + Middle + Surname; sheet Aadhaar col often only has father. */
function resolveAadhaarName(
  first: string,
  middle: string,
  surname: string,
  _sheetAadhaar: string,
  _holder: string,
): string {
  return [first, middle, surname].filter(Boolean).join(" ");
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
    await seedClassSubjects(cls.id, standard, "");
  }
  return cls;
}

async function deleteClassStudents(schoolId: string, standard: string, section: string) {
  const students = await prisma.student.findMany({
    where: { schoolId, standard, section },
    select: { id: true, firstName: true, surname: true, grNumber: true },
  });
  const ids = students.map((s) => s.id);
  console.log(`Deleting ${ids.length} existing Class ${standard}-${section} students…`);
  if (!ids.length) return 0;

  await prisma.$transaction(async (tx) => {
    await tx.examResult.deleteMany({ where: { studentId: { in: ids } } });
    await tx.examSeatAssignment.deleteMany({ where: { studentId: { in: ids } } });
    await tx.reportCard.deleteMany({ where: { studentId: { in: ids } } });
    await tx.studentAttendanceMonth.deleteMany({ where: { studentId: { in: ids } } });
    await tx.activityParticipant.deleteMany({ where: { studentId: { in: ids } } });
    await tx.generalRegisterEntry.deleteMany({
      where: { studentId: { in: ids } },
    });
    // portal users linked to these students cascade on student delete
    await tx.user.deleteMany({ where: { studentId: { in: ids } } });
    await tx.student.deleteMany({ where: { id: { in: ids } } });
  });

  for (const s of students.slice(0, 8)) {
    console.log(`  - removed ${s.firstName} ${s.surname} [GR: ${s.grNumber}]`);
  }
  if (students.length > 8) console.log(`  … and ${students.length - 8} more`);
  return ids.length;
}

async function main() {
  console.log(
    `=== Replace Class ${TARGET_STANDARD}-${TARGET_SECTION} for School ${SCHOOL_CODE} ===\n`,
  );

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found`);

  const academicYear = school.settings?.academicYear || "2026-27";
  const institutionName =
    school.settings?.schoolName ||
    school.name ||
    "Sarvajanik Upper Primary School Songadh";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Target: Class ${TARGET_STANDARD}-${TARGET_SECTION}`);
  console.log(`Source: file/${SOURCE_FILE}\n`);

  const removed = await deleteClassStudents(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
  );
  console.log(`Removed: ${removed}\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    academicYear,
    institutionName,
    institutionDistrict,
  );

  const filePath = path.join(process.cwd(), "file", SOURCE_FILE);
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const sheetName =
    wb.SheetNames.find((n) => /students/i.test(n)) || wb.SheetNames[0]!;
  const sheet = wb.Sheets[sheetName]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const mappedStudents: Record<string, any>[] = [];

  for (const r of rawRows) {
    const firstNameRaw = pick(r, "First Name", "firstName");
    const aadhaarDigitsRaw = cleanAadhaar(pick(r, "Aadhaar Number", "aadhaarNumber"));
    if (!firstNameRaw && !aadhaarDigitsRaw) continue;
    if (aadhaarDigitsRaw === "123456789012") continue;

    const firstName = titleCaseWords(firstNameRaw);
    const middleName = titleCaseWords(pick(r, "Middle Name", "middleName"));
    const surname = titleCaseWords(pick(r, "Surname", "surname"));
    const fatherName =
      titleCaseWords(pick(r, "Father Name", "fatherName")) ||
      middleName ||
      "—";
    const motherName =
      titleCaseWords(pick(r, "Mother Name", "motherName")) || "—";
    // Keep middle = father for First Father Surname display
    const middleForDisplay = middleName || (fatherName !== "—" ? fatherName : "");

    const holder = cleanName(pick(r, "Account Holder Name", "accountHolderName"));
    const sheetAadhaar = pick(r, "Name (As per Aadhaar)", "aadhaarName");
    const aadhaarName = resolveAadhaarName(
      firstName,
      middleForDisplay,
      surname,
      sheetAadhaar,
      holder,
    );

    const dob = parseDob(pick(r, "Date of Birth (DD/MM/YYYY)", "dateOfBirth"));
    const genderRaw = pick(r, "Gender", "gender").toLowerCase();
    const gender = genderRaw.startsWith("f")
      ? "Female"
      : genderRaw.startsWith("m")
        ? "Male"
        : "Other";
    const gr = pick(r, "GR Number", "grNumber").replace(/\s/g, "");
    const rollFromSheet = pick(r, "Roll Number", "rollNumber").replace(/\D/g, "");
    const rollNumber = rollFromSheet
      ? String(parseInt(rollFromSheet, 10))
      : String(mappedStudents.length + 1);
    const mobileNumber = cleanMobile(pick(r, "Mobile Number", "mobileNumber"), gr);
    const email = pick(r, "Email", "email") || undefined;
    const aadhaarDigits =
      /^\d{12}$/.test(aadhaarDigitsRaw)
        ? aadhaarDigitsRaw
        : `9${String(gr || rollNumber).padStart(11, "0")}`.slice(0, 12);

    const caste = titleCaseWords(pick(r, "Caste", "caste")) || surname;
    let religion = titleCaseWords(pick(r, "Religion", "religion")) || "Hindu";
    if (/muslim|islam|musalman/i.test(religion)) religion = "Muslim";

    const categoryKey = pick(
      r,
      "Category (SC/ST/OBC/SEBC/EWS/Open)",
      "category",
    ).toUpperCase();
    const category =
      CATEGORY_MAP[categoryKey] ||
      inferCategory(caste, surname, religion);

    let accountNumber = pick(r, "Account Number", "accountNumber").replace(
      /\s/g,
      "",
    );
    let ifscCode = cleanIfsc(pick(r, "IFSC Code", "ifscCode"));
    let accountHolderName = holder || aadhaarName;

    if (!accountNumber) {
      accountNumber = `9${String(gr || mappedStudents.length + 1).padStart(11, "0")}`.slice(
        0,
        12,
      );
      ifscCode = ifscCode || "SBIN0000281";
    }
    if (!ifscCode) {
      if (accountNumber.startsWith("3013010002")) ifscCode = "BARB0BGGBXX";
      else if (accountNumber.startsWith("8080")) ifscCode = "SDCB0000008";
      else if (accountNumber.startsWith("0267") || accountNumber.startsWith("3982"))
        ifscCode = "BARB0FORTSO";
      else if (accountNumber.startsWith("0269")) ifscCode = "BARB0VYARAX";
      else if (accountNumber.startsWith("0289")) ifscCode = "BARB0WAGHAI";
      else if (accountNumber.startsWith("1785")) ifscCode = "UBIN0917851";
      else if (
        accountNumber.startsWith("44") ||
        accountNumber.startsWith("45") ||
        accountNumber.startsWith("43") ||
        accountNumber.startsWith("40") ||
        accountNumber.startsWith("38")
      )
        ifscCode = "SBIN0000281";
      else ifscCode = "SBIN0000281";
    }

    const bankName = bankNameFromIfsc(ifscCode);
    const scheme = getScholarshipScheme(category);

    const firstNameGu = guOrTransliterate(
      firstName,
      pick(r, "First Name (Gujarati)", "firstNameGu"),
    );
    const middleNameGu = guOrTransliterate(
      middleForDisplay,
      pick(r, "Middle Name (Gujarati)", "middleNameGu"),
    );
    const surnameGu = guOrTransliterate(
      surname,
      pick(r, "Surname (Gujarati)", "surnameGu"),
    );
    const fatherNameGu =
      guOrTransliterate(
        fatherName,
        pick(r, "Father Name (Gujarati)", "fatherNameGu"),
      ) || middleNameGu;
    const motherNameGu = guOrTransliterate(
      motherName,
      pick(r, "Mother Name (Gujarati)", "motherNameGu"),
    );
    const aadhaarNameGu =
      guOrTransliterate(
        aadhaarName,
        pick(r, "Aadhaar Name (Gujarati)", "aadhaarNameGu"),
      ) ||
      [firstNameGu, middleNameGu, surnameGu].filter(Boolean).join(" ") ||
      null;

    const pincode =
      pick(r, "Current Pincode", "currentPincode").replace(/\D/g, "").slice(0, 6) ||
      "394670";

    mappedStudents.push({
      firstName,
      middleName: middleForDisplay || null,
      surname,
      aadhaarName,
      firstNameGu,
      middleNameGu: middleNameGu || null,
      surnameGu,
      aadhaarNameGu,
      motherName,
      fatherName,
      motherNameGu,
      fatherNameGu,
      dateOfBirth: dob,
      gender,
      aadhaarNumber: aadhaarDigits,
      mobileNumber,
      email,
      grNumber: gr,
      standard: TARGET_STANDARD,
      section: TARGET_SECTION,
      rollNumber,
      category,
      caste,
      religion,
      maritalStatus: "Unmarried",
      parentOccupation:
        titleCaseWords(pick(r, "Parent Occupation", "parentOccupation")) ||
        "Daily Wage Labour",
      isOrphan: "No",
      annualFamilyIncome: category === "ST" || category === "SC" ? 60000 : 120000,
      currentAddress: "Songadh, Tapi, Gujarat",
      currentDistrict: "Tapi",
      currentCity: "Songadh",
      currentPincode: pincode,
      permanentAddress: "Songadh, Tapi, Gujarat",
      permanentDistrict: "Tapi",
      permanentCity: "Songadh",
      permanentPincode: pincode,
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
      accountNumber,
      ifscCode,
      accountHolderName,
      bankName,
      branchName: "SONGADH",
      institutionName,
      institutionDistrict,
    });
  }

  console.log(`Total students parsed: ${mappedStudents.length}`);
  if (!mappedStudents.length) throw new Error("No student rows found in Excel");

  const outExcelPath = path.join(process.cwd(), "file", "6-A-mapped.xlsx");
  await writeMappedWorkbook(mappedStudents, outExcelPath);
  console.log(`Saved mapped Excel to: ${outExcelPath}\n`);

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
          schoolId_aadhaarNumber: {
            schoolId: school.id,
            aadhaarNumber: aadhaar,
          },
        },
      });
      if (!existing && dataRow.grNumber) {
        existing = await prisma.student.findFirst({
          where: {
            schoolId: school.id,
            grNumber: String(dataRow.grNumber),
            status: { not: "archived" },
          },
        });
      }

      if (dataRow.email) {
        try {
          await assertStudentAccountEmailAvailable(
            String(dataRow.email),
            existing?.id,
          );
        } catch {
          dataRow.email = null;
        }
      }

      const payload = {
        schoolId: school.id,
        status,
        validationErrors:
          validationErrors.length > 0
            ? JSON.stringify(validationErrors)
            : null,
      };

      const student = existing
        ? await prisma.student.update({
            where: { id: existing.id },
            data: toStudentUncheckedUpdate(
              dataRow as Record<string, unknown>,
              payload,
            ),
          })
        : await prisma.student.create({
            data: toStudentUncheckedCreate(
              dataRow as Record<string, unknown>,
              payload,
            ),
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

      const listName = studentListName(student);
      console.log(
        `✓ Roll ${String(dataRow.rollNumber).padStart(2, " ")}: EN=${studentFullNameEn(student)} | GU=${studentFullNameGu(student)} | list=${listName} [${status}]`,
      );
    } catch (err: unknown) {
      stats.failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `✗ Failed Roll ${raw.rollNumber} (${raw.firstName} ${raw.surname}):`,
        message,
      );
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
  console.log(`Removed old: ${removed}`);
  console.log(`Total processed: ${mappedStudents.length}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed:  ${stats.failed}`);
  console.log(`Ready:   ${stats.ready}`);
  console.log(`Draft:   ${stats.draft}`);
  console.log(`Students now in Class 6-A: ${finalCount}`);

  if (errorList.length > 0) {
    console.log("\nValidation issues (draft students):");
    errorList.slice(0, 20).forEach((e) => {
      console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
    });
    if (errorList.length > 20) {
      console.log(` ... and ${errorList.length - 20} more`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
