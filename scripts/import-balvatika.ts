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

const SCHOOL_CODE = "24261004403";
const TARGET_STANDARD = "Balvatika";
const TARGET_SECTION = ""; // No division for primary school

const SURNAME_GU: Record<string, string> = {
  GADHVI: "ગઢવી",
  SAHANI: "સાહની",
  JADAV: "જાદવ",
  PINJARI: "પિંજારી",
  PAWAR: "પવાર",
  PRAJAPATI: "પ્રજાપતિ",
  GAMIT: "ગામીત",
  GUPTA: "ગુપ્તા",
};

const FIRST_GU: Record<string, string> = {
  ANANYA: "અનન્યા",
  ANSHIKA: "અંશિકા",
  DIPIKA: "દીપિકા",
  NAYRA: "નાયરા",
  NIRVA: "નિર્વા",
  VIHANA: "વિહાના",
  SAMARTH: "સમર્થ",
  VIVAN: "વિવાન",
  VIVEK: "વિવેક",
};

const PARENT_GU: Record<string, string> = {
  DIPAKBHAI: "દીપકભાઈ",
  AMARJIT: "અમરજીત",
  PRAKASHBHAI: "પ્રકાશભાઈ",
  SOYEB: "સોયેબ",
  PRAVINBHAI: "પ્રવીણભાઈ",
  SURAJBHAI: "સૂરજભાઈ",
  MANISHBHAI: "મનીષભાઈ",
  NARENDRABHAI: "નરેન્દ્રભાઈ",
  SURESH: "સુરેશ",
};

