import type { Student } from "@/generated/prisma/client";
import {
  formatDobDisplay,
  todayDobDisplay,
} from "@/lib/student-age";
import {
  isDraftDobPlaceholder,
  stripDraftPlaceholdersForForm,
} from "@/lib/student-draft";
import { bilingualNamePair } from "@/lib/gujarati/transliterate-core";

/** Scalar student fields safe to put into the admission form (no relations / meta). */
export const STUDENT_FORM_FIELD_KEYS = [
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
  "guardianName",
  "guardianNameGu",
  "category",
  "caste",
  "religion",
  "maritalStatus",
  "parentOccupation",
  "isOrphan",
  "annualFamilyIncome",
  "classId",
  "rollNumber",
  "grNumber",
  "section",
  "standard",
  "childUid",
  "apaarId",
  "panNumber",
  "bloodGroup",
  "idCardValidUpto",
  "currentAddress",
  "currentDistrict",
  "currentCity",
  "currentPincode",
  "permanentAddress",
  "permanentDistrict",
  "permanentCity",
  "permanentPincode",
  "habitationType",
  "familySize",
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
  "startDate",
  "completionDate",
  "board10th",
  "percentage10th",
  "year10th",
  "sscSeatPrefix",
  "sscSeatNumber",
  "board12th",
  "percentage12th",
  "year12th",
  "hscSeatPrefix",
  "hscSeatNumber",
  "previousQualification",
  "bankName",
  "branchName",
  "accountNumber",
  "ifscCode",
  "accountHolderName",
  "dgLoginId",
  "dgPassword",
  "dgLoginMethod",
  "photoPath",
  "aadhaarDocPath",
  "incomeCertPath",
  "casteCertPath",
  "marksheet10Path",
  "marksheet12Path",
  "bankPassbookPath",
  "feeReceiptPath",
  "notes",
  "status",
  "admissionStatus",
] as const;

export type StudentFormFields = Partial<Student> & {
  className?: string | null;
};

type SchoolClassLite = {
  id?: string;
  name?: string | null;
  standard?: string | null;
  section?: string | null;
  academicYear?: string | null;
};

function ensureMissingGuNames(data: StudentFormFields): StudentFormFields {
  const out = { ...data };
  const pairs: [keyof Student, keyof Student][] = [
    ["firstName", "firstNameGu"],
    ["middleName", "middleNameGu"],
    ["surname", "surnameGu"],
    ["aadhaarName", "aadhaarNameGu"],
    ["motherName", "motherNameGu"],
    ["fatherName", "fatherNameGu"],
    ["guardianName", "guardianNameGu"],
  ];
  for (const [enKey, guKey] of pairs) {
    const en = String(out[enKey] || "").trim();
    const gu = String(out[guKey] || "").trim();
    if (en && !gu) {
      (out as Record<string, string | null | undefined>)[String(guKey)] = bilingualNamePair(en).gu;
    }
  }
  return out;
}

/**
 * Map a DB / API student record into clean form values (full data, no relations).
 */
export function studentRecordToFormData(
  student: Record<string, unknown> & {
    schoolClass?: SchoolClassLite | null;
  },
): StudentFormFields {
  const picked: Record<string, unknown> = {};

  for (const key of STUDENT_FORM_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(student, key)) {
      picked[key] = student[key];
    }
  }

  // Always keep class id if present
  if (student.classId !== undefined) picked.classId = student.classId;

  const sc = student.schoolClass;
  if (sc) {
    if (!picked.standard && sc.standard) picked.standard = sc.standard;
    if (!picked.section && sc.section) picked.section = sc.section;
    if (sc.name) picked.className = sc.name;
    if (!picked.classId && sc.id) picked.classId = sc.id;
  }

  let next = stripDraftPlaceholdersForForm(picked, "placeholders") as StudentFormFields;

  const dob = String(next.dateOfBirth || "").trim();
  if (!dob || isDraftDobPlaceholder(dob)) {
    next.dateOfBirth = todayDobDisplay();
  } else {
    next.dateOfBirth = formatDobDisplay(dob);
  }

  if (next.apaarId) {
    next.apaarId = String(next.apaarId).replace(/\s/g, "").trim().toUpperCase();
  }

  if (next.familySize !== undefined && next.familySize !== null) {
    next.familySize = Number(next.familySize) || 0;
  }

  if (next.annualFamilyIncome !== undefined && next.annualFamilyIncome !== null) {
    next.annualFamilyIncome = Number(next.annualFamilyIncome) || 0;
  }

  next = ensureMissingGuNames(next);
  return next;
}

/** Compact preview rows for APAAR / import success panel */
export function studentFormPreviewRows(
  data: StudentFormFields,
  labels: {
    name: string;
    aadhaarName: string;
    aadhaar: string;
    dob: string;
    gender: string;
    mobile: string;
    fatherMother: string;
    category: string;
    caste: string;
    religion: string;
    address: string;
    district: string;
    pincode: string;
    gr: string;
    classLabel: string;
    apaar: string;
    bank: string;
    account: string;
    ifsc: string;
    scholarship: string;
    childUid: string;
  },
): [string, string][] {
  const name = [data.firstName, data.middleName, data.surname].filter(Boolean).join(" ");
  const rows: [string, string][] = [
    [labels.name, name],
    [labels.aadhaarName, String(data.aadhaarName || "")],
    [labels.apaar, String(data.apaarId || "")],
    [labels.aadhaar, String(data.aadhaarNumber || "")],
    [labels.dob, String(data.dateOfBirth || "")],
    [labels.gender, String(data.gender || "")],
    [labels.mobile, String(data.mobileNumber || "")],
    [labels.fatherMother, `${data.fatherName || ""} / ${data.motherName || ""}`],
    [labels.category, String(data.category || "")],
    [labels.caste, String(data.caste || "")],
    [labels.religion, String(data.religion || "")],
    [labels.gr, String(data.grNumber || "")],
    [
      labels.classLabel,
      [data.className, data.standard, data.section].filter(Boolean).join(" · "),
    ],
    [labels.childUid, String(data.childUid || "")],
    [labels.address, String(data.currentAddress || "")],
    [labels.district, String(data.currentDistrict || "")],
    [labels.pincode, String(data.currentPincode || "")],
    [labels.bank, String(data.bankName || "")],
    [labels.account, String(data.accountNumber || "")],
    [labels.ifsc, String(data.ifscCode || "")],
    [labels.scholarship, String(data.scholarshipScheme || "")],
  ];
  return rows.filter(([, v]) => Boolean(String(v || "").trim()));
}
