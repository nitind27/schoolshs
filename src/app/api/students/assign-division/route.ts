import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { standardToCourseName } from "@/lib/constants";
import { defaultCourseTypeForStandard } from "@/lib/student-academic-rules";
import { syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { syncStudentPortalAccount } from "@/lib/student-account";

function normalizeIds(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  return [
    ...new Set(
      list
        .map((id) => String(id ?? "").trim())
        .filter((id) => id && id !== "undefined" && id !== "null"),
    ),
  ];
}

function isArchivedStatus(status: string) {
  return status.trim().toLowerCase() === "archived";
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const studentIds = normalizeIds(body.studentIds);
    const classId = String(body.classId || "").trim();
    const admitDrafts = body.admitDrafts === true;

    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }
    if (!classId) {
      return NextResponse.json({ error: "Please pick a class" }, { status: 400 });
    }

    const assignedClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!assignedClass) {
      return NextResponse.json({ error: "Selected class not found for this school" }, { status: 400 });
    }

    const owned = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: session.schoolId,
      },
      select: { id: true, status: true },
    });
    const targets = owned.filter((s) => !isArchivedStatus(String(s.status || "")));
    if (targets.length === 0) {
      return NextResponse.json(
        { error: "Selected students were not found in this school" },
        { status: 404 },
      );
    }

    const targetIds = targets.map((s) => s.id);
    const courseName = standardToCourseName(assignedClass.standard);
    const courseType =
      String(assignedClass.stream || "").trim() ||
      defaultCourseTypeForStandard(assignedClass.standard);
    const financialYear = assignedClass.academicYear || "";
    const institutionName = assignedClass.institutionName || "";
    const institutionDistrict = assignedClass.institutionDistrict || "";
    const idList = Prisma.join(targetIds.map((id) => Prisma.sql`${id}`));
    const promoteFlag = admitDrafts ? 1 : 0;

    await prisma.$executeRaw`
      UPDATE student
      SET
        classId = ${assignedClass.id},
        standard = ${assignedClass.standard},
        section = ${assignedClass.section},
        courseName = ${courseName},
        courseType = ${courseType},
        financialYear = CASE
          WHEN ${financialYear} = '' THEN financialYear
          ELSE ${financialYear}
        END,
        institutionName = CASE
          WHEN ${institutionName} = '' THEN institutionName
          ELSE ${institutionName}
        END,
        institutionDistrict = CASE
          WHEN ${institutionDistrict} = '' THEN institutionDistrict
          ELSE ${institutionDistrict}
        END,
        status = CASE
          WHEN ${promoteFlag} = 1 OR LOWER(TRIM(status)) = 'draft' THEN 'ready'
          ELSE status
        END,
        updatedAt = CURRENT_TIMESTAMP(3)
      WHERE schoolId = ${session.schoolId}
        AND id IN (${idList})
        AND LOWER(TRIM(status)) <> 'archived'
    `;

    const stillDraft = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
      SELECT COUNT(*) AS n
      FROM student
      WHERE schoolId = ${session.schoolId}
        AND id IN (${idList})
        AND LOWER(TRIM(status)) = 'draft'
    `;
    const leftover = Number(stillDraft[0]?.n ?? 0);
    if (leftover > 0) {
      console.error("admit-drafts leftover draft rows", leftover, targetIds);
      return NextResponse.json(
        { error: "Class assigned but students could not leave Draft. Try again." },
        { status: 500 },
      );
    }

    const admittedRows = await prisma.student.findMany({
      where: { id: { in: targetIds }, schoolId: session.schoolId },
    });
    const admitted = admittedRows.filter(
      (s) => String(s.status || "").trim().toLowerCase() === "ready",
    ).length;

    for (const student of admittedRows) {
      await syncStudentPortalAccount(student);
      if (student.grNumber?.trim() && student.status !== "draft") {
        await syncGrEntryForStudent(session.schoolId, student);
      }
    }

    return NextResponse.json({
      updated: targetIds.length,
      admitted,
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
