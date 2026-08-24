/**
 * Import Std 10-B register into school 24261004405.
 * Source: file/૨૬-૨૭.xlsx (Gujarati headers, US-style dates)
 *
 * Run: npx tsx scripts/import-10b.ts
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
const FILE_DIR = path.join(process.cwd(), "file");
const SOURCE = path.join(
  FILE_DIR,
  fs.readdirSync(FILE_DIR).find((f) => f.endsWith(".xlsx") && f.includes("૨૬")) || "૨૬-૨૭.xlsx",
);
const MAPPED_OUT = path.join(FILE_DIR, "10-B-mapped.xlsx");

const NAME_DICT: Record<string, string> = {
  ગામીત: "GAMIT",
  પાડવી: "PADVI",
  વાઘમારે: "WAGHMARE",
  વસાવા: "VASAVA",
  ગોગારી: "GOGARI",
  મહીરે: "MAHIRE",
  મોહીતે: "MOHITE",
  ભરવાડ: "BHARWAD",
  બાગુલ: "BAGUL",
  કાપડે: "KAPDE",
  ગોસ્વામી: "GOSWAMI",
  ગુરવ: "GURAV",
  કુંવર: "KUNWAR",
  ખાટીક: "KHATIK",
  પ્રજાપતિ: "PRAJAPATI",
  મહેતા: "MEHTA",
  પાટીલ: "PATIL",
  શેખ: "SHEKH",
  ખાન: "KHAN",
  બાગવાન: "BAGWAN",
  અન્સારી: "ANSARI",
  મીસ્ત્રી: "MISTRI",
  પઠાણ: "PATHAN",
  મલેક: "MALEK",
  ગાડગે: "GADGE",
  કુરેશી: "KURESHI",
  કોળી: "KOLI",
  પીપરોતર: "PIPROTAR",
  કોકણી: "KOKANI",
  વારલી: "WARLI",
  ભીલ: "BHIL",
  તેલી: "TELI",
  સુથાર: "SUTHAR",
  કુંભાર: "KUMBHAR",
  વાણિયા: "VANIYA",
  ગાડીલુંહાર: "GADILUHAR",
  દોરીક: "DORIK",
  ભટકેજોષી: "BHATKEJOSHI",
  સગર: "SAGAR",
  મણિયાર: "MANIYAR",
  કુનબી: "KUNBI",
  મહાર: "MAHAR",
  ચમાર: "CHAMAR",
  સોનગઢ: "SONGADH",
};

const KNOWN_SURNAMES = [
  "પીપરોતર", "વાઘમારે", "ભરવાડ", "પ્રજાપતિ", "ગોસ્વામી",
  "ગામીત", "પાડવી", "વસાવા", "ગોગારી", "મહીરે", "મોહીતે",
  "બાગુલ", "કાપડે", "ગુરવ", "કુંવર", "ખાટીક", "મહેતા",
  "અન્સારી", "મીસ્ત્રી", "મલેક", "ગાડગે", "કુરેશી", "કોળી",
  "કોકણી", "પાટીલ", "બાગવાન", "પઠાણ", "શેખ", "ખાન",
].sort((a, b) => b.length - a.length);

const JATI_MAP: Record<string, { religion: string; caste: string }> = {
  "હિ.ગા.": { religion: "Hindu", caste: "GAMIT" },
  "હિ.ગા": { religion: "Hindu", caste: "GAMIT" },
  "હિ.વસાવા": { religion: "Hindu", caste: "VASAVA" },
  "હિ.વારલી": { religion: "Hindu", caste: "WARLI" },
  "હિ.ભીલ": { religion: "Hindu", caste: "BHIL" },
  "હિ.મહાર": { religion: "Hindu", caste: "MAHAR" },
  "હિ.ચમાર": { religion: "Hindu", caste: "CHAMAR" },
  "હિ.ભરવાડ": { religion: "Hindu", caste: "BHARWAD" },
  "હિ.તેલી": { religion: "Hindu", caste: "TELI" },
  "હિ.સુથાર": { religion: "Hindu", caste: "SUTHAR" },
  "હિ.ગોસ્વામી": { religion: "Hindu", caste: "GOSWAMI" },
  "હિ.ગુરવ": { religion: "Hindu", caste: "GURAV" },
  "હિ.ગાડીલુંહાર": { religion: "Hindu", caste: "GADILUHAR" },
  "મુ.ખાટીક": { religion: "Muslim", caste: "KHATIK" },
  "હિ.કુંભાર": { religion: "Hindu", caste: "KUMBHAR" },
  "હિ.વાણિયા": { religion: "Hindu", caste: "VANIYA" },
  "હિ.પાટીલ": { religion: "Hindu", caste: "PATIL" },
  "ઇસ્લામશેખ": { religion: "Muslim", caste: "SHEKH" },
  "મુ.ખાન": { religion: "Muslim", caste: "KHAN" },
  "મુ.શેખ": { religion: "Muslim", caste: "SHEKH" },
  "મુ.મણિયાર": { religion: "Muslim", caste: "MANIYAR" },
  "મુ.બાગવાન": { religion: "Muslim", caste: "BAGWAN" },
  મુસ્લિમ: { religion: "Muslim", caste: "MUSLIM" },
  સુન્નીમુસ્લિમ: { religion: "Muslim", caste: "MUSLIM" },
  "હિ.કુનબી": { religion: "Hindu", caste: "KUNBI" },
  "હિ.દોરીક": { religion: "Hindu", caste: "DORIK" },
  "હિ.ભટકેજોષી": { religion: "Hindu", caste: "BHATKEJOSHI" },
  "હિ.કોળી": { religion: "Hindu", caste: "KOLI" },
  "હિ.સગર": { religion: "Hindu", caste: "SAGAR" },
  "હિ.કોકણી": { religion: "Hindu", caste: "KOKANI" },
  "હિ.પાડવી": { religion: "Hindu", caste: "PADVI" },
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
  return trimmed
    .split(/([\s.]+)/)
    .map((part) => {
      if (!part.trim() || /^[\s.]+$/.test(part)) return part;
      if (NAME_DICT[part]) return NAME_DICT[part];
      return transliterateWord(part);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/BENA\b/g, "BEN");
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

function cleanAadhaar(value: string): string {
  const d = digits(value);
  return d.length === 12 ? d : "";
}

function placeholderAadhaar(gr: string, serial: string): string {
  const base = digits(gr || serial).padStart(10, "0").slice(-10);
  return `92${base}`;
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
    .replace(/gmail\.co$/g, "gmail.com")
    .replace(/\.come$/g, ".com")
    .replace(/\.+$/, "");
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  return s;
}

function cleanIfsc(value: string): string {
  let s = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  const known: Record<string, string> = {
    SBINOOOO281: "SBIN0000281",
    SBIN0000281: "SBIN0000281",
    BARBOFORTSO: "BARB0FORTSO",
    BARB0FORTSO: "BARB0FORTSO",
    BARB0FORSTO: "BARB0FORTSO",
    BARBOF0RTSO: "BARB0FORTSO",
    BARBF0RTSO: "BARB0FORTSO",
    BARBOUKAIXX: "BARB0UKAIXX",
    BARB0UKAIXX: "BARB0UKAIXX",
    UBINO562726: "UBIN0562726",
    UBIN0562726: "UBIN0562726",
    UBIN0917851: "UBIN0917851",
    BKID00002541: "BKID0002541",
    BKID0002541: "BKID0002541",
    SBIN0011024: "SBIN0011024",
    SDCB0000008: "SDCB0000008",
  };
  if (known[s]) s = known[s]!;
  if (s.length >= 5 && (s[4] === "O" || s[4] === "0")) {
    s = `${s.slice(0, 4)}0${s.slice(5)}`;
  }
  if (s.length > 11 && /^SBIN0+$/.test(s.slice(0, 8))) {
    s = `SBIN0${s.slice(-6)}`;
  }
  if (s.length > 11) s = s.slice(0, 11);
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) return "";
  return s;
}

function bankFromIfsc(ifsc: string, fallback = ""): string {
  const map: Record<string, string> = {
    BARB: "BANK OF BARODA",
    SBIN: "STATE BANK OF INDIA",
    UBIN: "UNION BANK OF INDIA",
    BKID: "BANK OF INDIA",
    SDCB: "DISTRICT CO-OPERATIVE BANK",
  };
  return map[ifsc.slice(0, 4)] || fallback;
}

function parseBank(raw: string): { bankName: string; branchName: string; ifscGuess: string } {
  const s = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!s) return { bankName: "", branchName: "", ifscGuess: "" };
  const branch = s.includes("BARDIPADA") ? "BARDIPADA"
    : s.includes("UKAI") ? "UKAI"
    : s.includes("SAGBARA") ? "SAGBARA"
    : s.includes("PAKHARI") ? "PAKHARI"
    : s.includes("MIRKOT") ? "MIRKOT"
    : s.includes("GUNDI") ? "GUNDI"
    : s.includes("SINGPUR") ? "SINGPUR"
    : s.includes("RUMKI") ? "RUMKI TALAV"
    : "SONGADH";
  if (/B\.?G\.?G\.?B|BGGB|BGBB/.test(s)) {
    return { bankName: "BARODA GUJARAT GRAMIN BANK", branchName: branch, ifscGuess: "" };
  }
  if (/\bSBI\b|SBIN/.test(s)) {
    return {
      bankName: "STATE BANK OF INDIA",
      branchName: branch,
      ifscGuess: branch === "SONGADH" ? "SBIN0000281" : branch === "SAGBARA" ? "SBIN0011024" : "",
    };
  }
  if (/\bBOB\b|B0B|BARB/.test(s)) {
    return {
      bankName: "BANK OF BARODA",
      branchName: branch,
      ifscGuess: branch === "UKAI" ? "BARB0UKAIXX" : branch === "SONGADH" ? "BARB0FORTSO" : "",
    };
  }
  if (/\bUBI\b|UBOI|UBIN/.test(s)) {
    return {
      bankName: "UNION BANK OF INDIA",
      branchName: branch,
      ifscGuess: branch === "SONGADH" ? "UBIN0917851" : branch === "BARDIPADA" ? "UBIN0562726" : "",
    };
  }
  if (/\bBOI\b|BKID/.test(s)) {
    return { bankName: "BANK OF INDIA", branchName: branch, ifscGuess: "BKID0002541" };
  }
  if (/S\.?D\.?C\.?B|SDCB/.test(s)) {
    return { bankName: "DISTRICT CO-OPERATIVE BANK", branchName: branch, ifscGuess: "SDCB0000008" };
  }
  return { bankName: guToEn(raw) || s, branchName: branch, ifscGuess: "" };
}

function cleanAccount(value: string): string {
  let s = String(value || "").replace(/\s/g, "").trim();
  if (!s || /^no$/i.test(s)) return "";
  if (s.startsWith("O") && /^\d+$/.test(s.slice(1))) s = `0${s.slice(1)}`;
  return s.replace(/O/g, "0").replace(/\D/g, "");
}

function cleanRation(value: string): string {
  let s = String(value || "").replace(/[\s\-]/g, "").toUpperCase();
  if (!s) return "";
  if (s.length > 15 && /^[AB]/.test(s)) s = s.slice(1);
  if (s.length > 15) s = s.slice(-15);
  return s;
}

function cleanUid(value: string): string {
  const d = digits(value);
  return d.length > 18 ? d.slice(0, 18) : d;
}

function parseJati(raw: string): { religion: string; caste: string } {
  const key = String(raw || "").replace(/\s+/g, "").trim();
  if (JATI_MAP[key]) return JATI_MAP[key]!;
  const s = String(raw || "").trim();
  const muslim = /મુ|ઇસ્લામ|મુસ્લ|muslim|islam/i.test(s);
  const casteGu = s.replace(/હિ[.,]?\s*/g, "").replace(/મુ[.,]?\s*/g, "").replace(/[.]/g, " ").trim();
  return {
    religion: muslim ? "Muslim" : "Hindu",
    caste: guToEn(casteGu) || (muslim ? "MUSLIM" : "GENERAL"),
  };
}

