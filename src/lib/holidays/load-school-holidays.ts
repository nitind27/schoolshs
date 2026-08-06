import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getPublicHolidays } from "@/lib/holidays/public-holidays";

export type HolidayApiRow = {
  id: string;
  date: string;
  name: string;
  nameGu: string | null;
  type: string;
  academicYear: string | null;
  description: string | null;
};

function padMonth(month: string | number): string {
  return String(month).padStart(2, "0");
}

/** Load school holidays; if DB empty/unavailable, return public Gujarat catalog. */
export async function loadSchoolHolidays(opts: {
  schoolId: string;
  year: string;
  month?: string;
  type?: string;
}): Promise<{ year: number; month: number | null; holidays: HolidayApiRow[] }> {
  const yearNum = Number(opts.year) || new Date().getFullYear();
  const month = opts.month?.trim() || "";
  const type = opts.type?.trim() || "";

  const where: Prisma.HolidayWhereInput = {
    schoolId: opts.schoolId,
    date: month
      ? { startsWith: `${yearNum}-${padMonth(month)}-` }
      : { startsWith: `${yearNum}-` },
  };
  if (type) where.type = type;

  let holidays: HolidayApiRow[] = [];
  try {
    const rows = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });
    holidays = rows.map((h) => ({
      id: h.id,
      date: h.date,
      name: h.name,
      nameGu: h.nameGu,
      type: h.type,
      academicYear: h.academicYear,
      description: h.description,
    }));
  } catch (e) {
    console.error("[holidays] prisma findMany failed — using public catalog", e);
  }

  if (holidays.length === 0) {
    let catalog = getPublicHolidays(yearNum);
    if (month) {
      const prefix = `${yearNum}-${padMonth(month)}-`;
      catalog = catalog.filter((h) => h.date.startsWith(prefix));
    }
    if (type) catalog = catalog.filter((h) => h.type === type);
    holidays = catalog.map((h) => ({
      id: `public_${h.date}`,
      date: h.date,
      name: h.name,
      nameGu: h.nameGu,
      type: h.type,
      academicYear: null,
      description: null,
    }));
  }

  return {
    year: yearNum,
    month: month ? Number(month) : null,
    holidays,
  };
}
