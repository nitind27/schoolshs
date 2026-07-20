import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { buildOverallResultAnalysis } from "@/lib/board-records/overall-result-analysis";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const academicYear = searchParams.get("academicYear") || "2025-26";
    const boardResultDate = searchParams.get("boardResultDate") || "";

    const where: Record<string, unknown> = {
      schoolId: session.schoolId,
      status: { not: "archived" },
      standard: "10",
    };
    if (classId) where.classId = classId;

    const students = await prisma.student.findMany({
      where,
      select: {
        gender: true,
        category: true,
        admissionType: true,
        percentage10th: true,
        gsebResultJson: true,
        schoolClass: {
          select: {
            name: true,
            section: true,
            standard: true,
            classTeacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ section: "asc" }, { rollNumber: "asc" }],
    });

    let classLabel = "ધો. 10";
    let classTeacher = "";
    if (classId && students[0]?.schoolClass) {
      const c = students[0].schoolClass;
      classLabel = c.name || `ધો. ${c.standard}-${c.section}`;
      if (c.classTeacher) {
        classTeacher = `${c.classTeacher.firstName} ${c.classTeacher.lastName}`.trim();
      }
    }

    const data = buildOverallResultAnalysis(students, {
      academicYear,
      boardResultDate,
      standard: "10",
      classLabel,
      classTeacher,
    });

    return NextResponse.json({
      ...data,
      studentCount: students.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET overall-analysis:", error);
    return NextResponse.json({ error: "Failed to load overall result analysis" }, { status: 500 });
  }
}
