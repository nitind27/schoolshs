import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireStaffAuth } from "@/lib/auth";
import {
  buildMonthDayColumns,
  cleanAttendanceDayNotes,
  monthDateKey,
  daysInMonth,
} from "@/lib/attendance-day-columns";

function monthParts(search: URLSearchParams | { month?: unknown; year?: unknown }) {
  const monthRaw = "get" in search ? search.get("month") : search.month;
  const yearRaw = "get" in search ? search.get("year") : search.year;
  const month = parseInt(String(monthRaw || ""), 10);
  const year = parseInt(String(yearRaw || ""), 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return { month, year };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaffAuth();
    const parts = monthParts(request.nextUrl.searchParams);
    if (!parts) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }
    const monthKey = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const [holidays, settings] = await Promise.all([
      prisma.holiday.findMany({
        where: {
          schoolId: session.schoolId,
          date: { startsWith: monthKey },
          type: { in: ["public", "school"] },
        },
        select: { date: true, name: true, nameGu: true },
      }),
      prisma.schoolSettings.findFirst({
        where: { schoolId: session.schoolId },
        select: { attendanceDayNotesJson: true },
      }),
    ]);
    return NextResponse.json({
      columns: buildMonthDayColumns({
        year: parts.year,
        month: parts.month,
        holidays,
        saved: cleanAttendanceDayNotes(settings?.attendanceDayNotesJson),
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/attendance/day-notes", error);
    return NextResponse.json({ error: "Failed to load day notes" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireStaffAuth();
    const body = await request.json().catch(() => ({}));
    const parts = monthParts({ month: body.month, year: body.year });
    if (!parts) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }
    const incoming = cleanAttendanceDayNotes(body.notes);
    const last = daysInMonth(parts.year, parts.month);
    const allowed = new Set<string>();
    for (let day = 1; day <= last; day++) allowed.add(monthDateKey(parts.year, parts.month, day));

    const settings = await prisma.schoolSettings.findFirst({
      where: { schoolId: session.schoolId },
      select: { id: true, attendanceDayNotesJson: true },
    });
    const saved = cleanAttendanceDayNotes(settings?.attendanceDayNotesJson);
    for (const [date, message] of Object.entries(incoming)) {
      if (!allowed.has(date)) continue;
      saved[date] = message;
    }

    if (settings) {
      await prisma.schoolSettings.update({
        where: { id: settings.id },
        data: { attendanceDayNotesJson: saved },
      });
    } else {
      await prisma.schoolSettings.create({
        data: {
          schoolId: session.schoolId,
          attendanceDayNotesJson: saved,
        },
      });
    }

    const monthKey = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
    const holidays = await prisma.holiday.findMany({
      where: {
        schoolId: session.schoolId,
        date: { startsWith: monthKey },
        type: { in: ["public", "school"] },
      },
      select: { date: true, name: true, nameGu: true },
    });
    return NextResponse.json({
      ok: true,
      columns: buildMonthDayColumns({
        year: parts.year,
        month: parts.month,
        holidays,
        saved,
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/attendance/day-notes", error);
    return NextResponse.json({ error: "Failed to save day notes" }, { status: 500 });
  }
}
