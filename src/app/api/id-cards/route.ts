import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");
    const processPhotos = searchParams.get("processPhotos") === "true";

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (classId) where.classId = classId;
    if (standard) where.standard = standard;
    if (section) where.section = section;
    if (academicYear) where.schoolClass = { academicYear };

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
      include: {
        schoolClass: {
          select: { id: true, name: true, standard: true, section: true, academicYear: true },
        },
      },
    });

    let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });
    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { schoolId: session.schoolId, schoolName: session.schoolName || "My School" },
      });
    }

    return NextResponse.json({ students, settings, total: students.length, processPhotos });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/id-cards error:", error);
    return NextResponse.json({ error: "Failed to fetch ID card data", students: [] }, { status: 500 });
  }
}
