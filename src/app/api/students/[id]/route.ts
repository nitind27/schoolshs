import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

async function getOwnedStudent(id: string, schoolId: string) {
  return prisma.student.findFirst({ where: { id, schoolId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const existing = await getOwnedStudent(id, session.schoolId);
    if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const body = await request.json();
    const data = normalizeStudentRow(body);

    if (!data.classId) {
      return NextResponse.json({ error: "Class is required. Please assign a class before updating student." }, { status: 400 });
    }

    const assignedClass = await prisma.schoolClass.findFirst({
      where: { id: data.classId, schoolId: session.schoolId },
    });
    if (!assignedClass) {
      return NextResponse.json({ error: "Selected class not found for this school" }, { status: 400 });
    }

    data.standard = assignedClass.standard;
    data.section = assignedClass.section;
    data.institutionName = assignedClass.institutionName || data.institutionName;
    data.institutionDistrict = assignedClass.institutionDistrict || data.institutionDistrict;
    data.financialYear = assignedClass.academicYear || data.financialYear;
    data.courseName = data.courseName || `Class ${assignedClass.standard}`;

    const errors = validateStudent(data);

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...data,
        schoolId: session.schoolId,
        status: body.status || (errors.length === 0 ? "ready" : "draft"),
        validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
      } as Parameters<typeof prisma.student.update>[0]["data"],
    });

    return NextResponse.json({ student, errors });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const existing = await getOwnedStudent(id, session.schoolId);
    if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
