import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  BLOOD_GROUPS,
  BOARDS,
  CATEGORIES,
  COURSE_TYPES,
  CURRENT_YEARS,
  FINANCIAL_YEARS,
  GENDERS,
  GUJARAT_DISTRICTS,
  PARENT_OCCUPATIONS,
} from "@/lib/constants";
import { PRE_MATRIC_SCHEMES, POST_MATRIC_SCHEMES } from "@/lib/dg-portal";
import { getAuthSecret } from "@/lib/env-auth";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { resolveReligionName } from "@/lib/school-religions";
import {
  ACCOUNT_NUMBER_MAX,
  ACCOUNT_NUMBER_MIN,
  isValidAccountNumber,
  isValidRationCard,
  RATION_CARD_MAX,
} from "@/lib/student-academic-rules";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Every student-form scalar that the public edit-link may change. Class, documents, login secrets and status stay school-side. */
export const EDIT_LINK_FIELDS = [
  "firstName",
  "middleName",
  "surname",
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarName",
  "aadhaarNameGu",
  "dateOfBirth",
  "gender",
  "aadhaarNumber",
  "rationCardNumber",
  "mobileNumber",
  "email",
  "motherName",
  "fatherName",
  "motherNameGu",
  "fatherNameGu",
  "motherAadhaarNumber",
  "fatherAadhaarNumber",
  "guardianName",
  "guardianNameGu",
  "category",
  "caste",
  "religion",
  "maritalStatus",
  "parentOccupation",
  "isOrphan",
  "annualFamilyIncome",
  "familySize",
  "rollNumber",
  "grNumber",
  "childUid",
  "apaarId",
  "penNumber",
  "panNumber",
  "bloodGroup",
  "startDate",
  "currentAddress",
  "currentDistrict",
  "currentCity",
  "currentPincode",
  "permanentAddress",
  "permanentDistrict",
  "permanentCity",
  "permanentPincode",
  "habitationType",
  "residentType",
  "isHosteler",
  "hostelType",
  "hostelName",
  "scholarshipScheme",
  "financialYear",
  "courseType",
  "courseName",
  "institutionDistrict",
  "institutionName",
  "currentYear",
  "admissionType",
  "board10th",
  "percentage10th",
  "year10th",
  "sscSeatPrefix",
  "sscSeatNumber",
  "board12th",
  "percentage12th",
  "year12th",
  "bankName",
  "branchName",
  "accountNumber",
  "ifscCode",
  "accountHolderName",
  "notes",
] as const;

export type EditLinkField = (typeof EDIT_LINK_FIELDS)[number];

export const EDIT_LINK_GROUPS: { id: string; fields: readonly EditLinkField[] }[] = [
  {
    id: "name",
    fields: [
      "firstName",
      "middleName",
      "surname",
      "firstNameGu",
      "middleNameGu",
      "surnameGu",
      "aadhaarName",
      "aadhaarNameGu",
    ],
  },
  {
    id: "family",
    fields: [
      "fatherName",
      "fatherNameGu",
      "fatherAadhaarNumber",
      "motherName",
      "motherNameGu",
      "motherAadhaarNumber",
      "guardianName",
      "guardianNameGu",
      "parentOccupation",
      "annualFamilyIncome",
      "familySize",
      "isOrphan",
    ],
  },
  { id: "community", fields: ["category", "caste", "religion", "maritalStatus"] },
  {
    id: "contact",
    fields: ["gender", "dateOfBirth", "mobileNumber", "email", "bloodGroup", "startDate"],
  },
  {
    id: "ids",
    fields: [
      "rollNumber",
      "grNumber",
      "aadhaarNumber",
      "childUid",
      "apaarId",
      "penNumber",
      "panNumber",
      "rationCardNumber",
    ],
  },
  {
    id: "address",
    fields: [
      "currentAddress",
      "currentCity",
      "currentDistrict",
      "currentPincode",
      "residentType",
      "habitationType",
      "permanentAddress",
      "permanentCity",
      "permanentDistrict",
      "permanentPincode",
    ],
  },
  { id: "hostel", fields: ["isHosteler", "hostelType", "hostelName"] },
  {
    id: "academic",
    fields: [
      "scholarshipScheme",
      "financialYear",
      "courseType",
      "courseName",
      "institutionDistrict",
      "institutionName",
      "currentYear",
      "admissionType",
    ],
  },
  {
    id: "education",
    fields: [
      "board10th",
      "percentage10th",
      "year10th",
      "sscSeatPrefix",
      "sscSeatNumber",
      "board12th",
      "percentage12th",
      "year12th",
    ],
  },
  {
    id: "bank",
    fields: ["ifscCode", "bankName", "branchName", "accountNumber", "accountHolderName"],
  },
  { id: "notes", fields: ["notes"] },
];

