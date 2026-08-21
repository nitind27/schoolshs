import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teacher-scope";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

/**
 * Flutter + web: teacher class/subject scope from class-teacher + released timetable.
 * GET /api/teacher/scope?academicYear=2025-26
 */
export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["teacher", "school_admin"]);
    const academicYear = request.nextUrl.searchParams.get("academicYear");
    const scope = await getTeacherScope(session, { academicYear });
    return mobileJson(
      {
        linked: scope.linked,
        staffId: scope.staffId,
        academicYear: scope.academicYear,
        defaultClassId: scope.defaultClassId,
        currentPeriod: scope.currentPeriod,
        classes: scope.classes,
        attendanceClassIds: scope.attendanceClassIds,
        marksClassIds: scope.marksClassIds,
        homeroomClassIds: scope.homeroomClassIds,
      },
      undefined,
      origin,
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error("[teacher/scope]", e);
    return mobileJson({ error: "Failed to load teacher scope" }, { status: 500 }, origin);
  }
}
