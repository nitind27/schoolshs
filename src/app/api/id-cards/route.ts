import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    await requireSchoolFeature(session.schoolId, "id_cards");
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");
    const studentId = searchParams.get("studentId");
    const idsParam = searchParams.get("ids");
    const processPhotos = searchParams.get("processPhotos") === "true";

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (studentId) {
      where.id = studentId;
    } else if (idsParam) {
      const idList = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (idList.length) where.id = { in: idList };
    } else {
      if (classId) where.classId = classId;
      if (standard) where.standard = standard;
      if (section) where.section = section;
      if (academicYear) where.schoolClass = { academicYear };
    }

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
