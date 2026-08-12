/** School calendar timezone — Gujarat / India (IST, no DST). */
export const SCHOOL_TIMEZONE = "Asia/Kolkata";

export type ZonedYmd = { year: number; month: number; day: number };

/** Calendar Y-M-D in the school timezone (not server local / UTC). */
export function getSchoolYmd(onDate: Date = new Date()): ZonedYmd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(onDate);

  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value || NaN);

  const year = num("year");
  const month = num("month");
  const day = num("day");
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    // Extremely defensive fallback
    return {
      year: onDate.getUTCFullYear(),
      month: onDate.getUTCMonth() + 1,
      day: onDate.getUTCDate(),
    };
  }
  return { year, month, day };
}

/** YYYY-MM-DD key in school timezone */
export function schoolDateKey(onDate: Date = new Date()): string {
  const { year, month, day } = getSchoolYmd(onDate);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Date + time in IST for PDFs, exports, and admin panels */
export function formatSchoolDateTime(onDate: Date = new Date()): string {
  return onDate.toLocaleString("en-IN", {
    timeZone: SCHOOL_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Date only in IST */
export function formatSchoolDate(onDate: Date = new Date()): string {
  return onDate.toLocaleDateString("en-IN", {
    timeZone: SCHOOL_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Start of "today" in Asia/Kolkata as a UTC Date
 * (for DB queries like notification createdAt >= dayStart).
 */
export function schoolDayStartUtc(onDate: Date = new Date()): Date {
  const { year, month, day } = getSchoolYmd(onDate);
  // IST = UTC+5:30 → midnight IST = previous day 18:30 UTC
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}
