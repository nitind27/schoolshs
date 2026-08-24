import { NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { findDuplicateGrGroups } from "@/lib/duplicate-gr";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const groups = await findDuplicateGrGroups(session.schoolId);
    return NextResponse.json({
      groups,
      groupCount: groups.length,
      studentCount: groups.reduce((n, g) => n + g.count, 0),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/students/duplicate-grs error:", error);
    return NextResponse.json({ error: "Failed to load duplicate GR numbers", groups: [] }, { status: 500 });
  }
}