function splitGluedName(token: string): { first: string; father: string } {
  const ben = token.match(/^(.*?બેન)(.+)$/);
  if (ben?.[2]) return { first: ben[1]!, father: ben[2]! };
  const kumari = token.match(/^(.*?કુમારી)(.+)$/);
  if (kumari?.[2]) return { first: kumari[1]!, father: kumari[2]! };
  const kumar = token.match(/^(.*?કુમાર)(?!ી)(.+)$/);
  if (kumar?.[2]) return { first: kumar[1]!, father: kumar[2]! };
  const bhai = token.match(/^(.{2,14}?)(.{4,}ભાઈ)$/) || token.match(/^(.{2,14}?)(.{4,}ભાઇ)$/);
  if (bhai?.[2] && bhai[1]!.length >= 2) return { first: bhai[1]!, father: bhai[2]! };
  return { first: token, father: "" };
}

function splitStudentName(fullGu: string): {
  surnameGu: string;
  firstNameGu: string;
  fatherNameGu: string;
  middleNameGu: string;
} {
  let rest = fullGu.replace(/\s+/g, " ").trim();
  let surnameGu = "";
  const glued = KNOWN_SURNAMES.find((s) => rest.startsWith(s));
  if (glued) {
    surnameGu = glued;
    rest = rest.slice(glued.length).trim();
  }
  const tokens = rest.split(" ").filter(Boolean);
  if (!surnameGu && tokens.length) surnameGu = tokens.shift()!;
  if (tokens.length === 0) {
    return { surnameGu, firstNameGu: surnameGu, fatherNameGu: "", middleNameGu: "" };
  }
  if (tokens.length === 1) {
    const split = splitGluedName(tokens[0]!);
    return {
      surnameGu,
      firstNameGu: split.first,
      fatherNameGu: split.father,
      middleNameGu: split.father,
    };
  }
  const firstSplit = splitGluedName(tokens[0]!);
  const fatherNameGu = firstSplit.father || tokens.slice(1).join(" ");
  return {
    surnameGu,
    firstNameGu: firstSplit.first,
    middleNameGu: fatherNameGu,
    fatherNameGu,
  };
}

