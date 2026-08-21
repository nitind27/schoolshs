/**
 * Import Nileshkumar 10-A register into school 24261004405.
 * Source: file/NILESHKUMAR -10-A.xlsx (messy Gujarati register)
 *
 * Run: npx tsx scripts/import-nilesh-10a.ts
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

const SCHOOL_CODE = "24261004405";
const SOURCE = path.join(process.cwd(), "file", "NILESHKUMAR -10-A.xlsx");
const MAPPED_OUT = path.join(process.cwd(), "file", "NILESHKUMAR-10-A-mapped.xlsx");

const NAME_DICT: Record<string, string> = {
  બાગવાન: "BAGWAN",
  પઠાણ: "PATHAN",
  પાટીલ: "PATIL",
  શેખ: "SHEKH",
  શિંદે: "SHINDE",
  ઠાકોર: "THAKOR",
  શાહ: "SHAH",
  વાઘ: "WAGH",
  ખાટીક: "KHATIK",
  મનિયાર: "MANIYAR",
  ગોસ્વામી: "GOSWAMI",
  ગૌસ્વામી: "GOSWAMI",
  સુર્યવંશી: "SURYAVANSHI",
  ગામીત: "GAMIT",
  ગોડ: "GOD",
  કોંકણી: "KOKANI",
  કોંક્ણી: "KOKANI",
  નાયકા: "NAYKA",
  મિશ્રા: "MISHRA",
  પટેલ: "PATEL",
  પુરોહિત: "PUROHIT",
  સૈયદ: "SAIYED",
  આહિરે: "AHIRE",
  ગોસાવી: "GOSAVI",
  પિંજારી: "PINJARI",
  બેડસે: "BEDSE",
  ખાન: "KHAN",
  સોનગઢ: "SONGADH",
  વાંકવેલ: "VANKVEL",
  ઝરણપાડા: "ZARANPADA",
  ધમોડી: "DHAMODI",
  "રામપુરા.કો": "RAMPURA KO",
  બોરથવા: "BORTHAVA",
  ટોકરવા: "TOKARVA",
  બુરીવેલ: "BURIVEL",
  વાગડા: "VAGDA",
  પાંખરી: "PANKHARI",
  ચાંપાવાડી: "CHAMPAVADI",
  પીપળૅકૂવા: "PIPLAKUVA",
  રાનીઆંબા: "RANIAMBA",
  વડપાડા: "VADPADA",
  વડદા: "VADDA",
  સિંગપુર: "SINGPUR",
  કુનબી: "KUNBI",
  મહાર: "MAHAR",
  મરાઠા: "MARATHA",
  ઢોડિયા: "DHODIYA",
  બ્રાહમણ: "BRAHMIN",
  ચમાર: "CHAMAR",
  જૈન: "JAIN",
};

const CONS: Record<string, string> = {
  ક: "k", ખ: "kh", ગ: "g", ઘ: "gh", ઙ: "ng",
  ચ: "ch", છ: "chh", જ: "j", ઝ: "jh", ઞ: "ny",
  ટ: "t", ઠ: "th", ડ: "d", ઢ: "dh", ણ: "n",
  ત: "t", થ: "th", દ: "d", ધ: "dh", ન: "n",
  પ: "p", ફ: "f", બ: "b", ભ: "bh", મ: "m",
  ય: "y", ર: "r", લ: "l", વ: "v", શ: "sh", ષ: "sh", સ: "s", હ: "h", ળ: "l",
};
const IND_VOWEL: Record<string, string> = {
  અ: "a", આ: "a", ઇ: "i", ઈ: "i", ઉ: "u", ઊ: "u", ઋ: "ri",
  એ: "e", ઐ: "ai", ઓ: "o", ઔ: "au",
};
const MATRA: Record<string, string> = {
  "ા": "a", "િ": "i", "ી": "i", "ુ": "u", "ૂ": "u",
  "ે": "e", "ૈ": "ai", "ો": "o", "ૌ": "au", "ૃ": "ri",
};

function guToEn(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  if (NAME_DICT[trimmed]) return NAME_DICT[trimmed];
  const parts = trimmed.split(/([\s.]+)/);
  const out = parts
    .map((part) => {
      if (!part.trim()) return part;
      if (/^[\s.]+$/.test(part)) return part;
      if (NAME_DICT[part]) return NAME_DICT[part];
      return transliterateWord(part);
    })
    .join("");
  return out.replace(/\s+/g, " ").trim().toUpperCase();
}

function transliterateWord(word: string): string {
  let result = "";
  let i = 0;
  const chars = [...word];
  while (i < chars.length) {
    const ch = chars[i]!;
    if (IND_VOWEL[ch]) {
      result += IND_VOWEL[ch];
      i += 1;
      continue;
    }
    if (CONS[ch]) {
      const next = chars[i + 1] || "";
      if (next === "્") {
        result += CONS[ch];
        i += 2;
        continue;
      }
      if (MATRA[next]) {
        result += CONS[ch] + MATRA[next];
        i += 2;
        continue;
      }
      if (next === "ં") {
        result += CONS[ch] + "an";
        i += 2;
        continue;
      }
      result += CONS[ch] + "a";
      i += 1;
      continue;
    }
    if (ch === "ં") {
      result += "n";
      i += 1;
      continue;
    }
    if (ch === "ઃ" || ch === "ઁ") {
      i += 1;
      continue;
    }
    result += ch;
    i += 1;
  }
  return result.replace(/aa+/g, "a").replace(/([kgcjtdpb])a$/i, "$1");
}

function cell(row: unknown[], i: number): string {
  const v = row[i];
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function parseMdY(value: string): string {
  const s = String(value || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return s;
  const month = m[1]!.padStart(2, "0");
  const day = m[2]!.padStart(2, "0");
  let year = m[3]!;
  if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`;
  return `${day}/${month}/${year}`;
}

function digits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function cleanUid(value: string): string {
  return String(value || "").replace(/^[,\s]+/, "").replace(/\s/g, "").trim();
}

function cleanAadhaar(value: string): string {
  const d = digits(value);
  if (d.length === 12) return d;
  return "";
}

function placeholderAadhaar(gr: string, serial: string): string {
  const base = digits(gr || serial).padStart(11, "0").slice(-11);
  return `9${base}`;
}

function cleanMobile(value: string): string {
  const d = digits(value);
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length > 10) return d.slice(-10);
  return d;
}

function cleanEmail(value: string): string {
  let s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/gamil/g, "gmail")
    .replace(/gamit\.com$/g, "gmail.com")
    .replace(/\.come$/g, ".com")
    .replace(/gmail\.come/g, "gmail.com");
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  return s;
}

function cleanIfsc(value: string): string {
  let s = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  const known: Record<string, string> = {
    BARBOFORTSO: "BARB0FORTSO",
    BARB0FORTSO: "BARB0FORTSO",
    BARBOUKAIXX: "BARB0UKAIXX",
    BARB0UKAIXX: "BARB0UKAIXX",
    SBINOOOO281: "SBIN0000281",
    SBIN0000281: "SBIN0000281",
    SBINOOOO3851: "SBIN0003851",
    SBIN00003851: "SBIN0003851",
  };
  if (known[s]) s = known[s]!;
  if (s.length >= 5 && (s[4] === "O" || s[4] === "0")) {
    s = s.slice(0, 4) + "0" + s.slice(5);
  }
  if (s.length > 11 && /^SBIN0+$/.test(s.slice(0, 8))) {
    s = "SBIN0" + s.slice(-6);
  }
  if (s.length > 11) s = s.slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) return "";
  return s;
}

function bankFromIfsc(ifsc: string, fallback = ""): string {
  const prefix = ifsc.slice(0, 4);
  const map: Record<string, string> = {
    BARB: "BANK OF BARODA",
    SBIN: "STATE BANK OF INDIA",
    UBIN: "UNION BANK OF INDIA",
    BKID: "BANK OF INDIA",
    MAHB: "BANK OF MAHARASHTRA",
  };
  return map[prefix] || fallback;
}

function cleanAccount(value: string): string {
  let s = String(value || "").replace(/\s/g, "").trim();
  if (!s || /^no$/i.test(s)) return "";
  if (s.startsWith("O") && /^\d+$/.test(s.slice(1))) s = "0" + s.slice(1);
  s = s.replace(/O/g, "0");
  const d = s.replace(/\D/g, "");
  return d.length >= 9 && d.length <= 18 ? d : d;
}

function cleanRation(value: string): string {
  const s = String(value || "").trim();
  if (!s) return "";
  const num = s.split("-")[0]?.replace(/\s/g, "") || "";
  return num;
}

function parseJati(raw: string): { religion: string; caste: string } {
  const s = String(raw || "").trim();
  const lower = s.toLowerCase();
  const muslim =
    lower.includes("મુ") ||
    lower.includes("મૌલા") ||
    lower.includes("મુસ્લ") ||
    /muslim/i.test(s);
  const jain = lower.includes("જૈન");
  const religion = jain ? "Jain" : muslim ? "Muslim" : "Hindu";
  const casteGu = s
    .replace(/હિ[.,]?\s*/g, "")
    .replace(/મુ[.,]?\s*/g, "")
    .replace(/મૌલા[.,]?\s*/g, "")
    .replace(/મુસ્લીમ|મુસ્લિમ/g, "")
    .replace(/[.]/g, " ")
    .trim();
  const caste = guToEn(casteGu) || (muslim ? "MUSLIM" : "GENERAL");
  return { religion, caste };
}

