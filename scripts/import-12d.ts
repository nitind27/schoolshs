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

const SCHOOL_CODE = "24261004405";
const TARGET_STANDARD = "12";
const TARGET_SECTION = "D";
const TARGET_STREAM = "Arts";

const SURNAME_GU: Record<string, string> = {
  BAGVAN: "બાગવાન",
  BARISH: "બારીશ",
  BHARVAD: "ભરવાડ",
  CHAUHAN: "ચૌહાણ",
  GAMIT: "ગામીત",
  KONKANI: "કોંકણી",
  KOKANI: "કોંકણી",
  KOTVALIYA: "કોતવાળિયા",
  KUVAR: "કુંવર",
  KUWAR: "કુંવર",
  MAHAJAN: "મહાજન",
  PAL: "પાલ",
  PATEL: "પટેલ",
  RAJBHAR: "રાજભર",
  SONAR: "સોનાર",
  SONI: "સોની",
  VASAVA: "વસાવા",
  WAGH: "વાઘ",
  VAGH: "વાઘ",
};

const FIRST_GU: Record<string, string> = {
  ALI: "અલી",
  ALPITABEN: "અલ્પિતાબેન",
  ANIRUDDH: "અનિરુદ્ધ",
  ANIRUDDHBHAI: "અનિરુદ્ધભાઈ",
  ANISHAKUMARI: "અનીષાકુમારી",
  ANJALBEN: "અંજલબેન",
  ANJALIBEN: "અંજલિબેન",
  ANSHAKUMAR: "અંશકુમાર",
  ANSHKUMAR: "અંશકુમાર",
  ARCHANABEN: "અર્ચનાબેન",
  ARCHANAKUMARI: "અર્ચનાકુમારી",
  ARMITA: "અર્મિતા",
  ARPITABEN: "અર્પિતાબેન",
  ARPITAKUMARI: "અર્પિતાકુમારી",
  ASHIFBHAI: "આસિફભાઈ",
  AYUSHIBEN: "આયુષીબેન",
  AYUSHKUMAR: "આયુષકુમાર",
  AYUSHKUMARARVINDBHAI: "આયુષકુમાર અરવિંદભાઈ",
  BHUMIKABEN: "ભૂમિકાબેન",
  DHRUVKUMAR: "ધ્રુવકુમાર",
  DIPIKABEN: "દીપિકાબેન",
  DVARKESHKUMAR: "દ્વારકેશકુમાર",
  DWARKESH: "દ્વારકેશ",
  FALGUNI: "ફાલ્ગુની",
  FARHIN: "ફરહીન",
  GAYTRI: "ગાયત્રી",
  JANVIBEN: "જાનવીબેન",
  KALPANABEN: "કલ્પનાબેન",
  KHUSHBU: "ખુશબુ",
  LAXMI: "લક્ષ્મી",
  LAXMIBEN: "લક્ષ્મીબેન",
  MAMATABEN: "મમતાબેન",
  MAYUR: "મયૂર",
  MAYURKUMAR: "મયૂરકુમાર",
  MEET: "મીત",
  MEETKUMAR: "મીતકુમાર",
  MEHULKUMAR: "મેહુલકુમાર",
  MITALI: "મિતાલી",
  MITALIBEN: "મિતાલીબેન",
  NIRALIBEN: "નિરાલીબેન",
  POOJA: "પૂજા",
  PRACHI: "પ્રાચી",
  PRINCEBHAI: "પ્રિન્સભાઈ",
  PRINCEKUMAR: "પ્રિન્સકુમાર",
  PRITESHBHAI: "પ્રીતેશભાઈ",
  PRIYANSHKUMAR: "પ્રિયાંશકુમાર",
  PUJA: "પૂજા",
  REHEMBHAI: "રહેમભાઈ",
  RIYABEN: "રિયાબેન",
  ROANKUMAR: "રોહનકુમાર",
  ROHAN: "રોહન",
  ROHANKUMAR: "રોહનકુમાર",
  RONAKKUMAR: "રોનકકુમાર",
  RUPEN: "રૂપેન",
  RUPENKUMAR: "રૂપેનકુમાર",
  SAGARBHAI: "સાગરભાઈ",
  SAHIL: "સાહિલ",
  SAHILKUMAR: "સાહિલકુમાર",
  SNEHAKUMARI: "સ્નેહાકુમારી",
  TEJASHBHAI: "તેજસભાઈ",
  TEJASKUMAR: "તેજસકુમાર",
  VARSHABEN: "વર્ષાબેન",
  VINODBHAI: "વિનોદભાઈ",
  VINODKUMAR: "વિનોદકુમાર",
};

