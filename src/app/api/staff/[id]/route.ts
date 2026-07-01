import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const staff = await prisma.staff.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        classes: { include: { _count: { select: { students: true } } } },
      },
    });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const existing = await prisma.staff.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const body = await request.json();
    const data = {
      employeeId: body.employeeId ? String(body.employeeId).trim() : null,
      firstName: String(body.firstName || "").trim(),
      lastName: String(body.lastName || "").trim(),
      designation: String(body.designation || "").trim(),
      department: body.department ? String(body.department).trim() : null,
      mobileNumber: String(body.mobileNumber || "").replace(/\s/g, "").trim(),
      email: body.email ? String(body.email).trim() : null,
      gender: body.gender ? String(body.gender).trim() : null,
      dateOfJoining: body.dateOfJoining ? String(body.dateOfJoining).trim() : null,
      isActive: body.isActive !== false,
      photoPath: body.photoPath ? String(body.photoPath).trim() : null,
    };

    const staff = await prisma.staff.update({ where: { id }, data });
    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const existing = await prisma.staff.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    await prisma.staff.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to deactivate staff" }, { status: 500 });
  }
}
