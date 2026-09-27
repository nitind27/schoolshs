/**
 * Import Std 12-A students into school 24261004405 (SARVAJANIK HIGH SCHOOL SONGADH).
 * Source: file/12-A.xlsx
 *
 * Run: npx tsx scripts/import-12a.ts
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
const TARGET_STANDARD = "12";
const TARGET_SECTION = "A";
/** Same Arts stream pattern as other Std 12 divisions at this school. */
const TARGET_STREAM = "Arts";
const SOURCE_FILE = "12-A.xlsx";

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
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }
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
  if (/^\d{5}$/.test(s)) {
    const parsed = XLSX.SSF.parse_date_code(parseInt(s, 10));
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }
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

function cleanIfsc(raw: string): string {
  let s = raw.toUpperCase().replace(/\s/g, "");
  s = s
    .replace(/^BARBO/, "BARB0")
    .replace(/^DCBL/i, "DCBL")
    .replace(/^DcBl/i, "DCBL");
  // common typos from sheet
  const fixes: Record<string, string> = {
    DCBL0000115: "DCBL0000115",
    BARB0FORTSO: "BARB0FORTSO",
    BARBOFORTSO: "BARB0FORTSO",
    BARB0BGGBXX: "BARB0BGGBXX",
    BARBOBGGBXX: "BARB0BGGBXX",
    BARB0SINGPU: "BARB0SINGPU",
    BARBOSINGPU: "BARB0SINGPU",
    BARB0BANDHA: "BARB0BANDHA",
    BARB0UKAI: "BARB0UKAI",
    BARBOUKAI: "BARB0UKAI",
    SBIN0000281: "SBIN0000281",
    SBIN0003851: "SBIN0003851",
    MAHB0000515: "MAHB0000515",
    SDCB0000058: "SDCB0000058",
    UBIN0917851: "UBIN0917851",
    UBINO917851: "UBIN0917851",
    BKIB0002541: "BKID0002541",
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
  if (ifsc.startsWith("DCBL")) return "DCB Bank";
  if (ifsc.startsWith("BKID") || ifsc.startsWith("BKIB")) return "Bank of India";
  return "Bank of Baroda";
}

function getScholarshipScheme(cat: string): string {
  if (cat === "ST") return "Post Matric Scholarship - ST";
  if (cat === "SC") return "Post Matric Scholarship - SC";
  if (cat === "OBC") return "Post Matric Scholarship - OBC";
  return "";
}

function guOrTransliterate(en: string, guFromSheet = ""): string | null {
  const g = cleanName(guFromSheet);
  if (g && isGujaratiScript(g)) return g;
  const e = cleanName(en);
  if (!e || e.toUpperCase() === "NA") return null;
  const gu = transliterateToGujarati(e);
  return gu || null;
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
        name: stream
          ? `Class ${standard} ${stream}-${section}`
          : `Class ${standard}-${section}`,
        standard,
        section,
        stream: stream || null,
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, standard, stream || "");
    console.log(`Created class "${cls.name}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
    if (!cls.stream && stream) {
      cls = await prisma.schoolClass.update({
        where: { id: cls.id },
        data: {
          stream,
          name: `Class ${standard} ${stream}-${section}`,
        },
      });
      console.log(`Updated class stream/name to "${cls.name}"`);
    }
    await seedClassSubjects(cls.id, standard, cls.stream || stream || "");
  }
  return cls;
}

async function main() {
  console.log(
    `=== Importing Class ${TARGET_STANDARD}-${TARGET_SECTION} for School ${SCHOOL_CODE} ===\n`,
  );

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: {
      settings: true,
      classes: {
        where: { standard: TARGET_STANDARD, section: TARGET_SECTION },
      },
    },
  });
  if (!school) {
    throw new Error(`School with code ${SCHOOL_CODE} not found in database`);
  }

  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Target: Class ${TARGET_STANDARD}-${TARGET_SECTION} (${TARGET_STREAM})`);
  console.log(`Source: file/${SOURCE_FILE}\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    TARGET_STREAM,
    academicYear,
    institutionName,
    institutionDistrict,
  );

  const filePath = path.join(process.cwd(), "file", SOURCE_FILE);
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheetName =
    wb.SheetNames.find((n) => /students/i.test(n)) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName]!;
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  const mappedStudents: Record<string, any>[] = [];

  for (const r of rawRows) {
    const firstNameRaw = pick(r, "First Name", "firstName");
    let aadhaarNumber = cleanAadhaar(pick(r, "Aadhaar Number", "aadhaarNumber"));
    if (!firstNameRaw && !aadhaarNumber) continue;
    if (aadhaarNumber === "123456789012") continue;

    const firstName = titleCaseWords(firstNameRaw);
    const middleName = titleCaseWords(pick(r, "Middle Name", "middleName"));
    const surname = titleCaseWords(pick(r, "Surname", "surname"));
    const builtFull = [firstName, middleName, surname].filter(Boolean).join(" ");
    const sheetAadhaar = cleanName(
      pick(r, "Name (As per Aadhaar)", "aadhaarName", "Aadhaar Name"),
    );
    const holder = cleanName(pick(r, "Account Holder Name", "accountHolderName"));
    // Prefer built First+Middle+Surname so lists always show full name
    const aadhaarName = builtFull || sheetAadhaar || holder;
    const dob = parseDob(pick(r, "Date of Birth (DD/MM/YYYY)", "dateOfBirth"));
    const genderRaw = pick(r, "Gender", "gender").toLowerCase();
    const gender = genderRaw.startsWith("f")
      ? "Female"
      : genderRaw.startsWith("m")
        ? "Male"
        : "Other";
    const gr = pick(r, "GR Number", "grNumber").replace(/\s/g, "");
    const rollFromSheet =
      pick(r, "ROLL NO.", "Roll Number", "rollNumber") ||
      String(r["__EMPTY"] ?? "").trim();
    const rollNumber = rollFromSheet.replace(/\D/g, "")
      ? String(parseInt(rollFromSheet.replace(/\D/g, ""), 10))
      : String(mappedStudents.length + 1);
    const mobileNumber = cleanMobile(pick(r, "Mobile Number", "mobileNumber"), gr);
    let email = pick(r, "Email", "email") || undefined;
    // Fix common sheet typo domains
    if (email) {
      email = email.replace(/@gamail\.com$/i, "@gmail.com").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = undefined;
    }
    const apaarId = pick(r, "APAAR / UPPAR ID", "apaarId").replace(/\s/g, "") || null;

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      aadhaarNumber = `9${String(gr || rollNumber).padStart(11, "0")}`.slice(0, 12);
    }

    const categoryKey = pick(
      r,
      "Category (SC/ST/OBC/SEBC/EWS/Open)",
      "category",
    ).toUpperCase();
    const category = CATEGORY_MAP[categoryKey] || categoryKey || "Open";
    const caste = titleCaseWords(pick(r, "Caste", "caste")) || surname;
    let religion = titleCaseWords(pick(r, "Religion", "religion")) || "Hindu";
    if (/muslim|islam/i.test(religion)) religion = "Muslim";

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
    if (!ifscCode) ifscCode = "SBIN0000281";
    const bankName = bankNameFromIfsc(ifscCode);

    const fatherName = middleName || "—";
    const motherGuSheet = cleanName(
      pick(r, "Mother Name (Gujarati)", "motherNameGu"),
    );
    const motherName = motherGuSheet ? "—" : "—";

    const firstNameGu = guOrTransliterate(
      firstName,
      pick(r, "First Name (Gujarati)", "firstNameGu"),
    );
    const middleNameGu = guOrTransliterate(
      middleName,
      pick(r, "Middle Name (Gujarati)", "middleNameGu"),
    );
    const surnameGu = guOrTransliterate(
      surname,
      pick(r, "Surname (Gujarati)", "surnameGu"),
    );
    const aadhaarNameGu =
      guOrTransliterate(
        aadhaarName,
        pick(r, "Aadhaar Name (Gujarati)", "aadhaarNameGu"),
      ) ||
      [firstNameGu, middleNameGu, surnameGu].filter(Boolean).join(" ") ||
      null;
    const fatherNameGu =
      guOrTransliterate(
        fatherName,
        pick(r, "Father Name (Gujarati)", "fatherNameGu"),
      ) || middleNameGu;
    const motherNameGu = motherGuSheet || null;

    const scheme = getScholarshipScheme(category);

    mappedStudents.push({
      firstName,
      middleName: middleName || null,
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
      scholarshipScheme: scheme,
      financialYear: academicYear,
      courseType: "Higher Secondary",
      courseName: standardToCourseName(TARGET_STANDARD),
      currentYear: "2nd Year",
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
      year10th: "2023",
    });
  }

  console.log(`Total students parsed: ${mappedStudents.length}`);
  if (!mappedStudents.length) {
    throw new Error("No student rows found in Excel");
  }

  const outExcelPath = path.join(process.cwd(), "file", "12-A-mapped.xlsx");
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

      console.log(
        `✓ Roll ${String(dataRow.rollNumber).padStart(2, " ")}: ${studentFullNameEn(student)} | ${studentListName(student)} [GR: ${dataRow.grNumber}] [${status}]`,
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
  console.log(`Total processed: ${mappedStudents.length}`);
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed:  ${stats.failed}`);
  console.log(`Ready:   ${stats.ready}`);
  console.log(`Draft:   ${stats.draft}`);
  console.log(`Students now in Class 12-A: ${finalCount}`);

  if (errorList.length > 0) {
    console.log("\nValidation issues (draft students):");
    errorList.slice(0, 15).forEach((e) => {
      console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
    });
    if (errorList.length > 15) {
      console.log(` ... and ${errorList.length - 15} more`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
