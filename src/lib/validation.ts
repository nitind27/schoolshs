import type { Student } from "@/generated/prisma/client";
import { normalizeCategory } from "@/lib/category-inference";
import { isSpecificScholarshipScheme } from "@/lib/dg-portal";
import { parseImportDate } from "@/lib/import/import-formats";
import {
  isScholarshipRequired,
  isValidAccountNumber,
  isValidRationCard,
  requires10thBoard,
  requires12thBoard,
} from "@/lib/student-academic-rules";
import { calcAgeYears } from "@/lib/student-age";

export type StudentInput = Omit<Student, "id" | "createdAt" | "updatedAt" | "submissionDate" | "validationErrors">;

export interface ValidationError {
  field: string;
  message: string;
}

const ALWAYS_REQUIRED: { field: keyof StudentInput; label: string }[] = [
  { field: "firstName", label: "First Name" },
  { field: "surname", label: "Surname" },
  { field: "aadhaarName", label: "Aadhaar Name" },
  { field: "dateOfBirth", label: "Date of Birth" },
  { field: "gender", label: "Gender" },
  { field: "aadhaarNumber", label: "Aadhaar Number" },
  { field: "mobileNumber", label: "Mobile Number" },
  { field: "motherName", label: "Mother Name" },
  { field: "fatherName", label: "Father Name" },
  { field: "category", label: "Category" },
  { field: "religion", label: "Religion" },
  { field: "parentOccupation", label: "Parent Occupation" },
  { field: "annualFamilyIncome", label: "Annual Family Income" },
  { field: "currentAddress", label: "Current Address" },
  { field: "currentDistrict", label: "Current District" },
  { field: "currentCity", label: "Current City" },
  { field: "currentPincode", label: "Current Pincode" },
  { field: "permanentAddress", label: "Permanent Address" },
  { field: "permanentDistrict", label: "Permanent District" },
  { field: "permanentCity", label: "Permanent City" },
  { field: "permanentPincode", label: "Permanent Pincode" },
  { field: "financialYear", label: "Financial Year" },
  { field: "courseType", label: "Course Type" },
  { field: "courseName", label: "Course / Class Name" },
  { field: "institutionDistrict", label: "Institution District" },
  { field: "institutionName", label: "Institution Name" },
  { field: "bankName", label: "Bank Name" },
  { field: "branchName", label: "Branch Name" },
  { field: "accountNumber", label: "Account Number" },
  { field: "ifscCode", label: "IFSC Code" },
  { field: "accountHolderName", label: "Account Holder Name" },
];

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return isNaN(value);
  return false;
}

