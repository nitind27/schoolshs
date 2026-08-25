/**
 * Convert file/archika 25 26.xlsx → proper Students import template.
 * Sheets: 10-E, 10-C, 10-D, 9-C  |  School / UDISE: 24261004405
 */
import * as XLSX from "xlsx";
import path from "path";
import { writeFileSync } from "fs";
import { CSV_HEADERS, CSV_HEADER_LABELS, standardToCourseName } from "../src/lib/constants";

const SCHOOL_CODE = "24261004405";
const SRC = path.join("file", "archika 25 26.xlsx");
const OUT = path.join("file", `archika-students-import-${SCHOOL_CODE}.xlsx`);

const SHEET_MAP: Record<string, { standard: string; section: string }> = {
  "ABC 10 E": { standard: "10", section: "E" },
  " MHP 10 C": { standard: "10", section: "C" },
  "MHP 10 C": { standard: "10", section: "C" },
  "MMA 10 D": { standard: "10", section: "D" },
  "KKP 9C": { standard: "9", section: "C" },
};

/** જ્ઞાતિ → category / religion / caste */
function mapJnati(raw: string): { category: string; religion: string; caste: string } {
  const t = raw.replace(/\s+/g, "").replace(/હિ\.?/g, "").replace(/हि\.?/g, "");
  const lower = t.toLowerCase();
  if (/ગામીત|gamit/.test(lower) || /ગામીત/.test(t)) {
    return { category: "ST", religion: "Hindu", caste: "Gamit" };
  }
  if (/મહાર|mahar/.test(lower) || /મહાર/.test(t)) {
    return { category: "SC", religion: "Hindu", caste: "Mahar" };
  }
  if (/ભરવાડ|bharwad|bharvad/.test(lower) || /ભરવાડ/.test(t)) {
    return { category: "SEBC", religion: "Hindu", caste: "Bharwad" };
  }
  if (/ચૌધરી|chaudhari/.test(lower)) {
    return { category: "SEBC", religion: "Hindu", caste: "Chaudhari" };
  }
  if (/પટેલ|patel/.test(lower)) {
    return { category: "Open", religion: "Hindu", caste: "Patel" };
  }
  const caste = t || raw.trim() || "";
  return { category: "ST", religion: "Hindu", caste: caste || "Gamit" };
}

function onlyDigits(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function cleanAadhaar(s: string): string {
  const d = onlyDigits(s);
  return d.length >= 12 ? d.slice(0, 12) : d;
}

function cleanChildUid(s: string): string {
  const d = onlyDigits(s);
  return d.length >= 18 ? d.slice(0, 18) : d;
}

function cleanMobile(s: string): string {
  const d = onlyDigits(s);
  if (d.length >= 10) return d.slice(-10);
  return d;
}

function cleanRation(s: string): string {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/–/g, "-")
    .trim();
}

/** Parse Excel / US short dates → DD/MM/YYYY */
function toDob(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    // Excel often stores UTC midnight — use UTC parts to avoid IST -1 day
    const dd = String(v.getUTCDate()).padStart(2, "0");
    const mm = String(v.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = v.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const s = String(v).trim();
  if (!s) return "";
  // Excel serial
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + Math.round(n) * 86400000);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  // M/D/YY or M/D/YYYY (US from this file)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let month = Number(m[1]);
    let day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    // if first part > 12, it's already D/M/Y
    if (month > 12 && day <= 12) {
      const t = month;
      month = day;
      day = t;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    }
  }
  return s;
}

const GU_MAP: Record<string, string> = {
  "અ": "a", "આ": "aa", "ઇ": "i", "ઈ": "i", "ઉ": "u", "ઊ": "u",
  "એ": "e", "ઐ": "ai", "ઓ": "o", "ઔ": "au",
  "ક": "k", "ખ": "kh", "ગ": "g", "ઘ": "gh", "ચ": "ch", "છ": "chh",
  "જ": "j", "ઝ": "jh", "ઞ": "ny", "ટ": "t", "ઠ": "th", "ડ": "d",
  "ઢ": "dh", "ણ": "n", "ત": "t", "થ": "th", "દ": "d", "ધ": "dh",
  "ન": "n", "પ": "p", "ફ": "ph", "બ": "b", "ભ": "bh", "મ": "m",
  "ય": "y", "ર": "r", "લ": "l", "વ": "v", "શ": "sh", "ષ": "sh",
  "સ": "s", "હ": "h", "ળ": "l",
  "ા": "aa", "િ": "i", "ી": "i", "ુ": "u", "ૂ": "u",
  "ે": "e", "ૈ": "ai", "ો": "o", "ૌ": "au",
  "ં": "n", "ઃ": "", "્": "", " ": " ",
};