function splitStudentName(fullGu: string): {
  surnameGu: string;
  firstNameGu: string;
  fatherNameGu: string;
  middleNameGu: string;
} {
  const tokens = fullGu.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return { surnameGu: "", firstNameGu: "", fatherNameGu: "", middleNameGu: "" };
  }
  if (tokens.length === 1) {
    return { surnameGu: tokens[0]!, firstNameGu: tokens[0]!, fatherNameGu: "", middleNameGu: "" };
  }
  if (tokens.length === 2) {
    return {
      surnameGu: tokens[0]!,
      firstNameGu: tokens[1]!,
      fatherNameGu: "",
      middleNameGu: "",
    };
  }
  return {
    surnameGu: tokens[0]!,
    firstNameGu: tokens[1]!,
    middleNameGu: tokens.slice(2).join(" "),
    fatherNameGu: tokens[tokens.length - 1]!,
  };
}

function guessGender(serial: number, firstNameGu: string): "Male" | "Female" {
  const n = firstNameGu;
  if (/બેન$|કુમારી|કુમારી$/.test(n)) return "Female";
  if (/કુમાર$/.test(n)) return "Male";
  return serial <= 28 ? "Female" : "Male";
}

function schemeFor(category: string): string {
  const list = scholarshipSchemesForCategory(category);
  if (category === "ST") return "Pre Matric Scholarship - ST";
  if (category === "SC") return "Pre Matric Scholarship - SC";
  return list[0] || "";
}