const REQUIRED = new Set<EditLinkField>([
  "firstName",
  "surname",
  "aadhaarName",
  "fatherName",
  "motherName",
  "category",
  "religion",
  "gender",
  "dateOfBirth",
  "mobileNumber",
  "aadhaarNumber",
  "currentAddress",
  "currentCity",
  "currentDistrict",
  "currentPincode",
  "permanentAddress",
  "permanentCity",
  "permanentDistrict",
  "permanentPincode",
]);

const MAX_LEN: Partial<Record<EditLinkField, number>> = {
  firstName: 80,
  middleName: 80,
  surname: 80,
  firstNameGu: 80,
  middleNameGu: 80,
  surnameGu: 80,
  aadhaarName: 120,
  aadhaarNameGu: 120,
  fatherName: 120,
  fatherNameGu: 120,
  motherName: 120,
  motherNameGu: 120,
  guardianName: 120,
  guardianNameGu: 120,
  caste: 80,
  religion: 80,
  parentOccupation: 80,
  dateOfBirth: 20,
  startDate: 20,
  mobileNumber: 10,
  email: 120,
  bloodGroup: 8,
  rollNumber: 20,
  grNumber: 30,
  aadhaarNumber: 12,
  motherAadhaarNumber: 12,
  fatherAadhaarNumber: 12,
  childUid: 18,
  apaarId: 16,
  penNumber: 16,
  panNumber: 10,
  rationCardNumber: RATION_CARD_MAX,
  currentPincode: 6,
  permanentPincode: 6,
  currentAddress: 500,
  permanentAddress: 500,
  currentCity: 80,
  permanentCity: 80,
  hostelType: 80,
  hostelName: 120,
  scholarshipScheme: 120,
  courseName: 160,
  institutionName: 160,
  year10th: 4,
  year12th: 4,
  sscSeatPrefix: 1,
  sscSeatNumber: 7,
  bankName: 120,
  branchName: 120,
  accountNumber: ACCOUNT_NUMBER_MAX,
  ifscCode: 11,
  accountHolderName: 120,
  notes: 2000,
};

const BOOLEAN_FIELDS = new Set<EditLinkField>(["isOrphan", "isHosteler"]);
const INT_FIELDS = new Set<EditLinkField>(["familySize"]);
const FLOAT_FIELDS = new Set<EditLinkField>([
  "annualFamilyIncome",
  "percentage10th",
  "percentage12th",
]);

const NEVER_NULL = new Set<EditLinkField>([
  ...REQUIRED,
  "parentOccupation",
  "maritalStatus",
  "habitationType",
  "residentType",
  "scholarshipScheme",
  "financialYear",
  "courseType",
  "courseName",
  "institutionDistrict",
  "institutionName",
  "currentYear",
  "admissionType",
  "board10th",
  "year10th",
  "bankName",
  "branchName",
  "accountNumber",
  "ifscCode",
  "accountHolderName",
  "annualFamilyIncome",
  "familySize",
  "percentage10th",
]);

const SSC_PREFIXES = new Set(["A", "B", "C", "S", "P"]);
const MARITAL = new Set(["Unmarried", "Married"]);
const RESIDENT = new Set(["Rural", "Urban"]);
const HABITATION = new Set(["Own", "Rent"]);
const ADMISSION = new Set(["Regular", "Lateral", "Transfer"]);
const DISTRICT_SET = new Set(GUJARAT_DISTRICTS.map((item) => item.toLowerCase()));

