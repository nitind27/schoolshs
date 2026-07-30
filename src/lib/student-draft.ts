import type { Student } from "@/generated/prisma/client";
import { stableDraftAadhaarFromGr } from "@/lib/gr-student-utils";
import { todayDobDisplay } from "@/lib/student-age";

type StudentDraftInput = Partial<Student>;

export const DRAFT_PLACEHOLDER = "—";

/** Known auto-filled draft values that are NOT real user input */
export const DRAFT_FAKE_DEFAULTS: Partial<Record<keyof Student, string | number>> = {
  mobileNumber: "9000000000",
  accountNumber: "0000000000",
  ifscCode: "SBIN0000000",
  currentPincode: "380001",
  permanentPincode: "380001",
  annualFamilyIncome: 0,
  percentage10th: 0,
  percentage12th: 0,
  courseName: "Class",
  courseType: "School",
  currentYear: "1",
  scholarshipScheme: "Pre-Matric",
  category: "General",
};

/** Old draft DOB that should not be shown as a real birth date */
export const DRAFT_DOB_PLACEHOLDERS = new Set([
  "01/01/2000",
  "01-01-2000",
  "2000-01-01",
  "1/1/2000",
  "1-1-2000",
]);

export function isDraftDobPlaceholder(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const raw = value.trim();
  if (DRAFT_DOB_PLACEHOLDERS.has(raw)) return true;
  const norm = raw.replace(/-/g, "/");
  if (DRAFT_DOB_PLACEHOLDERS.has(norm)) return true;
  return /^0?1\/0?1\/2000$/.test(norm);
}

/** True for empty / em-dash draft placeholders */
export function isDraftPlaceholderValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value !== "string") return false;
  const v = value.trim();
  return !v || v === DRAFT_PLACEHOLDER || v === "-" || v === "–";
}

/**
 * Clear DB draft placeholders / fake defaults so the UI form shows empty fields
 * and progress % reflects real user input only.
 * @param mode "placeholders" = only "—" ; "all" = also known draft fake defaults (new student)
 */
export function stripDraftPlaceholdersForForm<T extends Record<string, unknown>>(
  data: T,
  mode: "placeholders" | "all" = "all",
): T {
  const out = { ...data } as Record<string, unknown>;

  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "string" && isDraftPlaceholderValue(value)) {
      out[key] = "";
      continue;
    }
    if (mode === "all") {
      const fake = DRAFT_FAKE_DEFAULTS[key as keyof Student];
      if (fake !== undefined && value === fake) {
        out[key] = typeof fake === "number" ? null : "";
      }
    }
  }

  if (mode === "all") {
    // Extra draft defaults that are common real values — only clear on new-student mode
    const extra: Record<string, string> = {
      gender: "Male",
      religion: "Hindu",
      currentDistrict: "Ahmedabad",
      permanentDistrict: "Ahmedabad",
      institutionDistrict: "Ahmedabad",
      board10th: "GSEB",
      year10th: "2025",
    };
    for (const [key, fake] of Object.entries(extra)) {
      if (String(out[key] || "").trim() === fake) out[key] = "";
    }

    const aadhaar = String(out.aadhaarNumber || "").replace(/\s/g, "");
    // Random draft aadhaar (9…)
    if (/^9\d{11}$/.test(aadhaar)) {
      out.aadhaarNumber = "";
    } else {
      // GR-linked draft aadhaar (8 + padded GR) — only clear exact match
      const gr = String(out.grNumber || "").trim();
      if (gr && aadhaar === stableDraftAadhaarFromGr(gr)) {
        out.aadhaarNumber = "";
      }
    }
  }

  return out as T;
}

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
  // Use today's date — never seed a fake historic DOB like 01/01/2000
  if (isEmpty(out.dateOfBirth) || isDraftDobPlaceholder(String(out.dateOfBirth))) {
    out.dateOfBirth = todayDobDisplay();
  }
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
  // Never seed a vague placeholder like "Pre-Matric" — that blocked Auto-Apply
  // and looked like a real scheme. Empty keeps drafts from becoming "ready".
  setStr("scholarshipScheme", "");
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
    "grNumber",
    "classId",
    "standard",
    "section",
  ]);

  for (const [key, value] of Object.entries(data)) {
    if (skip.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") continue;
    if (isDraftPlaceholderValue(value)) continue;
    const fake = DRAFT_FAKE_DEFAULTS[key as keyof Student];
    if (fake !== undefined && value === fake) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (typeof value === "number" && (key === "familySize" || key === "annualFamilyIncome")) continue;
    if (key === "aadhaarNumber" && /^9\d{11}$/.test(String(value).replace(/\s/g, ""))) continue;
    return true;
  }
  return false;
}