type MappedStudent = Record<string, unknown> & {
  _serial: number;
  _sourceName: string;
};

function parseRegister(): MappedStudent[] {
  const buf = fs.readFileSync(SOURCE);
  const wb = XLSX.read(buf, { type: "buffer", raw: false });
  const ws = wb.Sheets.Sheet1;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as unknown[][];
  const out: MappedStudent[] = [];

  for (const row of rows) {
    const serial = cell(row, 0);
    const gr = cell(row, 1);
    const nameGu = cell(row, 2);
    if (!/^\d+$/.test(serial) || !nameGu) continue;

    const motherGu = cell(row, 3);
    const villageGu = cell(row, 4);
    const jati = cell(row, 5);
    const dobRaw = cell(row, 6);
    const admRaw = cell(row, 7);
    const aadhaarRaw = cell(row, 8);
    const uidRaw = cell(row, 9);
    const mobileRaw = cell(row, 10);
    const accountRaw = cell(row, 11);
    const branchGu = cell(row, 12);
    const ifscRaw = cell(row, 14);
    const motherAadhaarRaw = cell(row, 15);
    const fatherAadhaarRaw = cell(row, 16);
    const pen = cell(row, 17);
    const emailRaw = cell(row, 18);
    const rationRaw = cell(row, 19);

    const names = splitStudentName(nameGu);
    const serialNum = Number(serial);
    const gender = guessGender(serialNum, names.firstNameGu);
    const { religion, caste } = parseJati(jati);
    const surname = guToEn(names.surnameGu);
    const firstName = guToEn(names.firstNameGu);
    const middleName = guToEn(names.middleNameGu);
    const fatherName = guToEn(names.fatherNameGu) || middleName || "NA";
    const motherName = guToEn(motherGu) || "NA";
    const inferred = inferCategoryFromFields({
      surname,
      caste,
      religion,
    });
    const casteKey = caste.toUpperCase();
    const categoryOverride: Record<string, typeof inferred.category> = {
      GAMIT: "ST",
      KOKANI: "ST",
      NAYKA: "ST",
      KUNBI: "ST",
      KUNABI: "ST",
      DHODIYA: "ST",
      DHODIA: "ST",
      WAGH: "ST",
      CHAMAR: "SC",
      MAHAR: "SC",
      MAHARA: "SC",
      THAKOR: "OBC",
      KHATIK: "OBC",
      BAGWAN: "Minority",
      PATHAN: "Minority",
      SHEKH: "Minority",
      KHAN: "Minority",
      SAIYED: "Minority",
      PINJARI: "Minority",
    };
    const category =
      categoryOverride[casteKey] ||
      categoryOverride[surname] ||
      inferred.category;
    const villageEn = guToEn(villageGu) || "SONGADH";
    const city = villageEn === "SONGADH" ? "Songadh" : villageEn;
    const address = villageGu
      ? `${villageEn}, Songadh, Tapi, Gujarat`
      : "Songadh, Tapi, Gujarat";
    const ifsc = cleanIfsc(ifscRaw);
    const account = cleanAccount(accountRaw);
    const aadhaar = cleanAadhaar(aadhaarRaw) || placeholderAadhaar(gr, serial);
    const mobile = cleanMobile(mobileRaw) || "0000000000";
    const email = cleanEmail(emailRaw);
    const childUid = cleanUid(uidRaw).replace(/^,/, "");
    const ration = cleanRation(rationRaw);
    const bpl = /bpl/i.test(rationRaw);
    const income = bpl ? 60000 : 120000;
    const aadhaarName = [firstName, middleName, surname].filter(Boolean).join(" ");

    out.push({
      _serial: serialNum,
      _sourceName: nameGu,
      firstName,
      middleName,
      surname,
      firstNameGu: names.firstNameGu,
      middleNameGu: names.middleNameGu || null,
      surnameGu: names.surnameGu,
      aadhaarName,
      aadhaarNameGu: nameGu,
      dateOfBirth: parseMdY(dobRaw),
      gender,
      aadhaarNumber: aadhaar,
      rationCardNumber: ration,
      mobileNumber: mobile,
      email,
      motherName,
      fatherName,
      motherNameGu: motherGu || null,
      fatherNameGu: names.fatherNameGu || null,
      motherAadhaarNumber: cleanAadhaar(motherAadhaarRaw),
      fatherAadhaarNumber: cleanAadhaar(fatherAadhaarRaw),
      category,
      caste,
      religion,
      maritalStatus: "Unmarried",
      parentOccupation: "Daily Wage Labour",
      isOrphan: "No",
      annualFamilyIncome: income,
      currentAddress: address,
      currentDistrict: "Tapi",
      currentCity: city,
      currentPincode: "394670",
      permanentAddress: address,
      permanentDistrict: "Tapi",
      permanentCity: city,
      permanentPincode: "394670",
      habitationType: "Own",
      familySize: 5,
      residentType: city === "Songadh" ? "Urban" : "Rural",
      isHosteler: "No",
      scholarshipScheme: schemeFor(category),
      financialYear: "2025-26",
      courseType: "Secondary",
      courseName: standardToCourseName("10"),
      currentYear: "2nd Year",
      admissionType: "Regular",
      startDate: parseMdY(admRaw),
      board10th: "",
      percentage10th: 0,
      year10th: "",
      bankName:
        bankFromIfsc(ifsc) ||
        (/b\.?g\.?g/i.test(ifscRaw) ? "BARODA GUJARAT GRAMIN BANK" : "") ||
        (branchGu ? "BANK OF BARODA" : ""),
      branchName: guToEn(branchGu) || (ifsc.startsWith("BARB") || ifsc.startsWith("SBIN") ? "SONGADH" : ""),
      accountNumber: account,
      ifscCode: ifsc,
      accountHolderName: aadhaarName,
      rollNumber: String(serialNum),
      grNumber: gr,
      standard: "10",
      section: "A",
      childUid: /^\d{16,18}$/.test(childUid) ? childUid : "",
      apaarId: "",
      penNumber: /^\d{8,16}$/.test(digits(pen)) ? digits(pen).slice(0, 16) : "",
    });
  }

  return out.sort((a, b) => a._serial - b._serial);
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
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source file missing: ${SOURCE}`);
  }

  const mapped = parseRegister();
  console.log(`Parsed ${mapped.length} students from register`);
  await writeMappedWorkbook(mapped);
  console.log(`Wrote structured file: ${MAPPED_OUT}`);

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
    where: {
      schoolId: school.id,
      standard: "10",
      section: "A",
      academicYear,
    },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: "Class 10-A",
        standard: "10",
        section: "A",
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, "10", "");
    console.log("Created class 10-A", cls.id);
  } else {
    console.log("Using class 10-A", cls.id);
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
        validationErrors:
          validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
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

  console.log("\nImport result", stats);
  if (errors.length) {
    console.log("\nRows with missing fields / warnings:");
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