export const EDIT_LINK_LABELS: Record<EditLinkField, { en: string; gu: string }> = {
  firstName: { en: "First name", gu: "નામ" },
  middleName: { en: "Middle name", gu: "પિતાનું નામ (મધ્ય)" },
  surname: { en: "Surname", gu: "અટક" },
  firstNameGu: { en: "First name (Gujarati)", gu: "નામ (ગુજરાતી)" },
  middleNameGu: { en: "Middle name (Gujarati)", gu: "મધ્ય નામ (ગુજરાતી)" },
  surnameGu: { en: "Surname (Gujarati)", gu: "અટક (ગુજરાતી)" },
  aadhaarName: { en: "Name as per Aadhaar", gu: "આધાર પ્રમાણે નામ" },
  aadhaarNameGu: { en: "Aadhaar name (Gujarati)", gu: "આધાર નામ (ગુજરાતી)" },
  fatherName: { en: "Father name", gu: "પિતાનું નામ" },
  fatherNameGu: { en: "Father name (Gujarati)", gu: "પિતાનું નામ (ગુજરાતી)" },
  motherName: { en: "Mother name", gu: "માતાનું નામ" },
  motherNameGu: { en: "Mother name (Gujarati)", gu: "માતાનું નામ (ગુજરાતી)" },
  motherAadhaarNumber: { en: "Mother Aadhaar", gu: "માતાનો આધાર" },
  fatherAadhaarNumber: { en: "Father Aadhaar", gu: "પિતાનો આધાર" },
  guardianName: { en: "Guardian", gu: "વાલી" },
  guardianNameGu: { en: "Guardian (Gujarati)", gu: "વાલી (ગુજરાતી)" },
  parentOccupation: { en: "Parent occupation", gu: "માતા-પિતાનો વ્યવસાય" },
  annualFamilyIncome: { en: "Annual family income", gu: "વાર્ષિક પરિવાર આવક" },
  familySize: { en: "Family size", gu: "પરિવારનું કદ" },
  isOrphan: { en: "Orphan", gu: "અનાથ છે" },
  category: { en: "Category", gu: "શ્રેણી" },
  caste: { en: "Caste", gu: "જાતિ" },
  religion: { en: "Religion", gu: "ધર્મ" },
  maritalStatus: { en: "Marital status", gu: "વિવાહિત સ્થિતિ" },
  gender: { en: "Gender", gu: "જાતિ (લિંગ)" },
  dateOfBirth: { en: "Date of birth", gu: "જન્મ તારીખ" },
  startDate: { en: "Admission date", gu: "પ્રવેશ તારીખ" },
  mobileNumber: { en: "Mobile", gu: "મોબાઈલ" },
  email: { en: "Email", gu: "ઈમેલ" },
  bloodGroup: { en: "Blood group", gu: "બ્લડ ગ્રુપ" },
  rollNumber: { en: "Roll number", gu: "રોલ નંબર" },
  grNumber: { en: "GR number", gu: "જી.આર. નંબર" },
  aadhaarNumber: { en: "Aadhaar", gu: "આધાર" },
  childUid: { en: "Child UID", gu: "ચાઈલ્ડ UID" },
  apaarId: { en: "APAAR ID", gu: "APAAR ID" },
  penNumber: { en: "PEN", gu: "PEN" },
  panNumber: { en: "PAN", gu: "PAN" },
  rationCardNumber: { en: "Ration card", gu: "રાશન કાર્ડ" },
  currentAddress: { en: "Current address", gu: "હાલનું સરનામું" },
  currentCity: { en: "Current city", gu: "હાલનું શહેર" },
  currentDistrict: { en: "Current district", gu: "હાલનો જિલ્લો" },
  currentPincode: { en: "Current pincode", gu: "હાલનો પિનકોડ" },
  permanentAddress: { en: "Permanent address", gu: "કાયમી સરનામું" },
  permanentCity: { en: "Permanent city", gu: "કાયમી શહેર" },
  permanentDistrict: { en: "Permanent district", gu: "કાયમી જિલ્લો" },
  permanentPincode: { en: "Permanent pincode", gu: "કાયમી પિનકોડ" },
  residentType: { en: "Resident type", gu: "નિવાસી પ્રકાર" },
  habitationType: { en: "Habitation type", gu: "રહેઠાણ પ્રકાર" },
  isHosteler: { en: "Hosteler", gu: "હોસ્ટેલર છે" },
  hostelType: { en: "Hostel type", gu: "હોસ્ટેલ પ્રકાર" },
  hostelName: { en: "Hostel name", gu: "હોસ્ટેલનું નામ" },
  scholarshipScheme: { en: "Scholarship scheme", gu: "શિષ્યવૃત્તિ યોજના" },
  financialYear: { en: "Academic year", gu: "શૈક્ષણિક વર્ષ" },
  courseType: { en: "Course type", gu: "કોર્સ પ્રકાર" },
  courseName: { en: "Course name", gu: "કોર્સનું નામ" },
  institutionDistrict: { en: "Institution district", gu: "સંસ્થા જિલ્લો" },
  institutionName: { en: "Institution name", gu: "સંસ્થાનું નામ" },
  currentYear: { en: "Current year", gu: "હાલનું વર્ષ" },
  admissionType: { en: "Admission type", gu: "પ્રવેશ પ્રકાર" },
  board10th: { en: "10th board", gu: "10મું બોર્ડ" },
  percentage10th: { en: "10th percentage", gu: "10મું ટકાવારી" },
  year10th: { en: "10th year", gu: "10મું વર્ષ" },
  sscSeatPrefix: { en: "GSEB seat prefix", gu: "GSEB બેઠક પ્રિફિક્સ" },
  sscSeatNumber: { en: "GSEB seat number", gu: "GSEB બેઠક નંબર" },
  board12th: { en: "12th board", gu: "12મું બોર્ડ" },
  percentage12th: { en: "12th percentage", gu: "12મું ટકાવારી" },
  year12th: { en: "12th year", gu: "12મું વર્ષ" },
  ifscCode: { en: "IFSC", gu: "IFSC" },
  bankName: { en: "Bank name", gu: "બેંકનું નામ" },
  branchName: { en: "Branch name", gu: "શાખાનું નામ" },
  accountNumber: { en: "Account number", gu: "ખાતા નંબર" },
  accountHolderName: { en: "Account holder", gu: "ખાતાધારક" },
  notes: { en: "Notes", gu: "નોંધ" },
};

