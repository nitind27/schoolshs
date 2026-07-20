import {
  dobDisplayFromDate,
  dateToWordsGuRegister,
} from "@/lib/certificates/gujarati-date";
import {
  studentDisplayFirstName,
  studentDisplayMiddleName,
  studentDisplaySurname,
  studentDisplayFatherName,
  studentDisplayMotherName,
} from "@/lib/student-names";

export interface GeneralRegisterRow {
  id?: string;
  studentId?: string;
  mobileNumber?: string;
  serial: number;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  motherName: string;
  religionCaste: string;
  birthPlaceLines: string[];
  dateOfBirth: string;
  dobFigures: string;
  dobFiguresGu: string;
  dobWordsGu: string;
  childUidDigits: string;
  lastSchool: string;
  udiseDigits: string;
  admissionDate: string;
  feeStatus: string;
  standard: string;
  section: string;
  sectionGu: string;
  progress: string;
  conduct: string;
  leavingDate: string;
  leavingStdClass: string;
  lcIssueDate: string;
  remarks: string;
  isEmpty?: boolean;
}

export type GeneralRegisterEntryInput = Omit<
  GeneralRegisterRow,
  "serial" | "dobFigures" | "dobFiguresGu" | "sectionGu" | "isEmpty" | "mobileNumber"
>;

export const GR_ROWS_PER_PAGE = 25;
/** Screen + print: students per physical page */
export const GR_STUDENTS_PER_PAGE = 10;

export const SECTION_GU: Record<string, string> = {
  A: "અ",
  B: "બ",
  C: "ક",
  D: "ડ",
  E: "ઈ",
  F: "ફ",
};

type StudentLike = {
  id?: string;
  grNumber?: string | null;
  surname: string;
  firstName: string;
  middleName?: string | null;
  surnameGu?: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  fatherName: string;
  motherName: string;
  fatherNameGu?: string | null;
  motherNameGu?: string | null;
  religion: string;
  caste?: string | null;
  category: string;
  permanentCity?: string | null;
  permanentDistrict?: string | null;
  currentCity?: string | null;
  currentDistrict?: string | null;
  dateOfBirth: string;
  previousQualification?: string | null;
  institutionName?: string;
  startDate?: string | null;
  verifiedAt?: Date | null;
  scholarshipScheme?: string;
  standard?: string | null;
  section?: string | null;
  notes?: string | null;
  childUid?: string | null;
  aadhaarNumber?: string;
  mobileNumber?: string;
};

type DbEntryLike = {
  id: string;
  studentId?: string | null;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  motherName: string;
  religionCaste: string;
  birthPlaceJson: string;
  dateOfBirth: string;
  dobWordsGu: string;
  childUidDigits: string;
  lastSchool: string;
  udiseDigits: string;
  admissionDate: string;
  feeStatus: string;
  standard: string;
  section: string;
  progress: string;
  conduct: string;
  leavingDate: string;
  leavingStdClass: string;
  lcIssueDate: string;
  remarks: string;
  student?: { mobileNumber?: string } | null;
};

function sectionToGu(section: string): string {
  const key = section.toUpperCase();
  return SECTION_GU[key] || section;
}

function formatBirthPlaceLines(city?: string | null, district?: string | null): string[] {
  const place = city?.trim();
  const dist = district?.trim();
  if (!place && !dist) return [];
  const lines: string[] = [];
  if (place) lines.push(place);
  if (place) lines.push(`તા. ${place}`);
  if (dist) lines.push(`જિ. ${dist}`);
  return lines;
}

function formatReligionCaste(religion: string, caste?: string | null, category?: string): string {
  const c = caste?.trim() || category?.trim();
  if (c && c !== "Open" && c !== "General") return `${religion}-${c}`;
  return religion;
}

function digitsOnly(value?: string | null, max = 18): string {
  return (value || "").replace(/\D/g, "").slice(0, max);
}

function applyDobFields(row: GeneralRegisterRow, dateOfBirth: string, dobWordsGu?: string) {
  const dob = dobDisplayFromDate(dateOfBirth, dobWordsGu);
  row.dateOfBirth = dateOfBirth;
  row.dobFigures = dob.figures;
  row.dobFiguresGu = dob.figuresGu;
  row.dobWordsGu = dob.wordsGu;
}

