import { NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { getTodayBirthdays } from "@/lib/birthdays";

export async function GET() {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "clerk",
      "teacher",
      "ca",
    ]);
    const data = await getTodayBirthdays(session.schoolId);
    return NextResponse.json({
      dateKey: data.dateKey,
      total: data.total,
      studentCount: data.students.length,
      staffCount: data.staff.length,
      students: data.students,
      staff: data.staff,
      all: data.all,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[birthdays/today GET]", e);
    return NextResponse.json({ error: "Failed", total: 0, all: [] }, { status: 500 });
  }
}
