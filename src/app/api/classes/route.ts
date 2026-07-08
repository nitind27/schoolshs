import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

function normalizeClass(body: Record<string, unknown>) {
  const standard = String(body.standard || "").trim();
  const section = String(body.section || "A").trim().toUpperCase();
  const academicYear = String(body.academicYear || "2025-26").trim();
  const name = String(body.name || "").trim() || `Class ${standard}-${section}`;

  return {
    name,
    standard,
    section,
    academicYear,
    institutionName: String(body.institutionName || "").trim() || null,
    institutionDistrict: String(body.institutionDistrict || "").trim() || null,
    classTeacherId: String(body.classTeacherId || "").trim() || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (standard) where.standard = standard;
    if (section) where.section = section;
    if (academicYear) where.academicYear = academicYear;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { institutionName: { contains: search } },
      ];
    }

    const classes = await prisma.schoolClass.findMany({
      where,
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true, designation: true } },
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json({ classes, total: classes.length });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes", classes: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const body = await request.json();
    const data = normalizeClass(body);

    if (!data.standard || !data.section) {
      return NextResponse.json({ error: "Standard and section are required" }, { status: 400 });
    }

    const existing = await prisma.schoolClass.findUnique({
      where: {
        schoolId_standard_section_academicYear: {
          schoolId: session.schoolId,
          standard: data.standard,
          section: data.section,
          academicYear: data.academicYear,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Class ${data.standard}-${data.section} already exists for ${data.academicYear}` },
        { status: 409 }
      );
    }

    const schoolClass = await prisma.schoolClass.create({
      data: { ...data, schoolId: session.schoolId },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json(schoolClass, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("POST /api/classes error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