function emptyRow(serial: number): GeneralRegisterRow {
  return {
    serial,
    grNumber: "",
    surname: "",
    firstName: "",
    fatherName: "",
    motherName: "",
    religionCaste: "",
    birthPlaceLines: [],
    dateOfBirth: "",
    dobFigures: "",
    dobFiguresGu: "",
    dobWordsGu: "",
    childUidDigits: "",
    lastSchool: "",
    udiseDigits: "",
    admissionDate: "",
    feeStatus: "",
    standard: "",
    section: "",
    sectionGu: "",
    progress: "",
    conduct: "",
    leavingDate: "",
    leavingStdClass: "",
    lcIssueDate: "",
    remarks: "",
    isEmpty: true,
  };
}

export function mapStudentToGrRow(
  student: StudentLike,
  serial: number,
  schoolUdise?: string | null,
): GeneralRegisterRow {
  const name = [
    studentDisplayFirstName(student),
    studentDisplayMiddleName(student),
  ].filter(Boolean).join(" ");
  const city = student.permanentCity || student.currentCity;
  const district = student.permanentDistrict || student.currentDistrict;

  let admissionDate = student.startDate || "";
  if (!admissionDate && student.verifiedAt) {
    admissionDate = new Date(student.verifiedAt).toLocaleDateString("en-GB");
  }

  const hasWaiver = student.scholarshipScheme && student.scholarshipScheme !== "None";
  const feeStatus = hasWaiver ? "માફી" : "ફી ભરીને";
  const section = student.section || "";
  const childUid = digitsOnly(student.childUid, 18) || digitsOnly(student.aadhaarNumber, 12);
  const lastSchool = student.previousQualification || student.institutionName || "";

  const row = emptyRow(serial);
  row.studentId = student.id;
  row.grNumber = student.grNumber || String(serial);
  row.surname = studentDisplaySurname(student);
  row.firstName = name;
  row.fatherName = studentDisplayFatherName(student);
  row.motherName = studentDisplayMotherName(student);
  row.religionCaste = formatReligionCaste(student.religion, student.caste, student.category);
  row.birthPlaceLines = formatBirthPlaceLines(city, district);
  applyDobFields(row, student.dateOfBirth);
  row.childUidDigits = childUid;
  row.lastSchool = lastSchool;
  row.udiseDigits = lastSchool ? digitsOnly(schoolUdise, 11) : "";
  row.admissionDate = admissionDate;
  row.feeStatus = feeStatus;
  row.standard = student.standard || "";
  row.section = section;
  row.sectionGu = sectionToGu(section);
  row.conduct = "સારી";
  row.remarks = student.notes?.replace(/\s+/g, " ").trim().slice(0, 120) || "";
  row.mobileNumber = student.mobileNumber || "";
  row.isEmpty = false;
  return row;
}

/** Class-wise GR rows — saved entries override student defaults */
export function mergeStudentsWithGrEntries(
  students: StudentLike[],
  entries: DbEntryLike[],
  schoolUdise?: string | null,
): GeneralRegisterRow[] {
  const seenStudentIds = new Set<string>();
  const uniqueStudents = students.filter((s) => {
    if (!s.id) return true;
    if (seenStudentIds.has(s.id)) return false;
    seenStudentIds.add(s.id);
    return true;
  });

  const byStudentId = new Map<string, DbEntryLike>();
  const byGr = new Map<string, DbEntryLike>();
  for (const e of entries) {
    if (e.studentId) byStudentId.set(e.studentId, e);
    if (e.grNumber?.trim()) byGr.set(e.grNumber.trim(), e);
  }

  return uniqueStudents.map((student, i) => {
    const entry =
      (student.id ? byStudentId.get(student.id) : undefined) ??
      (student.grNumber?.trim() ? byGr.get(student.grNumber.trim()) : undefined);

    if (entry) {
      return mapEntryToGrRow(
        {
          ...entry,
          student: { mobileNumber: student.mobileNumber || entry.student?.mobileNumber },
        },
        i + 1,
      );
    }
    return mapStudentToGrRow(student, i + 1, schoolUdise);
  });
}

