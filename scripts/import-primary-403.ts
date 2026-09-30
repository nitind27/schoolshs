/**
 * Import Std 1 / 2 / 3 / 5 students into school 24261004403 (Sarvajanik Primary School Songadh).
 * Sources: file/1.xlsx, file/2.xlsx.xlsx, file/3.xlsx, file/5.xlsx
 * Std 1–5 have no division here (same as the existing "Class 4").
 *
 * Run:  npx tsx scripts/import-primary-403.ts --dry        (print mapped rows only)
 *       npx tsx scripts/import-primary-403.ts              (write all standards)
 *       npx tsx scripts/import-primary-403.ts --only=1,5   (limit standards)
 */
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";
import { fillImportDefaults } from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import { standardToCourseName, standardToCurrentYear } from "../src/lib/constants";
import { syncStudentPortalAccount } from "../src/lib/student-account";
import { studentFullNameEn, studentListName } from "../src/lib/student-names";
import {
  type RawRow,
  CATEGORY_MAP,
  MUSLIM_SURNAMES,
  bankNameFromIfsc,
  cleanAadhaar,
  cleanCaste,
  cleanIfsc,
  cleanMobile,
  cleanName,
  inferCategory,
  nameWord,
  pick,
  spaceOutHolder,
  titleCaseWords,
  transliterateName,
  untranslatedWords,
  writeMappedWorkbook,
} from "./lib/student-import-helpers";

const SCHOOL_CODE = "24261004403";
const SECTION = "";
const PLACEHOLDER_IFSC = "BARB0FORTSO";
const DRY_RUN = process.argv.includes("--dry");
const ONLY = (process.argv.find((a) => a.startsWith("--only="))?.slice(7) || "")
  .split(",")
  .filter(Boolean);

type RowFix = Record<string, string>;
type Source = {
  standard: string;
  file: string;
  /** Per-row corrections keyed by GR number (header → value). */
  fixes: Record<string, RowFix>;
};

const SOURCES: Source[] = [
  {
    standard: "1",
    file: "1.xlsx",
    fixes: {
      // Child UID gender digit (…261…) and names show these two are boys.
      "1285": { Gender: "Male" },
      "1293": { Gender: "Male" },
      "1297": { "Middle Name": "Bhagavandas", "Father Name": "Bhagavandas" },
      "1300": { "First Name": "Yug" },
      "1274": { "SSG Child UID (18 digit)": "242610044032610001" },
    },
  },
  {
    standard: "2",
    file: "2.xlsx.xlsx",
    fixes: {
      "1246": { Surname: "Shinde" },
      "1269": { "Middle Name": "Bhupendrasinh", "Father Name": "Bhupendrasinh" },
      "1253": { "First Name": "Jayant" },
      "1222": { Surname: "Patni" },
      "1227": { "Middle Name": "Nasirkhan" },
      "1228": { "IFSC Code": "SBIN0000281" },
    },
  },
  {
    standard: "3",
    file: "3.xlsx",
    fixes: {
      "1185": { "First Name (Gujarati)": "" },
      "1310": { "Date of Birth (DD/MM/YYYY)": "13/08/2017" },
      "1176": { "Middle Name": "Laxmanbhai", "Father Name": "Laxmanbhai" },
      "1174": { "First Name": "Mohammad" },
      "1234": { "First Name": "Mohammad Zaid" },
      "1316": { "Middle Name": "Mo. Islam", "Father Name": "Mo. Islam" },
      "1317": { "Middle Name": "Mo. Islam", "Father Name": "Mo. Islam" },
      // Dax Gavli's bank + Gujarati name were typed on Dipak Shinde's row (holder "GAVALI DAKSH …").
      "1187": {
        "Account Number": "4293910913",
        "IFSC Code": "SBIN0000281",
        "Account Holder Name": "Gavali Daksh Avinashbhai",
        "First Name (Gujarati)": "દક્ષ",
      },
      "1178": {
        "Account Number": "",
        "IFSC Code": "",
        "Account Holder Name": "",
        "First Name (Gujarati)": "",
      },
    },
  },
  {
    standard: "5",
    file: "5.xlsx",
    fixes: {
      "1049": { Caste: "Pathan", Religion: "Muslim", "Mother Name": "Sabana" },
      "1051": { Caste: "Moula Patel", Religion: "Muslim" },
      "1054": { Caste: "Sahani", Religion: "Hindu" },
      "1050": { Religion: "Muslim" },
      "1258": { Religion: "Muslim" },
      "1083": { "First Name": "Muhammad", "Middle Name": "Mosim", Religion: "Muslim" },
      "1037": { "First Name": "Mohammad Urveshkhan", "Middle Name": "Vasimkhan" },
      "1212": { "First Name": "Abuzar", "Middle Name": "Hazikh Kasim" },
      "1213": { Surname: "Vagh" },
      "1059": { Surname: "Chauhan" },
      "1081": { Surname: "Solanki" },
      "1041": { Surname: "Bagwan" },
      "1110": { Surname: "Prajapati" },
      "1071": { Surname: "Gosavi" },
      "1061": { Surname: "Konkani" },
      "1147": { "First Name": "Lucky", Surname: "Nirmal" },
      "1235": { Surname: "Khairnar" },
      "1165": { Surname: "Khairnar" },
      "1242": { Surname: "Umarvaishya" },
      "1060": { "First Name": "Dhyey" },
      "1079": { "Middle Name": "Dipakbhai" },
      "1146": { "Middle Name": "Pradipbhai" },
      "1039": { "Middle Name": "Sureshbhai" },
      "1065": { "First Name": "Vikash" },
    },
  },
];

