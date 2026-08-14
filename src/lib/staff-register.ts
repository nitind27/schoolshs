/** Shared helpers for the staff service register (page + Excel export + add-staff form) */

export const RETIREMENT_AGE = 58;
export const RETIREMENT_AGE_PEON_CLERK = 60;
export const FIRST_HIGHER_GRADE_YEARS = [5, 9] as const;
export const SECOND_HIGHER_GRADE_YEARS = [20, 31] as const;
/** @deprecated Use FIRST_HIGHER_GRADE_YEARS / SECOND_HIGHER_GRADE_YEARS */
export const HIGHER_GRADE_YEARS = [9, 20, 31] as const;

export type StaffServiceFields = {
  dateOfBirth?: string | null;
  dateOfJoining?: string | null;
  designation?: string | null;
  retirementDate?: string | null;
  higherGradeFirst?: string | null;
  higherGradeFirstYears?: number | null;
  higherGradeSecond?: string | null;
  higherGradeSecondYears?: number | null;
};

/** Parse DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD into a Date, else null */
export function parseDMY(value?: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(v);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
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

export function isPeonOrClerk(designation?: string | null): boolean {
  const d = String(designation || "").trim().toLowerCase();
  return d.includes("peon") || d.includes("clerk") || d.includes("puen");
}

export function retirementAgeForDesignation(designation?: string | null): number {
  return isPeonOrClerk(designation) ? RETIREMENT_AGE_PEON_CLERK : RETIREMENT_AGE;
}

export function computeRetirementDate(
  dateOfBirth?: string | null,
  designation?: string | null,
): string {
  const dob = parseDMY(dateOfBirth);
  return formatDMY(addYears(dob, retirementAgeForDesignation(designation)));
}

export function higherGradeDate(dateOfJoining?: string | null, years?: number | null): string {
  if (!years) return "";
  return formatDMY(addYears(parseDMY(dateOfJoining), years));
}

export function selectedHigherGradeYears(
  storedYears: unknown,
  dateOfJoining?: string | null,
  storedDate?: string | null,
  candidates: readonly number[] = [],
): string {
  if (storedYears != null && storedYears !== "") return String(storedYears);
  const match = candidates.find((y) => higherGradeDate(dateOfJoining, y) === storedDate);
  return match != null ? String(match) : "";
}

export function higherGradeOptions(
  dateOfJoining: string | null | undefined,
  years: readonly number[],
): { value: string; years: number; date: string; label: string }[] {
  const joining = parseDMY(dateOfJoining);
  if (!joining) return [];
  return years.map((y) => {
    const date = formatDMY(addYears(joining, y));
    return { value: String(y), years: y, date, label: `${y} years — ${date}` };
  });
}

export function registerDates(
  dateOfBirth?: string | null,
  dateOfJoining?: string | null,
  designation?: string | null,
) {
  const dob = parseDMY(dateOfBirth);
  const joining = parseDMY(dateOfJoining);
  return {
    retireDate: formatDMY(addYears(dob, retirementAgeForDesignation(designation))),
    higherGrades: [
      formatDMY(addYears(joining, FIRST_HIGHER_GRADE_YEARS[0])),
      formatDMY(addYears(joining, FIRST_HIGHER_GRADE_YEARS[1])),
      formatDMY(addYears(joining, SECOND_HIGHER_GRADE_YEARS[0])),
      formatDMY(addYears(joining, SECOND_HIGHER_GRADE_YEARS[1])),
    ] as string[],
  };
}

/** Prefer saved service dates; fall back to auto-calculated values */
export function staffServiceDates(staff: StaffServiceFields) {
  const computed = registerDates(staff.dateOfBirth, staff.dateOfJoining, staff.designation);
  const firstYears = staff.higherGradeFirstYears ?? FIRST_HIGHER_GRADE_YEARS[1];
  const secondYears = staff.higherGradeSecondYears ?? SECOND_HIGHER_GRADE_YEARS[0];
  return {
    retireDate: staff.retirementDate || computed.retireDate,
    higherGradeFirst:
      staff.higherGradeFirst || higherGradeDate(staff.dateOfJoining, staff.higherGradeFirstYears) || computed.higherGrades[1],
    higherGradeSecond:
      staff.higherGradeSecond ||
      higherGradeDate(staff.dateOfJoining, staff.higherGradeSecondYears) ||
      computed.higherGrades[2],
    higherGradeFirstYears: staff.higherGradeFirstYears ?? null,
    higherGradeSecondYears: staff.higherGradeSecondYears ?? null,
    firstYears,
    secondYears,
  };
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function optionalText(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

export function staffServiceFields(body: Record<string, unknown>, designation: string) {
  const dateOfJoining = optionalText(body.dateOfJoining);
  const dateOfBirth = optionalText(body.dateOfBirth);
  const higherGradeFirstYears = optionalInt(body.higherGradeFirstYears);
  const higherGradeSecondYears = optionalInt(body.higherGradeSecondYears);
  const retirementDate =
    optionalText(body.retirementDate) || computeRetirementDate(dateOfBirth, designation) || null;

  return {
    dateOfJoining,
    dateOfBirth,
    retirementDate,
    higherGradeFirstYears,
    higherGradeSecondYears,
    higherGradeFirst:
      optionalText(body.higherGradeFirst) || higherGradeDate(dateOfJoining, higherGradeFirstYears) || null,
    higherGradeSecond:
      optionalText(body.higherGradeSecond) || higherGradeDate(dateOfJoining, higherGradeSecondYears) || null,
  };
}
