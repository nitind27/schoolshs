import type { SsgujaratSearchType } from "./types";

export function normalizeSsgSearchId(value: string): string {
  return value.replace(/\s/g, "").trim();
}

export function detectSsgujaratSearchType(id: string): SsgujaratSearchType | null {
  const clean = normalizeSsgSearchId(id);
  if (/^\d{12}$/.test(clean)) return "aadhaar";
  if (/^\d{18}$/.test(clean)) return "childUid";
  return null;
}

export function describeSsgSearchType(type: SsgujaratSearchType | null): string {
  if (type === "aadhaar") return "12-digit Aadhaar — student list search";
  if (type === "childUid") return "18-digit Child UID — full profile report";
  return "12-digit Aadhaar ya 18-digit Child UID";
}