/** Muslim surnames at this school beyond the shared list (Patel is decided per row). */
const MUSLIM_SURNAMES_403 = new Set([
  ...MUSLIM_SURNAMES,
  "PATNI",
  "PATANI",
  "KURESHI",
  "KHATIK",
  "RAIN",
  "KHAN",
  "MANSURI",
  "MANYAR",
  "MULLA",
  "HAVELIWALA",
]);

/** GR numbers of Patel students whose names show they are Muslim (files 1–3 have no religion column). */
const MUSLIM_PATEL_GR = new Set(["1210"]);

/** Categories for surnames the shared lists do not cover (matches the existing Class 4 records). */
const CATEGORY_BY_SURNAME_403: Record<string, string> = {
  SHINDE: "NTDNT",
  VADAR: "NTDNT",
  KURESHI: "OBC",
  RAIN: "OBC",
  TANDEL: "OBC",
};

function schemeFor(category: string): string {
  if (category === "SC") return "Pre Matric Scholarship - SC";
  if (category === "ST") return "Pre Matric Scholarship - ST";
  if (category === "OBC") return "Post Matric Scholarship - OBC";
  if (category === "NTDNT") return "Food Bill Assistance";
  return "";
}

/** Handles Excel serials, "19//07/2016", ",14/10/2016" and 2-digit years ("25/03/19"). */
function parseDob403(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
  }
  const s = String(v || "").trim();
  if (/^\d{5}$/.test(s)) return parseDob403(Number(s));
  const m = s.match(/(\d{1,2})[/.\-]+(\d{1,2})[/.\-]+(\d{2,4})/);
  if (!m) return s;
  let year = parseInt(m[3]!, 10);
  if (year < 100) year += 2000;
  return `${m[1]!.padStart(2, "0")}/${m[2]!.padStart(2, "0")}/${year}`;
}

function isValidDob(dob: string): boolean {
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = +m[1]!;
  const mo = +m[2]!;
  return d >= 1 && d <= 31 && mo >= 1 && mo <= 12;
}

function gujaratiOnly(v: string): string {
  const s = cleanName(v);
  return /[\u0A80-\u0AFF]/.test(s) && !/[A-Za-z]/.test(s) ? s : "";
}

function guName(en: string): string | null {
  return transliterateName(en)?.replace(/ભાઇ/g, "ભાઈ") || null;
}

type Majority = { category: string; religion: string; caste: string };