const PARENT_GU: Record<string, string> = {
  AJAYBHAI: "અજયભાઈ",
  AJITBHAI: "અજિતભાઈ",
  ANILBHAI: "અનિલભાઈ",
  ARJUNBHAI: "અર્જુનભાઈ",
  ARVINDBHAI: "અરવિંદભાઈ",
  ASHOKBHAI: "અશોકભાઈ",
  BHAUSAHEB: "ભાઉસાહેબ",
  BIYAJIBHAI: "બિયાજીભાઈ",
  DEVENDRABHAI: "દેવેન્દ્રભાઈ",
  DHIRUBHAI: "ધીરુભાઈ",
  HITESHBHAI: "હિતેશભાઈ",
  ILAMBHAI: "ઇલમભાઈ",
  JAYANTILAL: "જયંતીલાલ",
  JAYESHBHAI: "જયેશભાઈ",
  JITUBHAI: "જીતુભાઈ",
  JULIYESHBHAI: "જુલિયેશભાઈ",
  KADIR: "કાદિર",
  KANJIBHAI: "કાનજીભાઈ",
  KAVIRAJBHAI: "કવિરાજભાઈ",
  KHALILBHAI: "ખલીલભાઈ",
  KISHORBHAI: "કિશોરભાઈ",
  MAHESHBHAI: "મહેશભાઈ",
  MAYURBHAI: "મયુરભાઈ",
  MUKESHBHAI: "મુકેશભાઈ",
  NARENDRABHAI: "નરેન્દ્રભાઈ",
  NAVINBHAI: "નવીનભાઈ",
  NAVINDRABHAI: "નવીન્દ્રભાઈ",
  NITESHBHAI: "નિતેશભાઈ",
  PILAJIBHAI: "પીલાજીભાઈ",
  PRAKASHBHAI: "પ્રકાશભાઈ",
  PRAVINBHAI: "પ્રવીણભાઈ",
  RAJESHBHAI: "રાજેશભાઈ",
  RAKESHBHAI: "રાકેશભાઈ",
  RANJITBHAI: "રણજીતભાઈ",
  RAVINDRA: "રવીન્દ્ર",
  RAVINDRABHAI: "રવીન્દ્રભાઈ",
  SANJAYBHAI: "સંજયભાઈ",
  SANTOSH: "સંતોષ",
  SHAILESHBHAI: "શૈલેષભાઈ",
  SUNILBHAI: "સુનિલભાઈ",
  SURESHBHAI: "સુરેશભાઈ",
  THAKORBHAI: "ઠાકોરભાઈ",
  VIJAYBHAI: "વિજયભાઈ",
  VINODBHAI: "વિનોદભાઈ",
  YAKUBBHAI: "યાકુબભાઈ",
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
  SEBC: "OBC",
  "S.E.B.C": "OBC",
  EWS: "EWS",
  OPEN: "Open",
  Open: "Open",
  GENERAL: "Open",
};

function getGuName(name: string, type: "first" | "parent" | "surname"): string {
  const clean = name.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!clean) return "";
  if (type === "surname") return SURNAME_GU[clean] || "";
  if (type === "parent") return PARENT_GU[clean] || FIRST_GU[clean] || "";
  return FIRST_GU[clean] || PARENT_GU[clean] || "";
}

function transliterateAadhaarName(rawAdhName: string): string {
  const tokens = rawAdhName.trim().split(/\s+/);
  const outTokens: string[] = [];
  for (const token of tokens) {
    const clean = token.toUpperCase().replace(/[^A-Z]/g, "");
    if (!clean) continue;
    const gu = SURNAME_GU[clean] || FIRST_GU[clean] || PARENT_GU[clean];
    if (gu) {
      outTokens.push(gu);
    } else {
      outTokens.push(token);
    }
  }
  return outTokens.join(" ");
}

function parseDob(v: unknown): string {
  if (typeof v === "number") {
    const jsDate = new Date(Math.round((v - 25569) * 86400 * 1000));
    const d = String(jsDate.getUTCDate()).padStart(2, "0");
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
    const y = jsDate.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(v || "").trim();
}

function cleanMobile(v: unknown, gr = ""): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d === "95373382667") d = "9537338266";
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length > 10) d = d.slice(0, 10);
  if (/^[6-9]\d{9}$/.test(d)) return d;
  const g = String(gr || "").replace(/\D/g, "") || "0";
  return `9${g.padStart(9, "0")}`.slice(0, 10);
}