function guessGender(serial: number, firstNameGu: string): "Male" | "Female" {
  if (/બેન$|કુમારી/.test(firstNameGu)) return "Female";
  if (/કુમાર$/.test(firstNameGu) && !/કુમારી/.test(firstNameGu)) return "Male";
  return serial <= 32 ? "Female" : "Male";
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
  const ws = wb.Sheets[wb.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as unknown[][];
  const out: MappedStudent[] = [];

  for (const row of rows) {
    const serial = cell(row, 0);
    const nameGu = cell(row, 1);
    const gr = cell(row, 2);
    if (!/^\d+$/.test(serial) || !nameGu || !gr) continue;

    const names = splitStudentName(nameGu);
    const serialNum = Number(serial);
    const gender = guessGender(serialNum, names.firstNameGu);
    const { religion, caste } = parseJati(cell(row, 5));
    const surname = guToEn(names.surnameGu);
    const firstName = guToEn(names.firstNameGu);
    const middleName = guToEn(names.middleNameGu);
    const fatherName = guToEn(names.fatherNameGu) || middleName || "NA";
    const motherGu = cell(row, 9);
    const motherName = guToEn(motherGu) || "NA";
    const inferred = inferCategoryFromFields({ surname, caste, religion });
    const casteKey = caste.toUpperCase();
    const categoryOverride: Record<string, typeof inferred.category> = {
      GAMIT: "ST", VASAVA: "ST", WARLI: "ST", BHIL: "ST", KOKANI: "ST", PADVI: "ST",
      KUNBI: "ST", KUNABI: "ST", CHAMAR: "SC", MAHAR: "SC", BHARWAD: "OBC", TELI: "OBC",
      SUTHAR: "OBC", GOSWAMI: "OBC", GURAV: "OBC", KUMBHAR: "OBC", PRAJAPATI: "OBC",
      KOLI: "OBC", SAGAR: "OBC", PATIL: "OBC", DORIK: "OBC", BHATKEJOSHI: "OBC",
      GADILUHAR: "OBC", VANIYA: "Open", MEHTA: "Open",
      KHATIK: religion === "Muslim" ? "Minority" : "OBC",
      BAGWAN: "Minority", PATHAN: "Minority", SHEKH: "Minority", KHAN: "Minority",
      MANIYAR: "Minority", MALEK: "Minority", KURESHI: "Minority", ANSARI: "Minority",
      MUSLIM: "Minority",
    };
    const category =
      categoryOverride[casteKey] || categoryOverride[surname] || inferred.category;

    const addrGu = cell(row, 7);
    const addrEn = guToEn(addrGu) || "SONGADH";
    const city = /SONGADH/i.test(addrEn) ? "Songadh" : addrEn.split(",")[0]!.trim() || "Songadh";
    const address = addrGu ? `${addrEn}, Tapi, Gujarat` : "Songadh, Tapi, Gujarat";
    const parsedBank = parseBank(cell(row, 11));
    const ifsc = cleanIfsc(cell(row, 12)) || parsedBank.ifscGuess;
    const aadhaar = cleanAadhaar(cell(row, 8)) || placeholderAadhaar(gr, serial);
    const ration = cleanRation(cell(row, 10));
    const childUid = cleanUid(cell(row, 6));
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
      dateOfBirth: parseMdY(cell(row, 3)),
      gender,
      aadhaarNumber: aadhaar,
      rationCardNumber: ration,
      mobileNumber: cleanMobile(cell(row, 4)) || "0000000000",
      email: cleanEmail(cell(row, 14)),
      motherName,
      fatherName,
      motherNameGu: motherGu || null,
      fatherNameGu: names.fatherNameGu || null,
      motherAadhaarNumber: "",
      fatherAadhaarNumber: "",
      category,
      caste,
      religion,
      maritalStatus: "Unmarried",
      parentOccupation: "Daily Wage Labour",
      isOrphan: "No",
      annualFamilyIncome: /^b/i.test(ration) ? 60000 : 120000,
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
      residentType: /SONGADH/i.test(city) ? "Urban" : "Rural",
      isHosteler: "No",
      scholarshipScheme: schemeFor(category),
      financialYear: "2025-26",
      courseType: "Secondary",
      courseName: standardToCourseName("10"),
      currentYear: "2nd Year",
      admissionType: "Regular",
      startDate: "",
      board10th: "",
      percentage10th: 0,
      year10th: "",
      bankName: bankFromIfsc(ifsc, parsedBank.bankName) || parsedBank.bankName,
      branchName: parsedBank.branchName || (ifsc ? "SONGADH" : ""),
      accountNumber: cleanAccount(cell(row, 13)),
      ifscCode: ifsc,
      accountHolderName: aadhaarName,
      rollNumber: String(serialNum),
      grNumber: gr,
      standard: "10",
      section: "B",
      childUid: /^\d{16,18}$/.test(childUid) ? childUid : childUid || "",
      apaarId: "",
      penNumber: "",
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
  if (!fs.existsSync(SOURCE)) throw new Error(`Source file missing: ${SOURCE}`);

  const mapped = parseRegister();
  console.log(`Parsed ${mapped.length} students from ${path.basename(SOURCE)}`);
  for (const row of mapped.slice(0, 6)) {
    console.log(`  #${row._serial} GR=${row.grNumber} ${row.surname} ${row.firstName} ${row.middleName}`);
  }
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
    where: { schoolId: school.id, standard: "10", section: "B", academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId: school.id,
        name: "Class 10-B",
        standard: "10",
        section: "B",
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, "10", "");
    console.log("Created class 10-B", cls.id);
  } else {
    console.log("Using class 10-B", cls.id);
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

  console.log("\nImport result", stats);
  if (errors.length) {
    console.log("\nRows with missing fields / warnings:");
    for (const e of errors.slice(0, 50)) {
      console.log(`  #${e.serial} ${e.name}: ${e.errors.join("; ")}`);
    }
    if (errors.length > 50) console.log(`  … ${errors.length - 50} more`);
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
