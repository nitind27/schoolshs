import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        classTeacher: true,
        students: {
          orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        },
        _count: { select: { students: true } },
      },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(schoolClass);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const existing = await prisma.schoolClass.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = await request.json();
    const data = {
      name: String(body.name || "").trim(),
      standard: String(body.standard || "").trim(),
      section: String(body.section || "").trim().toUpperCase(),
      academicYear: String(body.academicYear || "2025-26").trim(),
      institutionName: body.institutionName ? String(body.institutionName).trim() : null,
      institutionDistrict: body.institutionDistrict ? String(body.institutionDistrict).trim() : null,
      classTeacherId: body.classTeacherId ? String(body.classTeacherId).trim() : null,
    };

    const schoolClass = await prisma.schoolClass.update({
      where: { id },
      data,
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(schoolClass);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const existing = await prisma.schoolClass.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const count = await prisma.student.count({ where: { classId: id, schoolId: session.schoolId } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${count} students assigned to this class` },
        { status: 400 }
      );
    }
    await prisma.schoolClass.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
