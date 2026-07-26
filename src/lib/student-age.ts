/** DOB / age helpers for student admission (DD/MM/YYYY storage) */

export function parseDobToDate(dob: string | null | undefined): Date | null {
  if (!dob?.trim()) return null;
  const raw = dob.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const d = Number(m1[1]);
    const mo = Number(m1[2]);
    const y = Number(m1[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
    return null;
  }

  // YYYY-MM-DD (HTML date input)
  const m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const y = Number(m2[1]);
    const mo = Number(m2[2]);
    const d = Number(m2[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
    return null;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDobDisplay(dob: string | null | undefined): string {
  const dt = parseDobToDate(dob);
  if (!dt) return dob?.trim() || "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDobForInput(dob: string | null | undefined): string {
  const dt = parseDobToDate(dob);
  if (!dt) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/** Today's date as DD/MM/YYYY (form storage format) */
export function todayDobDisplay(onDate = new Date()): string {
  const dd = String(onDate.getDate()).padStart(2, "0");
  const mm = String(onDate.getMonth() + 1).padStart(2, "0");
  const yyyy = onDate.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function calcAgeYears(dob: string | null | undefined, onDate = new Date()): number | null {
  const birth = parseDobToDate(dob);
  if (!birth) return null;
  let age = onDate.getFullYear() - birth.getFullYear();
  const m = onDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < birth.getDate())) age -= 1;
  return age < 0 || age > 120 ? null : age;
}

/**
 * Typical school-entry age in India (approx):
 * Balvatika ~3–6, Class 1 ~5–7, Class N ≈ N+5 (±2).
 */
export function expectedAgeRangeForStandard(standard: string | null | undefined): {
  min: number;
  max: number;
  typical: number;
} | null {
  const s = String(standard || "").trim();
  if (!s) return null;
  if (/balvatika/i.test(s)) return { min: 3, max: 7, typical: 5 };
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  const typical = n + 5;
  return { min: Math.max(3, typical - 2), max: typical + 3, typical };
}

export function ageFitsStandard(
  age: number | null,
  standard: string | null | undefined,
): { ok: boolean; message?: string; range?: { min: number; max: number; typical: number } } {
  if (age == null) return { ok: true };
  const range = expectedAgeRangeForStandard(standard);
  if (!range) return { ok: true };
  if (age < range.min || age > range.max) {
    return {
      ok: false,
      range,
      message: `Typical age for Class ${standard} is about ${range.typical} years (allowed ${range.min}–${range.max}). Current age: ${age}.`,
    };
  }
  return { ok: true, range };
}
