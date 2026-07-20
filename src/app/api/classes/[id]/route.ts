import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { normalizeClass } from "../route";
import { assertStaffInSchool } from "@/lib/school-assertions";

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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const existing = await prisma.schoolClass.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = await request.json();
    if (body.classTeacherId === undefined) {
      return NextResponse.json({ error: "classTeacherId required" }, { status: 400 });
    }

    const classTeacherId = body.classTeacherId ? String(body.classTeacherId) : null;
    if (classTeacherId) {
      await assertStaffInSchool(session.schoolId, [classTeacherId]);
    }

    const schoolClass = await prisma.schoolClass.update({
      where: { id },
      data: { classTeacherId },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true, designation: true } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(schoolClass);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const existing = await prisma.schoolClass.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const body = await request.json();
    const data = normalizeClass(body);

    if (!data.standard || !data.section) {
      return NextResponse.json({ error: "Standard and section are required" }, { status: 400 });
    }

    const duplicate = await prisma.schoolClass.findFirst({
      where: {
        schoolId: session.schoolId,
        standard: data.standard,
        section: data.section,
        stream: data.stream,
        academicYear: data.academicYear,
        NOT: { id },
      },
    });
    if (duplicate) {
      const label = data.stream
        ? `${data.standard} ${data.stream}-${data.section}`
        : `${data.standard}-${data.section}`;
      return NextResponse.json(
        { error: `Class ${label} already exists` },
        { status: 409 },
      );
    }

    const schoolClass = await prisma.schoolClass.update({
      where: { id },
      data: {
        name: data.name,
        standard: data.standard,
        section: data.section,
        stream: data.stream,
        academicYear: data.academicYear,
      },
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
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
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