export function isEditLinkField(value: string): value is EditLinkField {
  return (EDIT_LINK_FIELDS as readonly string[]).includes(value);
}

export function isEditLinkBooleanField(field: EditLinkField) {
  return BOOLEAN_FIELDS.has(field);
}

export function isEditLinkNumberField(field: EditLinkField) {
  return INT_FIELDS.has(field) || FLOAT_FIELDS.has(field);
}

export const EDIT_LINK_SELECT_OPTIONS: Partial<Record<EditLinkField, readonly string[]>> = {
  category: CATEGORIES,
  gender: GENDERS,
  bloodGroup: BLOOD_GROUPS,
  maritalStatus: ["Unmarried", "Married"],
  residentType: ["Rural", "Urban"],
  habitationType: ["Own", "Rent"],
  admissionType: ["Regular", "Lateral", "Transfer"],
  parentOccupation: PARENT_OCCUPATIONS,
  currentDistrict: GUJARAT_DISTRICTS,
  permanentDistrict: GUJARAT_DISTRICTS,
  institutionDistrict: GUJARAT_DISTRICTS,
  financialYear: FINANCIAL_YEARS,
  courseType: COURSE_TYPES,
  currentYear: CURRENT_YEARS,
  board10th: BOARDS,
  board12th: BOARDS,
  sscSeatPrefix: ["A", "B", "C", "S", "P"],
  scholarshipScheme: [...PRE_MATRIC_SCHEMES, ...POST_MATRIC_SCHEMES],
};

export const EDIT_LINK_DATE_FIELDS = new Set<EditLinkField>(["dateOfBirth", "startDate"]);
export const EDIT_LINK_AREA_FIELDS = new Set<EditLinkField>([
  "currentAddress",
  "permanentAddress",
  "notes",
]);

export function cleanEditLinkFields(input: unknown): EditLinkField[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<EditLinkField>();
  for (const item of input) {
    const key = String(item || "");
    if (isEditLinkField(key)) seen.add(key);
  }
  return EDIT_LINK_FIELDS.filter((key) => seen.has(key));
}

export function readStoredFields(value: unknown): EditLinkField[] {
  return cleanEditLinkFields(value);
}

export function editLinkPrismaSelect() {
  const select: Record<string, true> = { id: true };
  for (const field of EDIT_LINK_FIELDS) select[field] = true;
  return select;
}

function randomChunk(length: number) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function generateEditLinkCode() {
  return randomChunk(8);
}

export function generateEditLinkPassword() {
  const bytes = randomBytes(4);
  let out = "";
  for (let i = 0; i < 4; i++) out += String(bytes[i]! % 10);
  return out;
}

export function formatStoredEditLink(link: {
  id: string;
  code: string;
  passwordEnc: string;
  fieldsJson: unknown;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  schoolClass: { id: string; name: string; standard: string; section: string; academicYear: string };
}) {
  return {
    id: link.id,
    code: link.code,
    password: openEditLinkPassword(link.passwordEnc) || "",
    path: `/student-edit/${link.code}`,
    fields: readStoredFields(link.fieldsJson),
    isActive: link.isActive,
    createdAt: link.createdAt.toISOString(),
    lastUsedAt: link.lastUsedAt?.toISOString() || null,
    class: {
      id: link.schoolClass.id,
      name: link.schoolClass.name,
      standard: link.schoolClass.standard,
      section: link.schoolClass.section,
      academicYear: link.schoolClass.academicYear,
    },
  };
}