function getGuName(name: string, dict: Record<string, string>): string {
  if (!name) return "";
  const clean = name.trim().toUpperCase();
  if (dict[clean]) return dict[clean];

  for (const [k, v] of Object.entries(dict)) {
    if (clean === k) return v;
  }

  if (clean.endsWith("BHAI")) {
    const root = clean.slice(0, -4);
    if (dict[root]) return dict[root] + "ભાઈ";
  }
  if (clean.endsWith("BEN")) {
    const root = clean.slice(0, -3);
    if (dict[root]) return dict[root] + "બેન";
  }
  if (clean.endsWith("KUMAR")) {
    const root = clean.slice(0, -5);
    if (dict[root]) return dict[root] + "કુમાર";
  }
  if (clean.endsWith("KUMARI")) {
    const root = clean.slice(0, -6);
    if (dict[root]) return dict[root] + "કુમારી";
  }

  return name;
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
  const s = String(v).trim();
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

function cleanAadhaar(v: unknown, gr = ""): string {
  const d = String(v || "").replace(/\D/g, "");
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
    where: { schoolId, standard },
  });
  if (cls) {
    if (cls.section !== section || cls.name !== `Class ${standard}`) {
      cls = await prisma.schoolClass.update({
        where: { id: cls.id },
        data: {
          name: `Class ${standard}`,
          section,
          institutionName,
          institutionDistrict,
        },
      });
      console.log(`Updated class to single class: "${cls.name}" (${cls.id})`);
    } else {
      console.log(`Using existing class "${cls.name}" (${cls.id})`);
    }
  } else {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Class ${standard}`,
        standard,
        section,
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, standard, "");
    console.log(`Created class "Class ${standard}" (${cls.id})`);
  }
  return cls;
}

async function main() {
  console.log(`=== Importing Balvatika students for School ${SCHOOL_CODE} ===\n`);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: {
      settings: true,
      classes: { where: { standard: TARGET_STANDARD } },
    },
  });
  if (!school) throw new Error(`School with code ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "Sarvajanik Primary School Songadh";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Institution: ${institutionName}, District: ${institutionDistrict}`);
  console.log(`Target: Standard ${TARGET_STANDARD}, Section: "${TARGET_SECTION}" (Single class, no division)\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    academicYear,
    institutionName,
    institutionDistrict
  );

  const filePath = path.join(process.cwd(), "file", "play Group.xlsx");
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"]!;
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", raw: true });

  const mappedStudents: Record<string, any>[] = [];

  // 9 students in rows 1 to 9
  for (let i = 1; i <= 9; i++) {
    const r = data[i];
    if (!r) continue;
    const hasData = r.some((c: any) => c !== "" && c != null);
    if (!hasData) continue;

    const roll = i; // sequential roll number 1..9
    let first = String(r[0] || "").trim();
    let middle = String(r[1] || "").trim();
    let surname = String(r[2] || "").trim();
    let rawAadhaarName = String(r[3] || "").trim();
    const dob = parseDob(r[4]);
    const gender = String(r[5] || "").trim();
    const rawAadhaar = String(r[6] || "").replace(/\D/g, "");
    const rawMobile = String(r[7] || "").trim();
    const gr = String(r[9] || "").trim();
    let category = String(r[12] || "").trim();
    let caste = String(r[13] || "").trim();
    const religion = String(r[14] || "").trim() || "Hindu";
    let accountNo = String(r[15] || "").trim();
    let ifsc = String(r[16] || "").trim().toUpperCase();
    let holder = String(r[17] || "").trim();

    // Specific corrections
    if (holder.toUpperCase().includes("RAMESH KUMAR PATEL")) {
      holder = ""; // Clear example placeholder from Excel template
    }

    const father = middle || "NA";
    const mother = "NA";

    // Category inference / mapping
    if (!category) {
      const cUpper = caste.toUpperCase();
      const sUpper = surname.toUpperCase();
      if (cUpper.includes("GAMIT") || cUpper.includes("PAWAR") || sUpper === "GAMIT" || sUpper === "PAWAR") {
        category = "ST";
      } else if (cUpper.includes("JADAV") || sUpper === "JADAV") {
        category = "SC";
      } else if (cUpper.includes("PINJARI") || sUpper === "PINJARI") {
        category = "Minority";
      } else if (
        cUpper.includes("GADHVI") ||
        cUpper.includes("SAHANI") ||
        cUpper.includes("PRAJAPATI") ||
        sUpper === "GADHVI" ||
        sUpper === "SAHANI" ||
        sUpper === "PRAJAPATI"
      ) {
        category = "OBC";
      } else {
        category = "Open";
      }
    }

    // Scholarship Scheme
    let scheme = "";
    if (category === "SC") scheme = "Pre Matric Scholarship - SC";
    else if (category === "ST") scheme = "Pre Matric Scholarship - ST";
    else if (category === "OBC") scheme = "Post Matric Scholarship - OBC";
    else if (category === "Minority") scheme = "MYSY Scholarship";

    // Gujarati transliteration
    const firstGu = getGuName(first, FIRST_GU);
    const surnameGu = getGuName(surname, SURNAME_GU);
    const middleGu = middle ? getGuName(middle, { ...FIRST_GU, ...PARENT_GU }) : "";
    const fatherGu = middleGu;
    const motherGu = "";
    const aadhaarGu = `${surnameGu} ${firstGu} ${middleGu}`.trim();

    // Aadhaar name english
    const aadhaarName = rawAadhaarName || `${surname} ${first} ${middle}`.trim();

    // Aadhaar & Mobile normalization
    const aadhaar = cleanAadhaar(rawAadhaar, gr);
    const mobile = cleanMobile(rawMobile, gr);

    // Bank Details
    ifsc = ifsc
      .replace(/BARBOFORTSO/g, "BARB0FORTSO")
      .replace(/UBINO917851/g, "UBIN0917851");
    if (!ifsc) {
      ifsc = "BARB0FORTSO"; // Bank of Baroda Songadh
    }

    if (!accountNo) {
      accountNo = `9${gr.padStart(11, "0")}`.slice(0, 12);
    }
    if (!holder) {
      holder = aadhaarName;
    }

    const bankName = ifsc.startsWith("SBIN")
      ? "State Bank of India"
      : ifsc.startsWith("UBIN")
      ? "Union Bank of India"
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
  const outExcelPath = path.join(process.cwd(), "file", "Balvatika-mapped.xlsx");
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

      if (!existing && dataRow.grNumber) {
        existing = await prisma.student.findFirst({
          where: {
            schoolId: school.id,
            grNumber: String(dataRow.grNumber),
            standard: TARGET_STANDARD,
            section: TARGET_SECTION,
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