export function mapEntryToGrRow(entry: DbEntryLike, serial: number): GeneralRegisterRow {
  let birthPlaceLines: string[] = [];
  try {
    birthPlaceLines = JSON.parse(entry.birthPlaceJson || "[]");
  } catch {
    birthPlaceLines = [];
  }

  const row = emptyRow(serial);
  row.id = entry.id;
  row.studentId = entry.studentId || undefined;
  row.mobileNumber = entry.student?.mobileNumber || "";
  row.grNumber = entry.grNumber;
  row.surname = entry.surname;
  row.firstName = entry.firstName;
  row.fatherName = entry.fatherName;
  row.motherName = entry.motherName;
  row.religionCaste = entry.religionCaste;
  row.birthPlaceLines = birthPlaceLines;
  applyDobFields(row, entry.dateOfBirth, entry.dobWordsGu);
  row.childUidDigits = entry.childUidDigits;
  row.lastSchool = entry.lastSchool;
  row.udiseDigits = entry.udiseDigits;
  row.admissionDate = entry.admissionDate;
  row.feeStatus = entry.feeStatus;
  row.standard = entry.standard;
  row.section = entry.section;
  row.sectionGu = sectionToGu(entry.section);
  row.progress = entry.progress;
  row.conduct = entry.conduct;
  row.leavingDate = entry.leavingDate;
  row.leavingStdClass = entry.leavingStdClass;
  row.lcIssueDate = entry.lcIssueDate;
  row.remarks = entry.remarks;
  row.isEmpty = false;
  return row;
}

export function buildRowFromInput(input: GeneralRegisterEntryInput): GeneralRegisterRow {
  const row = emptyRow(0);
  Object.assign(row, input);
  applyDobFields(row, input.dateOfBirth, input.dobWordsGu);
  row.sectionGu = sectionToGu(input.section);
  row.isEmpty = false;
  return row;
}

export function entryPayloadFromStudent(
  student: StudentLike,
  academicYear: string,
  grNumber: string,
  schoolUdise?: string | null,
): GeneralRegisterEntryInput {
  const mapped = mapStudentToGrRow(student, 0, schoolUdise);
  return {
    grNumber: grNumber || mapped.grNumber,
    surname: mapped.surname,
    firstName: mapped.firstName,
    fatherName: mapped.fatherName,
    motherName: mapped.motherName,
    religionCaste: mapped.religionCaste,
    birthPlaceLines: mapped.birthPlaceLines,
    dateOfBirth: student.dateOfBirth,
    dobWordsGu: mapped.dobWordsGu,
    childUidDigits: mapped.childUidDigits,
    lastSchool: mapped.lastSchool,
    udiseDigits: mapped.udiseDigits,
    admissionDate: mapped.admissionDate,
    feeStatus: mapped.feeStatus,
    standard: mapped.standard,
    section: mapped.section,
    progress: mapped.progress,
    conduct: mapped.conduct || "સારી",
    leavingDate: mapped.leavingDate,
    leavingStdClass: mapped.leavingStdClass,
    lcIssueDate: mapped.lcIssueDate,
    remarks: mapped.remarks,
    studentId: undefined,
  };
}

function normalizeGrSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchGrQuery(row: GeneralRegisterRow, query: string): boolean {
  const q = normalizeGrSearchText(query);
  if (!q) return true;

  const surname = normalizeGrSearchText(row.surname || "");
  const firstName = normalizeGrSearchText(row.firstName || "");
  const fatherName = normalizeGrSearchText(row.fatherName || "");
  const motherName = normalizeGrSearchText(row.motherName || "");
  const nameFields = [surname, firstName, fatherName, motherName].filter(Boolean);
  const fullName = nameFields.join(" ");

  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 0) {
    const allTokensMatch = tokens.every((token) =>
      nameFields.some((field) => field.includes(token)),
    );
    if (allTokensMatch) return true;
  }

  if (fullName.includes(q)) return true;
  if (`${firstName} ${surname}`.includes(q)) return true;
  if (`${surname} ${firstName}`.includes(q)) return true;
  if (nameFields.some((field) => field.includes(q))) return true;

  if (row.grNumber.toLowerCase().includes(q)) return true;
  if ((row.mobileNumber || "").toLowerCase().includes(q)) return true;

  const qDigits = query.replace(/\D/g, "");
  if (qDigits) {
    if (row.grNumber.replace(/\D/g, "").includes(qDigits)) return true;
    if (row.childUidDigits.replace(/\D/g, "").includes(qDigits)) return true;
    if ((row.mobileNumber || "").replace(/\D/g, "").includes(qDigits)) return true;
  }

  return false;
}