function transliterateGu(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (GU_MAP[ch] !== undefined) out += GU_MAP[ch];
    else if (/[A-Za-z0-9]/.test(ch)) out += ch;
    else if (ch === "." || ch === "-" || ch === "'") out += ch;
  }
  return out
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .filter(Boolean)
    .join(" ");
}

function guessGender(firstGu: string, fullGu: string): string {
  const s = `${firstGu} ${fullGu}`;
  if (/બેન|કુમારી|બા\b|બેન$/.test(s)) return "Female";
  if (/કુમાર|ભાઈ|સિંહ/.test(s) && !/બેન|કુમારી/.test(s)) return "Male";
  // default: most names in these sheets are girls (બેન)
  if (/ી$/.test(firstGu) || /ા$/.test(firstGu)) return "Female";
  return "Female";
}

/** "ગામીત આયુષીબેન આજેશભાઈ" → surname / first / father */
function splitGuName(full: string): {
  surnameGu: string;
  firstNameGu: string;
  fatherNameGu: string;
  middleNameGu: string;
} {
  const parts = full
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (parts.length === 0) {
    return { surnameGu: "", firstNameGu: "", fatherNameGu: "", middleNameGu: "" };
  }
  if (parts.length === 1) {
    return { surnameGu: "", firstNameGu: parts[0], fatherNameGu: "", middleNameGu: "" };
  }
  if (parts.length === 2) {
    return { surnameGu: parts[0], firstNameGu: parts[1], fatherNameGu: "", middleNameGu: "" };
  }
  // surname firstName fatherName...
  return {
    surnameGu: parts[0],
    firstNameGu: parts[1],
    middleNameGu: "",
    fatherNameGu: parts.slice(2).join(" "),
  };
}

