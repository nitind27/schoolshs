import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  getOrCreateTimetableConfig,
  saveTimetableConfig,
} from "@/lib/timetable-server";
import { rebuildDayPeriods, type DayScheduleConfig } from "@/lib/timetable";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const academicYear = request.nextUrl.searchParams.get("academicYear") || "2025-26";
    const days = await getOrCreateTimetableConfig(session.schoolId, academicYear);
    return NextResponse.json({ academicYear, days });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable config GET:", error);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const academicYear = String(body.academicYear || "2025-26").trim();
    const days = (body.days as DayScheduleConfig[]) || [];

    if (!Array.isArray(days) || !days.length) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }

    const rebuilt = days.map((d) => {
      const periodCount = Number(d.periods?.length) || 8;
      const withCount = {
        ...d,
        periods: Array.from({ length: periodCount }, (_, i) => ({
          index: i + 1,
          start: d.periods?.[i]?.start || d.start,
          end: d.periods?.[i]?.end || d.end,
          durationMin: 0,
        })),
      };
      return rebuildDayPeriods(withCount);
    });

    const saved = await saveTimetableConfig(session.schoolId, academicYear, rebuilt);
    return NextResponse.json({ ok: true, days: saved });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("timetable config PUT:", error);
    return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
  }
}