/** Most common category / religion / caste per surname across all schools (for sheets without those columns). */
async function loadSurnameMajority(): Promise<Map<string, Majority>> {
  const rows = await prisma.student.findMany({
    where: { status: { not: "archived" } },
    select: { surname: true, category: true, religion: true, caste: true },
  });
  const groups = new Map<string, { category: Map<string, number>; religion: Map<string, number>; caste: Map<string, number>; n: number }>();
  for (const r of rows) {
    const key = cleanName(r.surname || "").toUpperCase();
    if (!key) continue;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { category: new Map(), religion: new Map(), caste: new Map(), n: 0 }));
    g.n++;
    const add = (m: Map<string, number>, v: string | null) => {
      const k = cleanName(v || "");
      if (k && !/[\u0A80-\u0AFF]/.test(k)) m.set(k, (m.get(k) || 0) + 1);
    };
    add(g.category, r.category === "General" ? "Open" : r.category);
    add(g.religion, r.religion);
    add(g.caste, titleCaseWords(r.caste || ""));
  }
  const top = (m: Map<string, number>, n: number) => {
    const best = [...m].sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= 2 && best[1] / n >= 0.6 ? best[0] : "";
  };
  const out = new Map<string, Majority>();
  for (const [k, g] of groups) {
    out.set(k, { category: top(g.category, g.n), religion: top(g.religion, g.n), caste: top(g.caste, g.n) });
  }
  return out;
}