function titleCaseEn(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function rowFromSheet(
  cells: unknown[],
  standard: string,
  section: string,
): Record<string, string> | null {
  const roll = String(cells[0] ?? "").trim();
  const nameGu = String(cells[1] ?? "").trim();
  const childUidRaw = String(cells[2] ?? "").trim();
  const aadhaarRaw = String(cells[3] ?? "").trim();
  const rationRaw = String(cells[4] ?? "").trim();
  const dobRaw = cells[5];
  const admitRaw = cells[6];
  const grRaw = String(cells[7] ?? "").trim();
  const jnatiRaw = String(cells[8] ?? "").trim();
  const mobileRaw = String(cells[9] ?? "").trim();
  const motherRaw = String(cells[10] ?? "").trim();
  const studentNameEn = String(cells[11] ?? "").trim();

  if (!nameGu && !aadhaarRaw && !grRaw) return null;
  // skip leftover header-like
  if (/ક્રમ|નામ|વિધાર્થી/.test(nameGu)) return null;

  const { surnameGu, firstNameGu, fatherNameGu, middleNameGu } = splitGuName(nameGu);
  const aadhaarNameGu = nameGu;
  const motherNameGu = motherRaw;

  let firstName = "";
  let middleName = "";
  let surname = "";
  let fatherName = "";
  let aadhaarName = "";
  let motherName = "";

  if (studentNameEn) {
    const enParts = studentNameEn.replace(/\s+/g, " ").trim().split(" ");
    if (enParts.length >= 3) {
      firstName = enParts[0];
      middleName = enParts.slice(1, -1).join(" ");
      surname = enParts[enParts.length - 1];
    } else if (enParts.length === 2) {
      firstName = enParts[0];
      surname = enParts[1];
    } else {
      firstName = enParts[0] || "";
    }
    aadhaarName = titleCaseEn(studentNameEn);
  } else {
    firstName = transliterateGu(firstNameGu) || "Student";
    middleName = transliterateGu(middleNameGu);
    surname = transliterateGu(surnameGu) || "Unknown";
    fatherName = transliterateGu(fatherNameGu);
    aadhaarName = [firstName, middleName, surname].filter(Boolean).join(" ");
    motherName = transliterateGu(motherNameGu);
  }
  if (!fatherName && fatherNameGu) fatherName = transliterateGu(fatherNameGu);
  if (!motherName && motherNameGu) motherName = transliterateGu(motherNameGu);

  const { category, religion, caste } = mapJnati(jnatiRaw);
  const gender = guessGender(firstNameGu, nameGu);
  const aadhaarNumber = cleanAadhaar(aadhaarRaw);
  const childUid = cleanChildUid(childUidRaw);
  const mobileNumber = cleanMobile(mobileRaw);
  const dateOfBirth = toDob(dobRaw);
  const startDate = toDob(admitRaw);
  const grNumber = onlyDigits(grRaw) || String(grRaw).trim();
  const rationCardNumber = cleanRation(rationRaw);

  const out: Record<string, string> = {};
  for (const k of CSV_HEADERS) out[k] = "";

  out.firstName = firstName;
  out.middleName = middleName;
  out.surname = surname;
  out.aadhaarName = aadhaarName;
  out.dateOfBirth = dateOfBirth;
  out.gender = gender;
  out.aadhaarNumber = aadhaarNumber;
  out.mobileNumber = mobileNumber;
  out.grNumber = grNumber;
  out.standard = standard;
  out.section = section;
  out.rollNumber = onlyDigits(roll) || roll;
  out.rationCardNumber = rationCardNumber;
  out.childUid = childUid;
  out.motherName = motherName;
  out.fatherName = fatherName;
  out.category = category;
  out.caste = caste;
  out.religion = religion;
  out.maritalStatus = "Unmarried";
  out.isOrphan = "No";
  out.isHosteler = "No";
  out.residentType = "Rural";
  out.habitationType = "Own";
  out.financialYear = "2025-26";
  out.courseType = standard === "9" || standard === "10" ? "Secondary" : "Higher Secondary";
  out.courseName = standardToCourseName(standard);
  out.institutionDistrict = "Tapi";
  out.institutionName = `School UDISE ${SCHOOL_CODE}`;
  out.currentYear = "1st Year";
  out.admissionType = "Regular";
  out.startDate = startDate;
  out.board10th = standard === "10" ? "GSEB" : "";
  out.firstNameGu = firstNameGu;
  out.middleNameGu = middleNameGu;
  out.surnameGu = surnameGu;
  out.aadhaarNameGu = aadhaarNameGu;
  out.motherNameGu = motherNameGu;
  out.fatherNameGu = fatherNameGu;
  // Keep school code visible for ops (not a CSV field — also on Instructions)
  // penNumber left blank (student PEN ≠ school UDISE)

  return out;
}

function main() {
  const wb = XLSX.readFile(SRC, { cellDates: true });
  const students: Record<string, string>[] = [];
  const stats: Record<string, number> = {};

  for (const sheetName of wb.SheetNames) {
    const mapped = SHEET_MAP[sheetName] || SHEET_MAP[sheetName.trim()];
    if (!mapped) {
      console.warn("Skip unknown sheet:", JSON.stringify(sheetName));
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][];
    let n = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const rec = rowFromSheet(row, mapped.standard, mapped.section);
      if (!rec) continue;
      // need at least name or aadhaar
      if (!rec.aadhaarNameGu && !rec.aadhaarNumber && !rec.grNumber) continue;
      students.push(rec);
      n++;
    }
    const key = `${mapped.standard}-${mapped.section}`;
    stats[key] = (stats[key] || 0) + n;
    console.log(`Sheet ${JSON.stringify(sheetName)} → ${key}: ${n} students`);
  }

  const labels = CSV_HEADERS.map((k) => CSV_HEADER_LABELS[k] || k);
  const aoa: (string | number)[][] = [labels];
  for (const s of students) {
    aoa.push(CSV_HEADERS.map((k) => s[k] ?? ""));
  }

  const outWb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = labels.map((l) => ({ wch: Math.min(28, Math.max(12, l.length + 2)) }));
  XLSX.utils.book_append_sheet(outWb, ws, "Students");

  const guide = XLSX.utils.aoa_to_sheet([
    ["School / UDISE code", SCHOOL_CODE],
    ["Source file", "archika 25 26.xlsx"],
    ["Total students", students.length],
    ...Object.entries(stats).map(([k, v]) => [`Class ${k}`, v]),
    [],
    ["How to import"],
    ["1", "Login to the school whose code/UDISE is 24261004405"],
    ["2", "Go to Import → upload this Excel"],
    ["3", "Yellow/required: First Name, Surname, Aadhaar Name, DOB, Gender, Aadhaar, Mobile, GR, Standard"],
    ["4", "Gujarati names kept in *Gu columns; English names are auto-transliterated — review before final"],
    ["5", "Aadhaar / Child UID / Mobile cleaned (digits only). Dates as DD/MM/YYYY"],
  ]);
  XLSX.utils.book_append_sheet(outWb, guide, "Instructions");

  XLSX.writeFile(outWb, OUT);
  console.log("Wrote", OUT, "rows=", students.length);
  console.log("Stats", stats);

  // Quick quality report
  const missingAadhaar = students.filter((s) => s.aadhaarNumber.length !== 12).length;
  const missingDob = students.filter((s) => !s.dateOfBirth).length;
  const missingMobile = students.filter((s) => s.mobileNumber.length !== 10).length;
  console.log({ missingAadhaar, missingDob, missingMobile });
}

main();