export function sealEditLinkPassword(password: string) {
  return encryptSecret(password);
}

export function openEditLinkPassword(enc: string | null | undefined) {
  return decryptSecret(enc);
}

export function editLinkPasswordMatches(enc: string, password: string) {
  const stored = decryptSecret(enc);
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(password.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signEditLinkToken(linkId: string, hours = 12) {
  const exp = Date.now() + hours * 60 * 60 * 1000;
  const body = `${linkId}.${exp}`;
  const sig = createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readEditLinkToken(token: string | null | undefined): { linkId: string } | null {
  const raw = String(token || "").trim();
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [linkId, expRaw, sig] = parts;
  if (!linkId || !expRaw || !sig) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = createHmac("sha256", getAuthSecret()).update(`${linkId}.${expRaw}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { linkId };
}

function pickListed(list: readonly string[], text: string) {
  return list.find((item) => item.toLowerCase() === text.toLowerCase()) || null;
}

function parentAadhaar(text: string, label: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const digits = text.replace(/\D/g, "");
  if (!digits) return { ok: true, value: null };
  if (!/^\d{12}$/.test(digits)) return { ok: false, error: `${label} must be 12 digits` };
  return { ok: true, value: digits };
}

export function sanitizeEditLinkValue(
  field: EditLinkField,
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (BOOLEAN_FIELDS.has(field)) {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v || v === "false" || v === "0" || v === "no" || v === "n") return { ok: true, value: "false" };
    if (v === "true" || v === "1" || v === "yes" || v === "y") return { ok: true, value: "true" };
    return { ok: false, error: `${field} must be yes or no` };
  }

  const keepLines = field === "currentAddress" || field === "permanentAddress" || field === "notes";
  const text = keepLines
    ? String(raw ?? "").trim()
    : String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) {
    if (REQUIRED.has(field)) return { ok: false, error: `${field} is required` };
    return { ok: true, value: null };
  }
  const max = MAX_LEN[field];
  if (max && text.length > max) return { ok: false, error: `${field} is too long` };

  if (field === "mobileNumber") {
    const digits = text.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: "Enter a valid 10-digit mobile" };
    return { ok: true, value: digits };
  }
  if (field === "aadhaarNumber") {
    const digits = text.replace(/\D/g, "");
    if (!/^\d{12}$/.test(digits)) return { ok: false, error: "Aadhaar must be 12 digits" };
    return { ok: true, value: digits };
  }
  if (field === "motherAadhaarNumber") return parentAadhaar(text, "Mother Aadhaar");
  if (field === "fatherAadhaarNumber") return parentAadhaar(text, "Father Aadhaar");
  if (field === "currentPincode" || field === "permanentPincode") {
    const digits = text.replace(/\D/g, "");
    if (!/^\d{6}$/.test(digits)) return { ok: false, error: "Pincode must be 6 digits" };
    return { ok: true, value: digits };
  }
  if (field === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { ok: false, error: "Enter a valid email" };
    return { ok: true, value: text.toLowerCase() };
  }
  if (field === "category") {
    const match = pickListed(CATEGORIES, text);
    if (!match) return { ok: false, error: "Choose a valid category" };
    return { ok: true, value: match };
  }
  if (field === "gender") {
    const match = pickListed(GENDERS, text);
    if (!match) return { ok: false, error: "Choose a valid gender" };
    return { ok: true, value: match };
  }
  if (field === "religion") {
    return { ok: true, value: resolveReligionName(text) || text };
  }
  if (field === "bloodGroup") {
    const match = pickListed(BLOOD_GROUPS, text);
    if (!match) return { ok: false, error: "Choose a valid blood group" };
    return { ok: true, value: match };
  }
  if (field === "maritalStatus") {
    const match = pickListed([...MARITAL], text);
    if (!match) return { ok: false, error: "Choose unmarried or married" };
    return { ok: true, value: match };
  }
  if (field === "residentType") {
    const match = pickListed([...RESIDENT], text);
    if (!match) return { ok: false, error: "Choose rural or urban" };
    return { ok: true, value: match };
  }
  if (field === "habitationType") {
    const match = pickListed([...HABITATION], text);
    if (!match) return { ok: false, error: "Choose own or rent" };
    return { ok: true, value: match };
  }
  if (field === "admissionType") {
    const match = pickListed([...ADMISSION], text);
    if (!match) return { ok: false, error: "Choose a valid admission type" };
    return { ok: true, value: match };
  }
  if (field === "currentDistrict" || field === "permanentDistrict" || field === "institutionDistrict") {
    const match = GUJARAT_DISTRICTS.find((item) => item.toLowerCase() === text.toLowerCase());
    if (match) return { ok: true, value: match };
    if (DISTRICT_SET.size && text.length >= 2) return { ok: true, value: text };
    return { ok: false, error: "Choose a district" };
  }
  if (field === "financialYear") {
    const match = pickListed(FINANCIAL_YEARS, text);
    return { ok: true, value: match || text };
  }
  if (field === "courseType") {
    const match = pickListed(COURSE_TYPES, text);
    return { ok: true, value: match || text };
  }
  if (field === "currentYear") {
    const match = pickListed(CURRENT_YEARS, text);
    return { ok: true, value: match || text };
  }
  if (field === "board10th" || field === "board12th") {
    const match = pickListed(BOARDS, text);
    return { ok: true, value: match || text };
  }
  if (field === "sscSeatPrefix") {
    const prefix = text.toUpperCase();
    if (!SSC_PREFIXES.has(prefix)) return { ok: false, error: "GSEB seat prefix must be A, B, C, S or P" };
    return { ok: true, value: prefix };
  }
  if (field === "sscSeatNumber") {
    const digits = text.replace(/\D/g, "");
    if (digits && !/^\d{7}$/.test(digits)) return { ok: false, error: "GSEB seat number must be 7 digits" };
    return { ok: true, value: digits || null };
  }
  if (field === "panNumber") {
    const pan = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (pan.length !== 10) return { ok: false, error: "PAN must be 10 characters" };
    return { ok: true, value: pan };
  }
  if (field === "rationCardNumber") {
    const card = text.replace(/[\s\-]/g, "").toUpperCase();
    if (!isValidRationCard(card)) return { ok: false, error: "Enter a valid ration card number" };
    return { ok: true, value: card };
  }
  if (field === "ifscCode") {
    const ifsc = text.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return { ok: false, error: "Enter a valid IFSC code" };
    return { ok: true, value: ifsc };
  }
  if (field === "accountNumber") {
    const digits = text.replace(/\D/g, "");
    if (!isValidAccountNumber(digits)) {
      return { ok: false, error: `Account number must be ${ACCOUNT_NUMBER_MIN}–${ACCOUNT_NUMBER_MAX} digits` };
    }
    return { ok: true, value: digits };
  }
  if (field === "childUid") {
    const digits = text.replace(/\D/g, "");
    if (digits && digits.length !== 18) return { ok: false, error: "Child UID must be 18 digits" };
    return { ok: true, value: digits || null };
  }
  if (field === "year10th" || field === "year12th") {
    if (!/^\d{4}$/.test(text)) return { ok: false, error: "Year must be 4 digits" };
    return { ok: true, value: text };
  }
  if (INT_FIELDS.has(field)) {
    const n = parseInt(text, 10);
    if (!Number.isFinite(n) || n < 0 || n > 30) return { ok: false, error: "Family size must be 0–30" };
    return { ok: true, value: String(n) };
  }
  if (field === "annualFamilyIncome") {
    const n = parseFloat(text.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Enter a valid income" };
    return { ok: true, value: String(n) };
  }
  if (field === "percentage10th" || field === "percentage12th") {
    const n = parseFloat(text);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: "Percentage must be 0–100" };
    return { ok: true, value: String(n) };
  }
  if (
    field === "apaarId" ||
    field === "penNumber" ||
    field === "rollNumber" ||
    field === "grNumber"
  ) {
    return { ok: true, value: text.toUpperCase() };
  }
  return { ok: true, value: text };
}

export function editLinkValueForPrisma(
  field: EditLinkField,
  value: string | null,
): string | number | boolean | null | undefined {
  if (BOOLEAN_FIELDS.has(field)) {
    return value === "true" || value === "1";
  }
  if (INT_FIELDS.has(field)) {
    if (value == null || value === "") return NEVER_NULL.has(field) ? undefined : null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  if (FLOAT_FIELDS.has(field)) {
    if (value == null || value === "") return NEVER_NULL.has(field) ? undefined : null;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (value == null && NEVER_NULL.has(field)) return undefined;
  return value;
}
