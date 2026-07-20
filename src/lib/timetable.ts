/** Dynamic school timetable — admin-configurable per day */

export const DAY_META = [
  { index: 1, key: "monday", short: "Mon", labelEn: "Monday", labelGu: "સોમવાર" },
  { index: 2, key: "tuesday", short: "Tue", labelEn: "Tuesday", labelGu: "મંગળવાર" },
  { index: 3, key: "wednesday", short: "Wed", labelEn: "Wednesday", labelGu: "બુધવાર" },
  { index: 4, key: "thursday", short: "Thu", labelEn: "Thursday", labelGu: "ગુરુવાર" },
  { index: 5, key: "friday", short: "Fri", labelEn: "Friday", labelGu: "શુક્રવાર" },
  { index: 6, key: "saturday", short: "Sat", labelEn: "Saturday", labelGu: "શનિવાર" },
] as const;

export type TimetableBreak = {
  afterPeriod: number;
  start: string;
  end: string;
  label: string;
};

export type TimetablePeriod = {
  index: number;
  start: string;
  end: string;
  durationMin: number;
};

export type DayScheduleConfig = {
  dayOfWeek: number;
  key: string;
  short: string;
  labelEn: string;
  labelGu: string;
  enabled: boolean;
  start: string;
  end: string;
  periods: TimetablePeriod[];
  breaks: TimetableBreak[];
};

export const SCHOOL_SUBJECTS = [
  "Gujarati",
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Sanskrit",
  "Computer",
  "Physical Education",
  "Art & Craft",
  "Music",
  "Moral Science",
  "General Knowledge",
  "Library",
  "Assembly",
  "Free Period",
] as const;

