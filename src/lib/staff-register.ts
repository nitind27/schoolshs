/** Shared helpers for the staff service register (page + Excel export) */

export const RETIREMENT_AGE = 58;
export const HIGHER_GRADE_YEARS = [9, 20, 31] as const;

/** Parse DD-MM-YYYY (or D-M-YYYY / DD/MM/YYYY) into a Date, else null */
export function parseDMY(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDMY(d: Date | null): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function addYears(d: Date | null, years: number): Date | null {
  if (!d) return null;
  const out = new Date(d);
  out.setFullYear(out.getFullYear() + years);
  return out;
}

export function registerDates(dateOfBirth?: string | null, dateOfJoining?: string | null) {
  const dob = parseDMY(dateOfBirth);
  const joining = parseDMY(dateOfJoining);
  return {
    retireDate: formatDMY(addYears(dob, RETIREMENT_AGE)),
    higherGrades: HIGHER_GRADE_YEARS.map((y) => formatDMY(addYears(joining, y))) as string[],
  };
}