export function validateStudent(data: Partial<StudentInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { field, label } of ALWAYS_REQUIRED) {
    if (isEmpty(data[field])) {
      errors.push({ field, message: `${label} is required` });
    }
  }

  if (isScholarshipRequired(data.category) && isEmpty(data.scholarshipScheme)) {
    errors.push({ field: "scholarshipScheme", message: "Scholarship Scheme is required for this category" });
  } else if (
    !isEmpty(data.scholarshipScheme) &&
    !isSpecificScholarshipScheme(String(data.scholarshipScheme))
  ) {
    errors.push({
      field: "scholarshipScheme",
      message:
        "Select a specific scholarship scheme (e.g. Pre Matric Scholarship - SC), not a placeholder like Pre-Matric",
    });
  }

  if (requires10thBoard(data.standard)) {
    if (isEmpty(data.board10th)) errors.push({ field: "board10th", message: "10th Board is required" });
    if (isEmpty(data.percentage10th)) errors.push({ field: "percentage10th", message: "10th Percentage is required" });
    if (isEmpty(data.year10th)) errors.push({ field: "year10th", message: "10th Year is required" });
  }

  if (requires12thBoard(data.standard)) {
    if (isEmpty(data.board12th)) errors.push({ field: "board12th", message: "12th Board is required" });
    if (isEmpty(data.percentage12th)) errors.push({ field: "percentage12th", message: "12th Percentage is required" });
    if (isEmpty(data.year12th)) errors.push({ field: "year12th", message: "12th Year is required" });
  }

  if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber.replace(/\s/g, ""))) {
    errors.push({ field: "aadhaarNumber", message: "Aadhaar must be 12 digits" });
  }

  if (data.mobileNumber && !/^[6-9]\d{9}$/.test(data.mobileNumber.replace(/\s/g, ""))) {
    errors.push({ field: "mobileNumber", message: "Invalid mobile number" });
  }

  if (data.currentPincode && !/^\d{6}$/.test(data.currentPincode)) {
    errors.push({ field: "currentPincode", message: "Pincode must be 6 digits" });
  }

  if (data.permanentPincode && !/^\d{6}$/.test(data.permanentPincode)) {
    errors.push({ field: "permanentPincode", message: "Permanent pincode must be 6 digits" });
  }

  if (data.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())) {
    errors.push({ field: "ifscCode", message: "Invalid IFSC code format" });
  }

  if (data.accountNumber && !isValidAccountNumber(data.accountNumber)) {
    errors.push({
      field: "accountNumber",
      message: "Account number must be 9–18 digits",
    });
  }

  if (data.rationCardNumber && !isValidRationCard(data.rationCardNumber)) {
    errors.push({
      field: "rationCardNumber",
      message: "Ration card number must be 8–15 letters/digits",
    });
  }

  const pan = String(data.panNumber || "").replace(/\s/g, "").toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    errors.push({ field: "panNumber", message: "PAN must be like ABCDE1234F" });
  }

  const apaar = String(data.apaarId || "").replace(/\s/g, "");
  if (apaar && !/^[A-Za-z0-9]{8,16}$/.test(apaar)) {
    errors.push({ field: "apaarId", message: "APAAR / UPPAR ID looks invalid" });
  }

  const pen = String(data.penNumber || "").replace(/\s/g, "");
  if (pen && !/^\d{8,16}$/.test(pen)) {
    errors.push({ field: "penNumber", message: "PEN must be 8–16 digits" });
  }

  for (const { field, label } of [
    { field: "motherAadhaarNumber" as const, label: "Mother Aadhaar" },
    { field: "fatherAadhaarNumber" as const, label: "Father Aadhaar" },
  ]) {
    const v = String(data[field] || "").replace(/\s/g, "");
    if (v && !/^\d{12}$/.test(v)) {
      errors.push({ field, message: `${label} must be 12 digits` });
    }
  }

  if (data.percentage10th !== undefined && data.percentage10th !== null && (data.percentage10th < 0 || data.percentage10th > 100)) {
    errors.push({ field: "percentage10th", message: "10th percentage must be between 0-100" });
  }

  if (data.percentage12th !== undefined && data.percentage12th !== null && (data.percentage12th < 0 || data.percentage12th > 100)) {
    errors.push({ field: "percentage12th", message: "12th percentage must be between 0-100" });
  }

  if (data.isHosteler && !data.hostelName) {
    errors.push({ field: "hostelName", message: "Hostel name required for hosteler students" });
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  // Age vs class: warn in UI only — late admissions / repeaters are common
  if (data.dateOfBirth && calcAgeYears(data.dateOfBirth) == null) {
    errors.push({ field: "dateOfBirth", message: "Invalid date of birth" });
  }

  return errors;
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["yes", "true", "1", "y"].includes(value.toLowerCase().trim());
  }
  return false;
}