function mapSource(
  source: Source,
  majority: Map<string, Majority>,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  const wb = XLSX.readFile(path.join(process.cwd(), "file", source.file), { cellDates: false, raw: true });
  const sheetName = wb.SheetNames.find((n) => /students/i.test(n)) || wb.SheetNames[0]!;
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[sheetName]!, { defval: "", raw: true });

  const mapped: Record<string, any>[] = [];
  const notes: string[] = [];
  const seenAadhaar = new Set<string>();

  for (const src of rawRows) {
    const grRaw = pick(src, "GR Number").replace(/\s/g, "");
    const r: RawRow = { ...src, ...(source.fixes[grRaw] || {}) };
    const firstNameRaw = pick(r, "First Name");
    if (!firstNameRaw && !grRaw) continue;

    let aadhaarNumber = cleanAadhaar(pick(r, "Aadhaar Number"));
    if (aadhaarNumber && seenAadhaar.has(aadhaarNumber)) {
      notes.push(`Std ${source.standard} GR ${grRaw} ${firstNameRaw}: duplicate row (same Aadhaar) skipped`);
      continue;
    }
    if (aadhaarNumber) seenAadhaar.add(aadhaarNumber);

    const gr = grRaw;
    const rollNumber = String(mapped.length + 1);
    const firstName = nameWord(firstNameRaw);
    const middleName = nameWord(pick(r, "Middle Name"));
    const surname = nameWord(pick(r, "Surname"));
    const aadhaarName = [firstName, middleName, surname].filter(Boolean).join(" ");
    const label = `Std ${source.standard} roll ${rollNumber} ${aadhaarName} (GR ${gr})`;

    const dob = parseDob403(pick(r, "Date of Birth (DD/MM/YYYY)"));
    if (!isValidDob(dob)) notes.push(`${label}: date of birth "${dob}" invalid`);

    const genderRaw = pick(r, "Gender").toLowerCase();
    const gender = genderRaw.startsWith("f") ? "Female" : genderRaw.startsWith("m") ? "Male" : "Other";

    const uidRaw = pick(r, "SSG Child UID (18 digit)", "APAAR / UPPAR ID").replace(/\D/g, "");
    const childUid = /^\d{18}$/.test(uidRaw) ? uidRaw : null;
    if (uidRaw && !childUid) notes.push(`${label}: Child UID "${uidRaw}" is not 18 digits → left blank`);
    if (childUid && childUid.startsWith("24261004403")) {
      const uidGender = childUid[13] === "1" ? "Male" : childUid[13] === "2" ? "Female" : "";
      if (uidGender && uidGender !== gender) notes.push(`${label}: gender ${gender} but Child UID says ${uidGender}`);
    }

    const mobileRaw = pick(r, "Mobile Number");
    const mobileNumber = cleanMobile(mobileRaw, gr);
    if (mobileNumber !== mobileRaw.replace(/\D/g, "")) {
      notes.push(`${label}: mobile "${mobileRaw}" invalid → placeholder ${mobileNumber}`);
    }

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      const placeholder = `9${gr.padStart(11, "0")}`.slice(0, 12);
      notes.push(`${label}: Aadhaar "${aadhaarNumber}" invalid → placeholder ${placeholder}`);
      aadhaarNumber = placeholder;
    }

    const surnameKey = surname.toUpperCase();
    const known = majority.get(surnameKey);
    const casteRaw = pick(r, "Caste");
    const caste = casteRaw ? cleanCaste(casteRaw, surname) : known?.caste || surname;

    let religion = titleCaseWords(pick(r, "Religion"));
    if (/mus|islam/i.test(religion)) religion = "Muslim";
    if (!religion) {
      if (MUSLIM_SURNAMES_403.has(surnameKey) || MUSLIM_PATEL_GR.has(gr)) religion = "Muslim";
      else if (surnameKey === "PATEL") religion = "Hindu";
      else religion = known?.religion || "Hindu";
    }

    const categoryRaw = pick(r, "Category (SC/ST/OBC/SEBC/EWS/Open)").toUpperCase();
    let category = categoryRaw ? CATEGORY_MAP[categoryRaw] || categoryRaw : "";
    if (!category) {
      const inferred = inferCategory("", caste, surname);
      const bySurname = CATEGORY_BY_SURNAME_403[surnameKey];
      category = inferred.category !== "Open" ? inferred.category : bySurname || known?.category || "Open";
      if (!bySurname && !known?.category && inferred.category === "Open") {
        notes.push(`${label}: category unknown → Open`);
      }
    }

    let accountNumber = pick(r, "Account Number").replace(/\D/g, "");
    const ifscRaw = pick(r, "IFSC Code").replace(/^UBN0/i, "UBIN0");
    let ifscCode = cleanIfsc(ifscRaw, accountNumber);
    if (accountNumber && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      notes.push(`${label}: IFSC "${ifscRaw}" invalid for account ${accountNumber} → SBIN0000281`);
      ifscCode = "SBIN0000281";
    }
    let accountHolderName = aadhaarName;
    if (accountNumber) {
      const holder = spaceOutHolder(pick(r, "Account Holder Name"), [firstName, middleName, surname])
        .split(" ")
        .filter((w) => w && !/^(MISS|MR|MRS|MS)\.?$/i.test(w))
        .join(" ");
      if (holder.split(" ").length >= 2) accountHolderName = titleCaseWords(holder);
    } else {
      accountNumber = `9${gr.padStart(11, "0")}`.slice(0, 12);
      ifscCode = PLACEHOLDER_IFSC;
    }
    const bankName = ifscCode.startsWith("SPCB") ? "Surat People's Co-op Bank" : bankNameFromIfsc(ifscCode);

    const motherName = nameWord(pick(r, "Mother Name")) || "NA";
    const fatherName = nameWord(pick(r, "Father Name")) || middleName || "NA";

    const firstNameGu = gujaratiOnly(pick(r, "First Name (Gujarati)")) || guName(firstName);
    const middleNameGu = gujaratiOnly(pick(r, "Middle Name (Gujarati)")) || guName(middleName);
    const surnameGu = gujaratiOnly(pick(r, "Surname (Gujarati)")) || guName(surname);
    const aadhaarNameGu = [surnameGu, firstNameGu, middleNameGu].filter(Boolean).join(" ") || null;
    const motherNameGu =
      gujaratiOnly(pick(r, "Mother Name (Gujarati)")) || (motherName !== "NA" ? guName(motherName) : null);
    const fatherNameGu =
      gujaratiOnly(pick(r, "Father Name (Gujarati)")) || (fatherName !== "NA" ? guName(fatherName) : null);

    mapped.push({
      firstName,
      middleName: middleName || null,
      surname,
      aadhaarName,
      firstNameGu,
      middleNameGu,
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
      email: null,
      childUid,
      grNumber: gr,
      standard: source.standard,
      section: SECTION,
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
      scholarshipScheme: schemeFor(category),
      financialYear: academicYear,
      courseType: "Secondary",
      courseName: standardToCourseName(source.standard),
      currentYear: standardToCurrentYear(source.standard),
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

  const grCount = new Map<string, number>();
  for (const s of mapped) if (s.grNumber) grCount.set(s.grNumber, (grCount.get(s.grNumber) || 0) + 1);
  for (const [gr, n] of grCount) if (n > 1) notes.push(`Std ${source.standard}: GR ${gr} used by ${n} rows`);

  return { mapped, notes };
}

async function ensureClass(
  schoolId: string,
  standard: string,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  let cls = await prisma.schoolClass.findFirst({ where: { schoolId, standard, section: SECTION, academicYear } });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Class ${standard}`,
        standard,
        section: SECTION,
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    console.log(`Created class "${cls.name}" (${cls.id})`);
  } else {
    console.log(`Using existing class "${cls.name}" (${cls.id})`);
  }
  await seedClassSubjects(cls.id, standard, "");
  return cls;
}

async function importSource(
  schoolId: string,
  source: Source,
  mapped: Record<string, any>[],
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  const outExcelPath = path.join(process.cwd(), "file", `403-std${source.standard}-mapped.xlsx`);
  await writeMappedWorkbook(mapped, outExcelPath);
  console.log(`Saved mapped Excel to: ${outExcelPath}`);

  const cls = await ensureClass(schoolId, source.standard, academicYear, institutionName, institutionDistrict);
  const stats = { created: 0, updated: 0, failed: 0, ready: 0, draft: 0 };
  const errorList: { roll: string; name: string; errors: string[] }[] = [];

  for (const raw of mapped) {
    const dataRow = normalizeStudentRow(
      fillImportDefaults({ ...raw, institutionName, institutionDistrict, financialYear: academicYear }),
    );
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
        where: { schoolId_aadhaarNumber: { schoolId, aadhaarNumber: String(dataRow.aadhaarNumber) } },
      });
      if (!existing && dataRow.grNumber) {
        const grClash = await prisma.student.findFirst({
          where: { schoolId, grNumber: String(dataRow.grNumber), status: { not: "archived" } },
          select: { firstName: true, surname: true, standard: true },
        });
        if (grClash) {
          console.warn(
            `  ! GR ${dataRow.grNumber} is also used by ${grClash.firstName} ${grClash.surname} (Std ${grClash.standard}); creating a separate student`,
          );
        }
      }

      const payload = {
        schoolId,
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
    where: { schoolId, standard: source.standard, section: SECTION, status: { not: "archived" } },
  });
  console.log(`\n=== Std ${source.standard} SUMMARY ===`);
  console.log(
    `Processed ${mapped.length} | created ${stats.created} | updated ${stats.updated} | failed ${stats.failed} | ready ${stats.ready} | draft ${stats.draft}`,
  );
  console.log(`Students now in Class ${source.standard}: ${finalCount}`);
  for (const e of errorList) console.log(` - Roll ${e.roll} (${e.name}): ${e.errors.join("; ")}`);
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School with code ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2026-27";
  const institutionName = school.settings?.schoolName || school.name || "Sarvajanik Primary School Songadh";
  const institutionDistrict = school.district || "Tapi";
  console.log(`School: ${school.name} (${school.code}) | Academic Year: ${academicYear}`);

  const majority = await loadSurnameMajority();
  const sources = SOURCES.filter((s) => !ONLY.length || ONLY.includes(s.standard));
  for (const source of sources) {
    console.log(`\n##### Std ${source.standard} from file/${source.file}${DRY_RUN ? " (DRY RUN)" : ""}`);
    const { mapped, notes } = mapSource(source, majority, academicYear, institutionName, institutionDistrict);
    console.log(`Students parsed: ${mapped.length}`);
    if (!mapped.length) throw new Error(`No student rows found in ${source.file}`);

    if (DRY_RUN) {
      for (const s of mapped) {
        console.log(
          `${String(s.rollNumber).padStart(2)} GR ${s.grNumber} | ${s.aadhaarName} | ${s.aadhaarNameGu} | M: ${s.motherName}/${s.motherNameGu} | ${s.dateOfBirth} ${s.gender[0]} ${s.category} ${s.caste} ${s.religion} | ${s.accountNumber} ${s.ifscCode} | ${s.accountHolderName} | UID ${s.childUid ?? "-"}`,
        );
      }
      for (const n of notes) console.log(`  note: ${n}`);
      continue;
    }

    await importSource(school.id, source, mapped, academicYear, institutionName, institutionDistrict);
    for (const n of notes) console.log(`  note: ${n}`);
  }

  if (DRY_RUN) {
    console.log(`\nWords without a Gujarati override (${untranslatedWords.size}):`);
    console.log([...untranslatedWords].sort().join(", ") || "none");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
