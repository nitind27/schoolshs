import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";
import { assertStudentsInSchool } from "@/lib/school-assertions";

/**
 * Batch-update student roll numbers (class teacher / admin / clerk).
 * Body: { classId?: string, updates: [{ studentId, rollNumber }] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = body.classId ? String(body.classId) : null;
    const updates = (Array.isArray(body.updates) ? body.updates : []) as {
      studentId?: string;
      rollNumber?: string | null;
    }[];

    if (!updates.length) {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }

    await assertTeacherAttendanceAccess(session, classId);

    const studentIds = updates
      .map((u) => String(u.studentId || "").trim())
      .filter(Boolean);

    await assertStudentsInSchool(session.schoolId, studentIds);

    // If classId given, ensure students belong to that class (teachers especially)
    if (classId) {
      const inClass = await prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          id: { in: studentIds },
          classId,
        },
        select: { id: true },
      });
      if (inClass.length !== studentIds.length) {
        return NextResponse.json(
          { error: "Some students are not in the selected class" },
          { status: 400 }
        );
      }
    }

    let updated = 0;
    for (const u of updates) {
      const studentId = String(u.studentId || "").trim();
      if (!studentId) continue;
      const rollNumber = String(u.rollNumber ?? "").trim() || null;
      await prisma.student.update({
        where: { id: studentId },
        data: { rollNumber },
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/attendance/rolls:", error);
    return NextResponse.json({ error: "Failed to update roll numbers" }, { status: 500 });
  }
}
