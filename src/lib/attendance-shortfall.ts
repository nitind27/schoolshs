import { countMarkedDays, countMonthPresent, parseDaysJson } from "@/lib/attendance";

/** School year runs June–May. Only months up to the selected month are included. */
export function schoolYearMonthsUntil(month: number, year: number): { month: number; year: number }[] {
  const startYear = month >= 6 ? year : year - 1;
  const all: { month: number; year: number }[] = [];
  for (let m = 6; m <= 12; m++) all.push({ month: m, year: startYear });
  for (let m = 1; m <= 5; m++) all.push({ month: m, year: startYear + 1 });
  return all.filter((item) => item.year < year || (item.year === year && item.month <= month));
}

export function tallyAttendance(daysJsonList: string[]): { present: number; marked: number } {
  let present = 0;
  let marked = 0;
  for (const json of daysJsonList) {
    const days = parseDaysJson(json);
    present += countMonthPresent(days);
    marked += countMarkedDays(days);
  }
  return { present, marked };
}

export function attendanceRatio(present: number, marked: number): number {
  if (!marked) return 0;
  return Math.round((present / marked) * 100);
}
