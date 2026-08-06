import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { loadSchoolHolidays } from "@/lib/holidays/load-school-holidays";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

/**
 * Teacher-accessible holiday calendar (read-only).
 * Mounted under /api/teacher/* so middleware always allows teacher role.
 */
export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth([
      "teacher",
      "school_admin",
      "clerk",
      "student",
    ]);
    const { searchParams } = new URL(request.url);
    const payload = await loadSchoolHolidays({
      schoolId: session.schoolId,
      year: searchParams.get("year") || String(new Date().getFullYear()),
      month: searchParams.get("month") || "",
      type: searchParams.get("type") || "",
    });
    return mobileJson(payload, undefined, origin);
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error("[teacher/holidays]", e);
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}