export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,\s₹]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function normalizeStudentRow(row: Record<string, unknown>): Partial<StudentInput> {
  return {
    firstName: String(row.firstName || "").trim(),
    middleName: String(row.middleName || "").trim() || null,
    surname: String(row.surname || "").trim(),
    firstNameGu: String(row.firstNameGu || "").trim() || null,
    middleNameGu: String(row.middleNameGu || "").trim() || null,
    surnameGu: String(row.surnameGu || "").trim() || null,
    aadhaarName: String(row.aadhaarName || "").trim(),
    aadhaarNameGu: String(row.aadhaarNameGu || "").trim() || null,
    dateOfBirth: parseImportDate(row.dateOfBirth),
    gender: String(row.gender || "").trim(),
    aadhaarNumber: String(row.aadhaarNumber || "").replace(/\s/g, "").trim(),
    rationCardNumber: String(row.rationCardNumber || "").trim() || null,
    mobileNumber: String(row.mobileNumber || "").replace(/\s/g, "").trim(),
    email: String(row.email || "").trim() || null,
    motherName: String(row.motherName || "").trim(),
    fatherName: String(row.fatherName || "").trim(),
    motherNameGu: String(row.motherNameGu || "").trim() || null,
    fatherNameGu: String(row.fatherNameGu || "").trim() || null,
    motherAadhaarNumber: String(row.motherAadhaarNumber || "").replace(/\s/g, "").trim() || null,
    fatherAadhaarNumber: String(row.fatherAadhaarNumber || "").replace(/\s/g, "").trim() || null,
    guardianName: String(row.guardianName || "").trim() || null,
    guardianNameGu: String(row.guardianNameGu || "").trim() || null,
    category: normalizeCategory(String(row.category || "").trim()) || String(row.category || "").trim(),
    caste: String(row.caste || "").trim() || null,
    religion: String(row.religion || "").trim(),
    maritalStatus: String(row.maritalStatus || "Unmarried").trim(),
    parentOccupation: String(row.parentOccupation || "").trim(),
    isOrphan: parseBoolean(row.isOrphan),
    annualFamilyIncome: parseNumber(row.annualFamilyIncome),
    currentAddress: String(row.currentAddress || "").trim(),
    currentDistrict: String(row.currentDistrict || "").trim(),
    currentCity: String(row.currentCity || "").trim(),
    currentPincode: String(row.currentPincode || "").trim(),
    permanentAddress: String(row.permanentAddress || "").trim(),
    permanentDistrict: String(row.permanentDistrict || "").trim(),
    permanentCity: String(row.permanentCity || "").trim(),
    permanentPincode: String(row.permanentPincode || "").trim(),
    habitationType: String(row.habitationType || "Own").trim(),
    familySize: parseInt(String(row.familySize ?? "0"), 10) || 0,
    residentType: String(row.residentType || "Rural").trim(),
    isHosteler: parseBoolean(row.isHosteler),
    hostelType: String(row.hostelType || "").trim() || null,
    hostelName: String(row.hostelName || "").trim() || null,
    scholarshipScheme: String(row.scholarshipScheme || "").trim(),
    financialYear: String(row.financialYear || "2025-26").trim(),
    courseType: String(row.courseType || "").trim(),
    courseName: String(row.courseName || "").trim(),
    institutionDistrict: String(row.institutionDistrict || "").trim(),
    institutionName: String(row.institutionName || "").trim(),
    currentYear: String(row.currentYear || "").trim(),
    admissionType: String(row.admissionType || "Regular").trim(),
    startDate: parseImportDate(row.startDate) || null,
    completionDate: parseImportDate(row.completionDate) || null,
    board10th: String(row.board10th || "").trim(),
    percentage10th: parseNumber(row.percentage10th),
    year10th: String(row.year10th || "").trim(),
    board12th: String(row.board12th || "").trim() || null,
    percentage12th: row.percentage12th ? parseNumber(row.percentage12th) : null,
    year12th: String(row.year12th || "").trim() || null,
    previousQualification: String(row.previousQualification || "").trim() || null,
    bankName: String(row.bankName || "").trim(),
    branchName: String(row.branchName || "").trim(),
    accountNumber: String(row.accountNumber || "").replace(/\s/g, "").trim(),
    ifscCode: String(row.ifscCode || "").toUpperCase().trim(),
    accountHolderName: String(row.accountHolderName || "").trim(),
    classId: String(row.classId || "").trim() || null,
    rollNumber: String(row.rollNumber || "").trim() || null,
    grNumber: String(row.grNumber || "").trim() || null,
    section: String(row.section || "").trim() || null,
    standard: String(row.standard || "").trim() || null,
    childUid: String(row.childUid || "").replace(/\s/g, "").trim() || null,
    apaarId: String(row.apaarId || "").replace(/\s/g, "").trim().toUpperCase() || null,
    penNumber: String(row.penNumber || "").replace(/\s/g, "").trim() || null,
    panNumber: String(row.panNumber || "")
      .replace(/\s/g, "")
      .trim()
      .toUpperCase() || null,
    bloodGroup: String(row.bloodGroup || "").trim() || null,
    idCardValidUpto: parseImportDate(row.idCardValidUpto) || null,
    sscSeatPrefix: String(row.sscSeatPrefix || "").trim().toUpperCase() || null,
    sscSeatNumber: String(row.sscSeatNumber || "").replace(/\s/g, "").trim() || null,
    hscSeatPrefix: String(row.hscSeatPrefix || "").trim().toUpperCase() || null,
    hscSeatNumber: String(row.hscSeatNumber || "").replace(/\s/g, "").trim() || null,
    status: "draft",
    notes: null,
  };
}