function matchGrDob(row: GeneralRegisterRow, dob: string): boolean {
  const isoParts = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dobNorm = isoParts
    ? `${isoParts[3]}${isoParts[2]}${isoParts[1]}`
    : dob.replace(/\D/g, "");
  const rowDob = `${row.dateOfBirth}${row.dobFigures}${row.dobFiguresGu}`.replace(/\D/g, "");
  return (
    rowDob.includes(dobNorm) ||
    row.dobFigures.includes(dob) ||
    row.dobFiguresGu.includes(dob) ||
    row.dateOfBirth.includes(dob)
  );
}

export function filterGrRows(
  rows: GeneralRegisterRow[],
  filters: { query?: string; dob?: string },
): GeneralRegisterRow[] {
  const query = filters.query?.trim();
  const dob = filters.dob?.trim();

  let result = rows.filter((r) => !r.isEmpty);
  if (query || dob) {
    result = result.filter((r) => {
      if (query && !matchGrQuery(r, query)) return false;
      if (dob && !matchGrDob(r, dob)) return false;
      return true;
    });
  }

  return dedupeGrRows(result).map((r, i) => ({ ...r, serial: i + 1 }));
}

/** Remove duplicate students (same id, GR no., or name combo) */
export function dedupeGrRows(rows: GeneralRegisterRow[]): GeneralRegisterRow[] {
  const seen = new Set<string>();
  const out: GeneralRegisterRow[] = [];
  for (const r of rows) {
    if (r.isEmpty) continue;
    const key =
      r.studentId ||
      (r.grNumber?.trim() ? `gr:${r.grNumber.trim()}` : "") ||
      `name:${r.surname}|${r.firstName}|${r.fatherName}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Split rows into pages of `size` (for screen pagination / print sheets) */
export function chunkGrRows(rows: GeneralRegisterRow[], size = GR_STUDENTS_PER_PAGE): GeneralRegisterRow[][] {
  const filled = dedupeGrRows(rows.filter((r) => !r.isEmpty));
  if (!filled.length) return [];
  const chunks: GeneralRegisterRow[][] = [];
  for (let i = 0; i < filled.length; i += size) {
    chunks.push(filled.slice(i, i + size));
  }
  return chunks;
}

export function sliceGrPage(rows: GeneralRegisterRow[], page: number, size = GR_STUDENTS_PER_PAGE): GeneralRegisterRow[] {
  const start = (page - 1) * size;
  return dedupeGrRows(rows).slice(start, start + size);
}

export function grPageCount(rows: GeneralRegisterRow[], size = GR_STUDENTS_PER_PAGE): number {
  const n = dedupeGrRows(rows.filter((r) => !r.isEmpty)).length;
  return Math.max(1, Math.ceil(n / size));
}

export function padGeneralRegisterRows(
  rows: GeneralRegisterRow[],
  minRows = GR_ROWS_PER_PAGE,
  padEmpty = true,
): GeneralRegisterRow[] {
  const filled = dedupeGrRows(rows.filter((r) => !r.isEmpty));
  if (!padEmpty) return filled;
  const out = [...filled];
  while (out.length < minRows) {
    out.push(emptyRow(out.length + 1));
  }
  return out;
}

export function recomputeDobPreview(dateOfBirth: string, dobWordsGu?: string) {
  const dob = dobDisplayFromDate(dateOfBirth, dobWordsGu);
  return {
    dobFigures: dob.figures,
    dobFiguresGu: dob.figuresGu,
    dobWordsGu: dobWordsGu?.trim() || dob.wordsGu,
    suggestedWordsGu: dateToWordsGuRegister(dateOfBirth),
  };
}
