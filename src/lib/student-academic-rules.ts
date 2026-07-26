import { PRE_MATRIC_SCHEMES, POST_MATRIC_SCHEMES } from "@/lib/dg-portal";
import { COURSE_TYPES } from "@/lib/constants";

export function parseStandardNumber(standard: string | null | undefined): number | null {
  const s = String(standard || "").trim();
  if (!s || /balvatika/i.test(s)) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Scholarship schemes relevant to category (Open = none required) */
export function scholarshipSchemesForCategory(category: string | null | undefined): string[] {
  const cat = String(category || "").trim().toUpperCase();
  if (!cat || cat === "OPEN") return [];

  if (cat === "SC") {
    return [
      ...PRE_MATRIC_SCHEMES.filter((s) => s.includes("SC")),
      ...POST_MATRIC_SCHEMES.filter((s) => s.includes("SC")),
    ];
  }
  if (cat === "ST") {
    return [
      ...PRE_MATRIC_SCHEMES.filter((s) => s.includes("ST")),
      ...POST_MATRIC_SCHEMES.filter((s) => s.includes("ST")),
    ];
  }
  if (cat === "OBC" || cat === "SEBC") {
    return POST_MATRIC_SCHEMES.filter((s) => s.includes("OBC") || s.includes("SEBC"));
  }
  if (cat === "EWS") {
    return ["MYSY Scholarship", "Food Bill Assistance", "Instrument Assistance"];
  }
  if (cat === "MINORITY") {
    return ["MYSY Scholarship", "Food Bill Assistance", "Post Matric Scholarship - OBC"];
  }
  if (cat === "NTDNT") {
    return [
      ...POST_MATRIC_SCHEMES.filter((s) => s.includes("ST") || s.includes("SC")),
      "Food Bill Assistance",
    ];
  }
  return [...PRE_MATRIC_SCHEMES, ...POST_MATRIC_SCHEMES];
}

export function isScholarshipRequired(category: string | null | undefined): boolean {
  const cat = String(category || "").trim().toUpperCase();
  return Boolean(cat) && cat !== "OPEN";
}

/** Course types for school standards */
export function courseTypesForStandard(standard: string | null | undefined): string[] {
  const n = parseStandardNumber(standard);
  if (n === null) return [...COURSE_TYPES];
  if (n === 0) return ["Other"];
  if (n <= 10) return ["Secondary"];
  if (n <= 12) return ["Higher Secondary", "Arts", "Commerce", "Science"];
  return [...COURSE_TYPES];
}

export function defaultCourseTypeForStandard(standard: string | null | undefined): string {
  const n = parseStandardNumber(standard);
  if (n === null) return "";
  if (n === 0) return "Other";
  if (n <= 10) return "Secondary";
  return "Higher Secondary";
}

/**
 * Previous board exams:
 * - Class ≤ 9: no board fields
 * - Class 10: no completed 10th board (student is in 10th)
 * - Class 11: 10th board required
 * - Class 12: 10th required, 12th optional (appearing)
 * - Above 12: 10th + 12th required
 */
export type PrevEduMode = "none" | "class10_current" | "need10" | "need10_opt12" | "need10_12";

export function previousEducationMode(standard: string | null | undefined): PrevEduMode {
  const n = parseStandardNumber(standard);
  if (n === null) return "none";
  if (n <= 9) return "none";
  if (n === 10) return "class10_current";
  if (n === 11) return "need10";
  if (n === 12) return "need10_opt12";
  return "need10_12";
}

export function requires10thBoard(standard: string | null | undefined): boolean {
  const mode = previousEducationMode(standard);
  return mode === "need10" || mode === "need10_opt12" || mode === "need10_12";
}

export function requires12thBoard(standard: string | null | undefined): boolean {
  return previousEducationMode(standard) === "need10_12";
}

/** Gujarat ration card: typically 8–15 alphanumeric */
export const RATION_CARD_MIN = 8;
export const RATION_CARD_MAX = 15;

export function isValidRationCard(value: string | null | undefined): boolean {
  if (!value?.trim()) return true; // optional
  const cleaned = value.replace(/[\s\-]/g, "").toUpperCase();
  return cleaned.length >= RATION_CARD_MIN && cleaned.length <= RATION_CARD_MAX && /^[A-Z0-9]+$/.test(cleaned);
}

/** Indian bank account: usually 9–18 digits */
export const ACCOUNT_NUMBER_MIN = 9;
export const ACCOUNT_NUMBER_MAX = 18;

export function isValidAccountNumber(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const digits = value.replace(/\s/g, "");
  return /^\d+$/.test(digits) && digits.length >= ACCOUNT_NUMBER_MIN && digits.length <= ACCOUNT_NUMBER_MAX;
}