export function getCompletionPercentage(data: Partial<StudentInput>): number {
  const fields: (keyof StudentInput)[] = [
    "firstName",
    "surname",
    "aadhaarName",
    "dateOfBirth",
    "gender",
    "aadhaarNumber",
    "mobileNumber",
    "motherName",
    "fatherName",
    "category",
    "religion",
    "parentOccupation",
    "annualFamilyIncome",
    "currentAddress",
    "currentDistrict",
    "currentCity",
    "currentPincode",
    "permanentAddress",
    "permanentDistrict",
    "permanentCity",
    "permanentPincode",
    "courseType",
    "courseName",
    "institutionDistrict",
    "institutionName",
    "bankName",
    "branchName",
    "accountNumber",
    "ifscCode",
    "accountHolderName",
  ];

  if (isScholarshipRequired(data.category)) {
    fields.push("scholarshipScheme");
  }

  let filled = 0;
  for (const field of fields) {
    if (isFilledForProgress(field, data[field])) filled += 1;
  }

  return Math.min(100, Math.round((filled / fields.length) * 100));
}

function isFilledForProgress(field: string, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return false;
    // Draft zeros / empty income should not count
    if (
      (field === "annualFamilyIncome" || field === "percentage10th" || field === "percentage12th") &&
      value === 0
    ) {
      return false;
    }
    return true;
  }
  if (typeof value !== "string") return Boolean(value);
  const v = value.trim();
  if (!v || v === "—" || v === "-" || v === "–") return false;

  // Known auto-draft fakes
  if (field === "mobileNumber" && v === "9000000000") return false;
  if (field === "accountNumber" && v === "0000000000") return false;
  if (field === "ifscCode" && v.toUpperCase() === "SBIN0000000") return false;
  if ((field === "currentPincode" || field === "permanentPincode") && v === "380001") return false;
  if (field === "courseName" && (v === "Class" || /^Class\s*$/i.test(v))) return false;
  if (field === "courseType" && v === "School") return false;
  if (field === "scholarshipScheme" && v === "Pre-Matric") return false;
  if (field === "category" && v === "General") return false;
  if (field === "currentYear" && v === "1") return false;
  if (field === "aadhaarNumber" && /^9\d{11}$/.test(v.replace(/\s/g, ""))) return false;
  if (field === "aadhaarNumber" && !/^\d{12}$/.test(v.replace(/\s/g, ""))) return false;
  if (field === "mobileNumber" && !/^[6-9]\d{9}$/.test(v.replace(/\s/g, ""))) return false;

  return true;
}
