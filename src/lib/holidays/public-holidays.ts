/**
 * Public / Gujarat holiday catalog used by footer calendar + staff holiday suggestions.
 *
 * Edit CUSTOM_HOLIDAYS below to add school-specific or extra dates (apne hisab se).
 * Fixed national/state days use MM-DD; variable festivals use year overrides when known.
 */

export type HolidayKind = "public" | "school" | "optional";

export type HolidayEntry = {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  nameGu: string;
  type: HolidayKind;
};

/** Recurring fixed-date holidays (MM-DD). Applied every calendar year. */
export const FIXED_PUBLIC_HOLIDAYS: Array<{
  md: string;
  name: string;
  nameGu: string;
  type: HolidayKind;
}> = [
  { md: "01-14", name: "Makar Sankranti / Uttarayan", nameGu: "ઉત્તરાયણ", type: "public" },
  { md: "01-26", name: "Republic Day", nameGu: "પ્રજાસત્તાક દિન", type: "public" },
  { md: "04-14", name: "Dr. Ambedkar Jayanti", nameGu: "ડૉ. આંબેડકર જ્યંતી", type: "public" },
  { md: "05-01", name: "Gujarat Day / Labour Day", nameGu: "ગુજરાત સ્થાપના / મજૂર દિન", type: "public" },
  { md: "08-15", name: "Independence Day", nameGu: "સ્વતંત્રતા દિવસ", type: "public" },
  { md: "10-02", name: "Gandhi Jayanti", nameGu: "ગાંધી જ્યંતી", type: "public" },
  { md: "12-25", name: "Christmas", nameGu: "નાતાલ", type: "public" },
];

/**
 * Variable festivals by year (lunar calendar approximations).
 * Add/update years here as government notifications publish.
 */
export const VARIABLE_HOLIDAYS_BY_YEAR: Record<
  number,
  Array<{ md: string; name: string; nameGu: string; type: HolidayKind }>
> = {
  2025: [
    { md: "02-26", name: "Maha Shivratri", nameGu: "મહા શિવરાત્રી", type: "public" },
    { md: "03-14", name: "Holi", nameGu: "હોળી", type: "public" },
    { md: "03-15", name: "Dhuleti", nameGu: "ધૂળેટી", type: "public" },
    { md: "03-30", name: "Ram Navami", nameGu: "રામ નવમી", type: "public" },
    { md: "04-18", name: "Good Friday", nameGu: "ગુડ ફ્રાઇડે", type: "optional" },
    { md: "05-12", name: "Buddha Purnima", nameGu: "બુદ્ધ પૂર્ણિમા", type: "public" },
    { md: "06-07", name: "Eid ul-Fitr", nameGu: "ઈદ ઉલ ફિત્ર", type: "public" },
    { md: "07-10", name: "Muharram", nameGu: "મહોરમ", type: "optional" },
    { md: "08-09", name: "Janmashtami", nameGu: "જન્માષ્ટમી", type: "public" },
    { md: "08-27", name: "Ganesh Chaturthi", nameGu: "ગણેશ ચતુર્થી", type: "public" },
    { md: "09-05", name: "Eid Milad-un-Nabi", nameGu: "ઈદ-એ-મિલાદ", type: "optional" },
    { md: "09-29", name: "Navratri (Start)", nameGu: "નવરાત્રિ", type: "school" },
    { md: "10-08", name: "Dussehra", nameGu: "દશેરા", type: "public" },
    { md: "10-20", name: "Diwali", nameGu: "દિવાળી", type: "public" },
    { md: "10-21", name: "Diwali (Govardhan)", nameGu: "ગોવર્ધન પૂજા", type: "public" },
    { md: "10-22", name: "Bhai Beej", nameGu: "ભાઈ બીજ", type: "public" },
    { md: "10-23", name: "New Year (Vikram Samvat)", nameGu: "નૂતન વર્ષ", type: "public" },
    { md: "11-01", name: "Diwali Vacation Ends", nameGu: "દિવાળી રજા સમાપ્ત", type: "school" },
    { md: "11-05", name: "Guru Nanak Jayanti", nameGu: "ગુરુ નાનક જયંતી", type: "optional" },
  ],
  2026: [
    { md: "02-15", name: "Maha Shivratri", nameGu: "મહા શિવરાત્રી", type: "public" },
    { md: "03-03", name: "Holi", nameGu: "હોળી", type: "public" },
    { md: "03-04", name: "Dhuleti", nameGu: "ધૂળેટી", type: "public" },
    { md: "03-19", name: "Ram Navami", nameGu: "રામ નવમી", type: "public" },
    { md: "03-21", name: "Eid ul-Fitr", nameGu: "ઈદ ઉલ ફિત્ર", type: "public" },
    { md: "04-03", name: "Good Friday", nameGu: "ગુડ ફ્રાઇડે", type: "optional" },
    { md: "05-31", name: "Buddha Purnima", nameGu: "બુદ્ધ પૂર્ણિમા", type: "public" },
    { md: "06-27", name: "Muharram", nameGu: "મહોરમ", type: "optional" },
    { md: "08-26", name: "Janmashtami", nameGu: "જન્માષ્ટમી", type: "public" },
    { md: "08-27", name: "Janmashtami (2nd day)", nameGu: "જન્માષ્ટમી (બીજો દિવસ)", type: "public" },
    { md: "08-28", name: "Local Public Holiday", nameGu: "સ્થાનિક જાહેર રજા", type: "public" },
    { md: "09-04", name: "Eid Milad-un-Nabi", nameGu: "ઈદ-એ-મિલાદ", type: "optional" },
    { md: "09-14", name: "Ganesh Chaturthi", nameGu: "ગણેશ ચતુર્થી", type: "public" },
    { md: "10-11", name: "Navratri (Start)", nameGu: "નવરાત્રિ", type: "school" },
    { md: "10-20", name: "Dussehra", nameGu: "દશેરા", type: "public" },
    { md: "11-08", name: "Diwali", nameGu: "દિવાળી", type: "public" },
    { md: "11-09", name: "Diwali (Govardhan)", nameGu: "ગોવર્ધન પૂજા", type: "public" },
    { md: "11-10", name: "Bhai Beej", nameGu: "ભાઈ બીજ", type: "public" },
    { md: "11-11", name: "New Year (Vikram Samvat)", nameGu: "નૂતન વર્ષ", type: "public" },
    { md: "11-20", name: "Diwali Vacation Ends", nameGu: "દિવાળી રજા સમાપ્ત", type: "school" },
    { md: "11-24", name: "Guru Nanak Jayanti", nameGu: "ગુરુ નાનક જયંતી", type: "optional" },
  ],
};

