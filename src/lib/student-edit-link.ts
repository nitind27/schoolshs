import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { CATEGORIES, GENDERS } from "@/lib/constants";
import { getAuthSecret } from "@/lib/env-auth";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { resolveReligionName } from "@/lib/school-religions";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const EDIT_LINK_FIELDS = [
  "firstName",
  "middleName",
  "surname",
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "fatherName",
  "fatherNameGu",
  "motherName",
  "motherNameGu",
  "guardianName",
  "category",
  "caste",
  "religion",
  "gender",
  "dateOfBirth",
  "mobileNumber",
  "email",
  "bloodGroup",
  "rollNumber",
  "grNumber",
  "aadhaarNumber",
  "childUid",
  "apaarId",
  "penNumber",
  "currentAddress",
  "currentCity",
  "currentDistrict",
  "currentPincode",
  "permanentAddress",
  "permanentCity",
  "permanentDistrict",
  "permanentPincode",
] as const;

export type EditLinkField = (typeof EDIT_LINK_FIELDS)[number];

export const EDIT_LINK_GROUPS: { id: string; fields: readonly EditLinkField[] }[] = [
  {
    id: "name",
    fields: ["firstName", "middleName", "surname", "firstNameGu", "middleNameGu", "surnameGu"],
  },
  {
    id: "family",
    fields: ["fatherName", "fatherNameGu", "motherName", "motherNameGu", "guardianName"],
  },
  { id: "community", fields: ["category", "caste", "religion"] },
  { id: "contact", fields: ["gender", "dateOfBirth", "mobileNumber", "email", "bloodGroup"] },
  {
    id: "ids",
    fields: ["rollNumber", "grNumber", "aadhaarNumber", "childUid", "apaarId", "penNumber"],
  },
  {
    id: "address",
    fields: [
      "currentAddress",
      "currentCity",
      "currentDistrict",
      "currentPincode",
      "permanentAddress",
      "permanentCity",
      "permanentDistrict",
      "permanentPincode",
    ],
  },
];

const REQUIRED = new Set<EditLinkField>([
  "firstName",
  "surname",
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
  fatherName: 120,
  fatherNameGu: 120,
  motherName: 120,
  motherNameGu: 120,
  guardianName: 120,
  caste: 80,
  religion: 80,
  dateOfBirth: 20,
  mobileNumber: 10,
  email: 120,
  bloodGroup: 8,
  rollNumber: 20,
  grNumber: 30,
  aadhaarNumber: 12,
  childUid: 40,
  apaarId: 16,
  penNumber: 16,
  currentPincode: 6,
  permanentPincode: 6,
};

export const EDIT_LINK_LABELS: Record<EditLinkField, { en: string; gu: string }> = {
  firstName: { en: "First name", gu: "નામ" },
  middleName: { en: "Middle name", gu: "પિતાનું નામ (મધ્ય)" },
  surname: { en: "Surname", gu: "અટક" },
  firstNameGu: { en: "First name (Gujarati)", gu: "નામ (ગુજરાતી)" },
  middleNameGu: { en: "Middle name (Gujarati)", gu: "મધ્ય નામ (ગુજરાતી)" },
  surnameGu: { en: "Surname (Gujarati)", gu: "અટક (ગુજરાતી)" },
  fatherName: { en: "Father name", gu: "પિતાનું નામ" },
  fatherNameGu: { en: "Father name (Gujarati)", gu: "પિતાનું નામ (ગુજરાતી)" },
  motherName: { en: "Mother name", gu: "માતાનું નામ" },
  motherNameGu: { en: "Mother name (Gujarati)", gu: "માતાનું નામ (ગુજરાતી)" },
  guardianName: { en: "Guardian", gu: "વાલી" },
  category: { en: "Category", gu: "શ્રેણી" },
  caste: { en: "Caste", gu: "જાતિ" },
  religion: { en: "Religion", gu: "ધર્મ" },
  gender: { en: "Gender", gu: "જાતિ (લિંગ)" },
  dateOfBirth: { en: "Date of birth", gu: "જન્મ તારીખ" },
  mobileNumber: { en: "Mobile", gu: "મોબાઈલ" },
  email: { en: "Email", gu: "ઈમેલ" },
  bloodGroup: { en: "Blood group", gu: "બ્લડ ગ્રુપ" },
  rollNumber: { en: "Roll number", gu: "રોલ નંબર" },
  grNumber: { en: "GR number", gu: "જી.આર. નંબર" },
  aadhaarNumber: { en: "Aadhaar", gu: "આધાર" },
  childUid: { en: "Child UID", gu: "ચાઈલ્ડ UID" },
  apaarId: { en: "APAAR ID", gu: "APAAR ID" },
  penNumber: { en: "PEN", gu: "PEN" },
  currentAddress: { en: "Current address", gu: "હાલનું સરનામું" },
  currentCity: { en: "Current city", gu: "હાલનું શહેર" },
  currentDistrict: { en: "Current district", gu: "હાલનો જિલ્લો" },
  currentPincode: { en: "Current pincode", gu: "હાલનો પિનકોડ" },
  permanentAddress: { en: "Permanent address", gu: "કાયમી સરનામું" },
  permanentCity: { en: "Permanent city", gu: "કાયમી શહેર" },
  permanentDistrict: { en: "Permanent district", gu: "કાયમી જિલ્લો" },
  permanentPincode: { en: "Permanent pincode", gu: "કાયમી પિનકોડ" },
};

export function isEditLinkField(value: string): value is EditLinkField {
  return (EDIT_LINK_FIELDS as readonly string[]).includes(value);
}

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
  return randomChunk(8);
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

export function sanitizeEditLinkValue(
  field: EditLinkField,
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const keepLines = field === "currentAddress" || field === "permanentAddress";
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
    const match = CATEGORIES.find((item) => item.toLowerCase() === text.toLowerCase());
    if (!match) return { ok: false, error: "Choose a valid category" };
    return { ok: true, value: match };
  }
  if (field === "gender") {
    const match = GENDERS.find((item) => item.toLowerCase() === text.toLowerCase());
    if (!match) return { ok: false, error: "Choose a valid gender" };
    return { ok: true, value: match };
  }
  if (field === "religion") {
    return { ok: true, value: resolveReligionName(text) || text };
  }
  if (field === "apaarId" || field === "penNumber" || field === "childUid" || field === "rollNumber" || field === "grNumber") {
    return { ok: true, value: text.toUpperCase() };
  }
  return { ok: true, value: text };
}
