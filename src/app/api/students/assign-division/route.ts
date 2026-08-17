import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { standardToCourseName } from "@/lib/constants";
import { defaultCourseTypeForStandard } from "@/lib/student-academic-rules";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
      : [];
    const classId = String(body.classId || "").trim();

    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }
    if (!classId) {
      return NextResponse.json({ error: "Please pick a division" }, { status: 400 });
    }

    const assignedClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!assignedClass) {
      return NextResponse.json({ error: "Selected class not found for this school" }, { status: 400 });
    }

    const owned = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: session.schoolId },
      select: { id: true },
    });
    const ownedIds = owned.map((s) => s.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ error: "No matching students in this school" }, { status: 404 });
    }

    const data: {
      classId: string;
      standard: string;
      section: string;
      courseName: string;
      courseType: string;
      institutionName?: string;
      institutionDistrict?: string;
      financialYear?: string;
    } = {
      classId: assignedClass.id,
      standard: assignedClass.standard,
      section: assignedClass.section,
      courseName: standardToCourseName(assignedClass.standard),
      courseType:
        String(assignedClass.stream || "").trim() ||
        defaultCourseTypeForStandard(assignedClass.standard),
    };
    if (assignedClass.institutionName) data.institutionName = assignedClass.institutionName;
    if (assignedClass.institutionDistrict) {
      data.institutionDistrict = assignedClass.institutionDistrict;
    }
    if (assignedClass.academicYear) data.financialYear = assignedClass.academicYear;

    const result = await prisma.student.updateMany({
      where: { id: { in: ownedIds }, schoolId: session.schoolId },
      data,
    });

    return NextResponse.json({
      updated: result.count,
      classId: assignedClass.id,
      className: assignedClass.name,
      standard: assignedClass.standard,
      section: assignedClass.section,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/students/assign-division:", error);
    return NextResponse.json({ error: "Failed to assign division" }, { status: 500 });
  }
}