/**
 * Apne hisab se — extra holidays (full YYYY-MM-DD or MM-DD).
 * Example:
 *   { date: "2026-08-26", name: "School Foundation Day", nameGu: "સ્થાપના દિન", type: "school" }
 *   { date: "08-05", name: "Local Fair", nameGu: "મેળો", type: "school" }  // every year
 */
export const CUSTOM_HOLIDAYS: Array<{
  date: string;
  name: string;
  nameGu: string;
  type: HolidayKind;
}> = [
  // Add your own dates here
];

function toIso(year: number, md: string): string {
  return `${year}-${md}`;
}

function normalizeCustom(year: number, entry: (typeof CUSTOM_HOLIDAYS)[number]): HolidayEntry {
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    return { ...entry, date: entry.date };
  }
  if (/^\d{2}-\d{2}$/.test(entry.date)) {
    return { ...entry, date: toIso(year, entry.date) };
  }
  return { ...entry, date: entry.date };
}

/** All holidays for a calendar year (public + optional + school suggestions + custom). */
export function getPublicHolidays(year: number): HolidayEntry[] {
  const map = new Map<string, HolidayEntry>();

  for (const h of FIXED_PUBLIC_HOLIDAYS) {
    map.set(toIso(year, h.md), {
      date: toIso(year, h.md),
      name: h.name,
      nameGu: h.nameGu,
      type: h.type,
    });
  }

  const variable = VARIABLE_HOLIDAYS_BY_YEAR[year] ?? VARIABLE_HOLIDAYS_BY_YEAR[year - 1] ?? [];
  for (const h of variable) {
    const date = toIso(year, h.md);
    // Prefer fixed national days if same date; otherwise variable / later custom wins
    if (!map.has(date) || map.get(date)!.type !== "public" || h.type === "public") {
      map.set(date, { date, name: h.name, nameGu: h.nameGu, type: h.type });
    }
  }

  for (const c of CUSTOM_HOLIDAYS) {
    const entry = normalizeCustom(year, c);
    if (!entry.date.startsWith(`${year}-`)) continue;
    map.set(entry.date, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Holidays that should paint green on the footer calendar (public + school closures). */
export function getCalendarMarkedHolidays(year: number): HolidayEntry[] {
  return getPublicHolidays(year).filter((h) => h.type === "public" || h.type === "school");
}

export function isoToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildMonthGrid(year: number, monthIndex: number): (number | null)[] {
  const startDow = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isoOf(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