const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Gujarati: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  English: { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", dot: "bg-violet-500" },
  Hindi: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" },
  Mathematics: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  Science: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
  "Social Science": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  Sanskrit: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500" },
  Computer: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
  "Physical Education": { bg: "bg-lime-50", text: "text-lime-800", border: "border-lime-200", dot: "bg-lime-500" },
  "Art & Craft": { bg: "bg-pink-50", text: "text-pink-800", border: "border-pink-200", dot: "bg-pink-500" },
  Music: { bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-200", dot: "bg-fuchsia-500" },
  "Moral Science": { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", dot: "bg-teal-500" },
  "General Knowledge": { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200", dot: "bg-sky-500" },
  Library: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
  Assembly: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", dot: "bg-yellow-500" },
  "Free Period": { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-400" },
};

const FALLBACK_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", dot: "bg-violet-500" },
  { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
];

export function subjectColors(subject: string) {
  if (SUBJECT_COLOR_MAP[subject]) return SUBJECT_COLOR_MAP[subject];
  const hash = subject.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function formatTime12h(time24: string): string {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function cellKey(dayOfWeek: number, periodIndex: number): string {
  return `${dayOfWeek}-${periodIndex}`;
}

export type TimetableCell = {
  dayOfWeek: number;
  periodIndex: number;
  subject: string;
  teacherId?: string | null;
  teacherName?: string | null;
  room?: string | null;
  classId?: string | null;
  className?: string | null;
};

export function entriesToMap(entries: TimetableCell[]): Map<string, TimetableCell> {
  const map = new Map<string, TimetableCell>();
  for (const e of entries) {
    if (e.subject?.trim()) {
      map.set(cellKey(e.dayOfWeek, e.periodIndex), e);
    }
  }
  return map;
}

/** Group cells by day+period (teacher view can have multiple classes in one slot). */
export function entriesToGroupedMap(entries: TimetableCell[]): Map<string, TimetableCell[]> {
  const map = new Map<string, TimetableCell[]>();
  for (const e of entries) {
    if (!e.subject?.trim()) continue;
    const key = cellKey(e.dayOfWeek, e.periodIndex);
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  }
  return map;
}

/** Representative start–end for a period row (first enabled day that has that period). */
export function periodRowTimeLabel(
  schedule: DayScheduleConfig[],
  periodIndex: number
): string | null {
  for (const day of schedule) {
    if (!day.enabled) continue;
    const p = day.periods.find((x) => x.index === periodIndex);
    if (p) return `${formatTime12h(p.start)} – ${formatTime12h(p.end)}`;
  }
  return null;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Auto-split school hours into periods with optional breaks */
export function generatePeriods(
  start: string,
  end: string,
  periodCount: number,
  breaks: Omit<TimetableBreak, "label">[] = [],
): { periods: TimetablePeriod[]; breaks: TimetableBreak[] } {
  const breakMins = breaks.reduce(
    (sum, b) => sum + (timeToMinutes(b.end) - timeToMinutes(b.start)),
    0,
  );
  const total = timeToMinutes(end) - timeToMinutes(start) - breakMins;
  const slot = Math.floor(total / periodCount);

  const periods: TimetablePeriod[] = [];
  let cursor = timeToMinutes(start);

  for (let i = 1; i <= periodCount; i++) {
    const br = breaks.find((b) => b.afterPeriod === i - 1);
    if (br && i > 1) {
      cursor = timeToMinutes(br.end);
    }
    const pStart = cursor;
    const pEnd = pStart + slot;
    periods.push({
      index: i,
      start: minutesToTime(pStart),
      end: minutesToTime(pEnd),
      durationMin: slot,
    });
    cursor = pEnd;
  }

  const fullBreaks: TimetableBreak[] = breaks.map((b) => ({
    ...b,
    label: "Lunch Break",
  }));

  return { periods, breaks: fullBreaks };
}

function dayFromMeta(
  meta: (typeof DAY_META)[number],
  enabled: boolean,
  start: string,
  end: string,
  periodCount: number,
  breaks: Omit<TimetableBreak, "label">[] = [],
): DayScheduleConfig {
  const { periods, breaks: fullBreaks } = enabled
    ? generatePeriods(start, end, periodCount, breaks)
    : { periods: [], breaks: [] };

  return {
    dayOfWeek: meta.index,
    key: meta.key,
    short: meta.short,
    labelEn: meta.labelEn,
    labelGu: meta.labelGu,
    enabled,
    start,
    end,
    periods,
    breaks: fullBreaks,
  };
}

/** Default: Mon–Fri 10–5 (8 periods, lunch 12–12:45), Sat 7–11 (4 periods) */
export function defaultSchoolSchedule(): DayScheduleConfig[] {
  const weekdayBreak = [{ afterPeriod: 3, start: "12:00", end: "12:45" }];

  return DAY_META.map((meta) => {
    if (meta.index <= 5) {
      return dayFromMeta(meta, true, "10:00", "17:00", 8, weekdayBreak);
    }
    if (meta.index === 6) {
      return dayFromMeta(meta, true, "07:00", "11:00", 4, []);
    }
    return dayFromMeta(meta, false, "10:00", "17:00", 8, []);
  });
}

export function parseDaySchedules(json: string | unknown): DayScheduleConfig[] {
  if (!json) return defaultSchoolSchedule();
  try {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (!Array.isArray(parsed) || !parsed.length) return defaultSchoolSchedule();
    return parsed as DayScheduleConfig[];
  } catch {
    return defaultSchoolSchedule();
  }
}

export function serializeDaySchedules(days: DayScheduleConfig[]): string {
  return JSON.stringify(days);
}

export function enabledDays(schedule: DayScheduleConfig[]): DayScheduleConfig[] {
  return schedule.filter((d) => d.enabled);
}

export function maxPeriodCount(schedule: DayScheduleConfig[]): number {
  return Math.max(0, ...schedule.map((d) => d.periods.length));
}

export function periodForDay(
  schedule: DayScheduleConfig[],
  dayOfWeek: number,
  periodIndex: number,
): TimetablePeriod | null {
  const day = schedule.find((d) => d.dayOfWeek === dayOfWeek);
  return day?.periods.find((p) => p.index === periodIndex) ?? null;
}

export function breakAfterPeriod(
  schedule: DayScheduleConfig[],
  dayOfWeek: number,
  periodIndex: number,
): TimetableBreak | null {
  const day = schedule.find((d) => d.dayOfWeek === dayOfWeek);
  return day?.breaks.find((b) => b.afterPeriod === periodIndex) ?? null;
}

export function hasAnyBreakAfter(schedule: DayScheduleConfig[], periodIndex: number): boolean {
  return schedule.some((d) => d.enabled && d.breaks.some((b) => b.afterPeriod === periodIndex));
}

export function rebuildDayPeriods(day: DayScheduleConfig): DayScheduleConfig {
  if (!day.enabled) return { ...day, periods: [], breaks: [] };
  const breaks = day.breaks.map(({ afterPeriod, start, end }) => ({ afterPeriod, start, end }));
  const { periods, breaks: fullBreaks } = generatePeriods(
    day.start,
    day.end,
    day.periods.length || 8,
    breaks,
  );
  return { ...day, periods, breaks: fullBreaks };
}

export function totalSlots(schedule: DayScheduleConfig[]): number {
  return schedule.filter((d) => d.enabled).reduce((sum, d) => sum + d.periods.length, 0);
}

/** Legacy exports for compatibility */
export const TIMETABLE_DAYS = DAY_META.filter((d) => d.index <= 5);
export const TIMETABLE_PERIODS = defaultSchoolSchedule()[0].periods;
export const TIMETABLE_LUNCH = { afterPeriod: 3, start: "12:00", end: "12:45", durationMin: 45 };

export function isLunchAfterPeriod(periodIndex: number): boolean {
  return periodIndex === TIMETABLE_LUNCH.afterPeriod;
}
