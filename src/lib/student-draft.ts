import type { Student } from "@/generated/prisma/client";
import { stableDraftAadhaarFromGr } from "@/lib/gr-student-utils";

type StudentDraftInput = Partial<Student>;

const DRAFT_PLACEHOLDER = "—";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

/** Fill missing required DB fields so partial form data can be saved as draft */
export function applyDraftDefaults(data: StudentDraftInput): StudentDraftInput {
  const out: StudentDraftInput = { ...data };

  const setStr = (key: keyof StudentDraftInput, fallback: string) => {
    if (isEmpty(out[key])) (out as Record<string, unknown>)[key] = fallback;
  };

  setStr("firstName", DRAFT_PLACEHOLDER);
  setStr("surname", DRAFT_PLACEHOLDER);

  const name =
    [out.firstName, out.middleName, out.surname].filter((v) => v && v !== DRAFT_PLACEHOLDER).join(" ").trim() ||
    DRAFT_PLACEHOLDER;

  setStr("aadhaarName", name);
  setStr("dateOfBirth", "01/01/2000");
  setStr("gender", "Male");
  setStr("mobileNumber", "9000000000");
  setStr("motherName", DRAFT_PLACEHOLDER);
  setStr("fatherName", DRAFT_PLACEHOLDER);
  setStr("category", "General");
  setStr("religion", "Hindu");
  setStr("parentOccupation", DRAFT_PLACEHOLDER);
  if (isEmpty(out.annualFamilyIncome)) out.annualFamilyIncome = 0;
  setStr("currentAddress", DRAFT_PLACEHOLDER);
  setStr("currentDistrict", "Ahmedabad");
  setStr("currentCity", DRAFT_PLACEHOLDER);
  setStr("currentPincode", "380001");
  setStr("permanentAddress", String(out.currentAddress || DRAFT_PLACEHOLDER));
  setStr("permanentDistrict", String(out.currentDistrict || "Ahmedabad"));
  setStr("permanentCity", String(out.currentCity || DRAFT_PLACEHOLDER));
  setStr("permanentPincode", String(out.currentPincode || "380001"));
  setStr("scholarshipScheme", "Pre-Matric");
  setStr("financialYear", "2025-26");
  setStr("courseType", "School");
  setStr("courseName", "Class");
  setStr("institutionDistrict", "Ahmedabad");
  setStr("institutionName", DRAFT_PLACEHOLDER);
  setStr("currentYear", "1");
  setStr("board10th", "GSEB");
  if (isEmpty(out.percentage10th)) out.percentage10th = 0;
  setStr("year10th", "2025");
  setStr("bankName", DRAFT_PLACEHOLDER);
  setStr("branchName", DRAFT_PLACEHOLDER);
  setStr("accountNumber", "0000000000");
  setStr("ifscCode", "SBIN0000000");
  setStr("accountHolderName", name);

  const aadhaar = String(out.aadhaarNumber || "").replace(/\s/g, "");
  const gr = String(out.grNumber || "").trim();
  if (/^\d{12}$/.test(aadhaar)) {
    out.aadhaarNumber = aadhaar;
  } else if (gr) {
    out.aadhaarNumber = stableDraftAadhaarFromGr(gr);
  } else if (!/^\d{12}$/.test(aadhaar)) {
    out.aadhaarNumber = generateDraftAadhaar();
  }

  out.status = "draft";
  return out;
}

export function generateDraftAadhaar(): string {
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11);
  return `9${tail.padStart(11, "0")}`.slice(0, 12);
}

/** True when the user has entered anything worth persisting */
export function hasDraftContent(data: StudentDraftInput): boolean {
  const skip = new Set([
    "maritalStatus",
    "habitationType",
    "familySize",
    "residentType",
    "isHosteler",
    "isOrphan",
    "admissionType",
    "financialYear",
    "status",
    "schoolId",
    "id",
    "createdAt",
    "updatedAt",
  ]);

  for (const [key, value] of Object.entries(data)) {
    if (skip.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (typeof value === "boolean") continue;
    if (typeof value === "number" && (key === "familySize" || key === "annualFamilyIncome")) continue;
    return true;
  }
  return false;
}