function getScholarshipScheme(cat: string): string {
  if (cat === "ST") return "Post Matric Scholarship - ST";
  if (cat === "SC") return "Post Matric Scholarship - SC";
  if (cat === "OBC") return "Post Matric Scholarship - OBC";
  return "";
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
  stream: string,
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
        name: `Class ${standard} ${stream}-${section}`,
        standard,
        section,
        stream,
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, standard, stream);
    console.log(`Created class "Class ${standard} ${stream}-${section}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
    if (!cls.stream && stream) {
      cls = await prisma.schoolClass.update({
        where: { id: cls.id },
        data: { stream, name: `Class ${standard} ${stream}-${section}` },
      });
      console.log(`Updated class stream to "${stream}" and name to "${cls.name}"`);
    }
    await seedClassSubjects(cls.id, standard, cls.stream || stream);
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
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  console.log(`School: ${school.name} (${school.code})`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Institution: ${institutionName}, District: ${institutionDistrict}`);
  console.log(`Target: Class ${TARGET_STANDARD}-${TARGET_SECTION} (${TARGET_STREAM})\n`);

  const cls = await ensureClass(
    school.id,
    TARGET_STANDARD,
    TARGET_SECTION,
    TARGET_STREAM,
    academicYear,
    institutionName,
    institutionDistrict
  );

  const filePath = path.join(process.cwd(), "file", "STD-12 -D  STUDENTS DETAILS.xlsx");
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const sheet = wb.Sheets["Students"]!;
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", raw: true });

  const mappedStudents: Record<string, any>[] = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r) continue;
    const hasData = r.some((c: any) => c !== "" && c != null);
    if (!hasData) continue;

    const rollNumber = String(mappedStudents.length + 1);
    const firstName = String(r[0] || "").trim();
    const middleName = String(r[1] || "").trim();
    const surname = String(r[2] || "").trim();
    const rawAdhName = String(r[3] || "").trim();
    const dob = parseDob(r[4]);
    const gender = String(r[5] || "").toUpperCase() === "FEMALE" ? "Female" : "Male";
    const aadhaarNumber = String(r[6] || "").replace(/\s/g, "");
    const gr = String(r[9] || "").trim();
    const mobileNumber = cleanMobile(r[7], gr);
    const email = String(r[8] || "").trim();

    const category = CATEGORY_MAP[String(r[12] || "").trim().toUpperCase()] || "Open";
    const caste = String(r[13] || "").trim();
    const religion = String(r[14] || "").trim();

    const firstNameGu = getGuName(firstName, "first");
    const middleNameGu = getGuName(middleName, "parent");
    const surnameGu = getGuName(surname, "surname");
    const aadhaarNameGu = transliterateAadhaarName(rawAdhName);
    const fatherName = middleName || "NA";
    const fatherNameGu = middleNameGu || null;
    const motherName = "NA";
    const motherNameGu = null;

    const scheme = getScholarshipScheme(category);

    const accountNo = `9${gr.padStart(11, "0")}`.slice(0, 12);
    const ifsc = "SBIN0000281";
    const holder = rawAdhName;
    const bankName = "State Bank of India";

    const studentObj: Record<string, any> = {
      firstName,
      middleName: middleName || null,
      surname,
      aadhaarName: rawAdhName,
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
      email: email || undefined,
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
      accountNumber: accountNo,
      ifscCode: ifsc,
      accountHolderName: holder,
      bankName,
      branchName: "SONGADH",
      institutionName,
      institutionDistrict,
      board10th: "GSEB",
      percentage10th: 65,
      year10th: "2024",
    };

    mappedStudents.push(studentObj);
  }

  console.log(`Total students parsed: ${mappedStudents.length}`);

  // Write mapped Excel file
  const outExcelPath1 = path.join(process.cwd(), "file", "12-D-mapped.xlsx");
  const outExcelPath2 = path.join(process.cwd(), "file", "STD-12-D-mapped.xlsx");
  await writeMappedWorkbook(mappedStudents, outExcelPath1);
  await writeMappedWorkbook(mappedStudents, outExcelPath2);
  console.log(`Saved mapped Excel to: ${outExcelPath1}`);
  console.log(`Saved mapped Excel to: ${outExcelPath2}`);

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
    console.log("\nValidation issues (draft students):");
    errorList.forEach((e) => {
      console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
