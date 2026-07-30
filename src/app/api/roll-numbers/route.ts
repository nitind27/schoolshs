import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";
import { assertStudentsInSchool } from "@/lib/school-assertions";

const ROLES = ["school_admin", "teacher", "clerk"] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const classId = request.nextUrl.searchParams.get("classId");
    const teacherWhere =
      session.role === "teacher"
        ? {
            classTeacherId: session.staffId || "__unlinked__",
          }
        : {};

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, ...teacherWhere },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
        _count: { select: { students: true } },
      },
    });

    if (!classId) return NextResponse.json({ classes, students: [] });

    await assertTeacherAttendanceAccess(session, classId);
    if (!classes.some((item) => item.id === classId)) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        classId,
        status: { not: "archived" },
      },
      orderBy: [
        { rollNumber: "asc" },
        { surname: "asc" },
        { firstName: "asc" },
      ],
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        grNumber: true,
        rollNumber: true,
        gender: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
      },
    });

    return NextResponse.json({ classes, students });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("GET /api/roll-numbers:", error);
    return NextResponse.json(
      { error: "Failed to load roll numbers" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const body = await request.json();
    const classId = String(body.classId || "");
    const updates = (Array.isArray(body.updates) ? body.updates : []) as Array<{
      studentId?: string;
      rollNumber?: string | null;
    }>;

    if (!classId || !updates.length) {
      return NextResponse.json(
        { error: "classId and updates required" },
        { status: 400 },
      );
    }

    await assertTeacherAttendanceAccess(session, classId);
    const studentIds = updates
      .map((item) => String(item.studentId || "").trim())
      .filter(Boolean);
    await assertStudentsInSchool(session.schoolId, studentIds);

    const current = await prisma.student.findMany({
      where: { schoolId: session.schoolId, classId },
      select: { id: true, rollNumber: true },
    });
    const updateMap = new Map(
      updates.map((item) => [
        String(item.studentId || ""),
        String(item.rollNumber ?? "").trim() || null,
      ]),
    );
    if (
      studentIds.some((id) => !current.some((student) => student.id === id))
    ) {
      return NextResponse.json(
        { error: "Some students are not in the selected class" },
        { status: 400 },
      );
    }

    const finalRolls = current
      .map((student) =>
        updateMap.has(student.id)
          ? updateMap.get(student.id)
          : student.rollNumber,
      )
      .map((roll) =>
        String(roll || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    if (new Set(finalRolls).size !== finalRolls.length) {
      return NextResponse.json(
        { error: "Roll numbers must be unique within the class" },
        { status: 400 },
      );
    }

    let updated = 0;
    for (const [studentId, rollNumber] of updateMap) {
      const result = await prisma.student.updateMany({
        where: { id: studentId, schoolId: session.schoolId, classId },
        data: { rollNumber },
      });
      updated += result.count;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("PATCH /api/roll-numbers:", error);
    return NextResponse.json(
      { error: "Failed to save roll numbers" },
      { status: 500 },
    );
  }
}
