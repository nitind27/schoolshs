import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { fillStaffGuNames } from "@/lib/gujarati/transliterate-server";

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
    const data = await fillStaffGuNames({
      employeeId: body.employeeId ? String(body.employeeId).trim().toUpperCase() : null,
      firstName: String(body.firstName || "").trim(),
      firstNameGu: String(body.firstNameGu || "").trim() || null,
      lastName: String(body.lastName || "").trim(),
      lastNameGu: String(body.lastNameGu || "").trim() || null,
      designation: String(body.designation || "").trim(),
      department: body.department ? String(body.department).trim() : null,
      mobileNumber: String(body.mobileNumber || "").replace(/\s/g, "").trim(),
      email: body.email ? String(body.email).trim() : null,
      gender: body.gender ? String(body.gender).trim() : null,
      dateOfJoining: body.dateOfJoining ? String(body.dateOfJoining).trim() : null,
      dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth).trim() : null,
      panNumber: body.panNumber ? String(body.panNumber).trim().toUpperCase() : null,
      gpfCpfNo: body.gpfCpfNo ? String(body.gpfCpfNo).trim() : null,
      aadhaarNumber: body.aadhaarNumber ? String(body.aadhaarNumber).replace(/\s/g, "") : null,
      qualification: body.qualification ? String(body.qualification).trim() : null,
      payLevel: body.payLevel ? String(body.payLevel).trim() : null,
      isActive: body.isActive !== false,
      photoPath:
        body.photoPath !== undefined
          ? String(body.photoPath || "").trim() || null
          : existing.photoPath,
      monthlySalary: body.monthlySalary != null && body.monthlySalary !== "" ? Number(body.monthlySalary) : null,
      hra: body.hra != null && body.hra !== "" ? Number(body.hra) : 0,
      conveyance: body.conveyance != null && body.conveyance !== "" ? Number(body.conveyance) : 0,
      pfDeduction: body.pfDeduction != null && body.pfDeduction !== "" ? Number(body.pfDeduction) : 0,
      bankName: body.bankName ? String(body.bankName).trim() : null,
      bankAccount: body.bankAccount ? String(body.bankAccount).trim() : null,
      ifscCode: body.ifscCode ? String(body.ifscCode).trim().toUpperCase() : null,
    });

    if (!data.firstName || !data.lastName || !data.designation || !data.mobileNumber) {
      return NextResponse.json({ error: "Name, designation and mobile are required" }, { status: 400 });
    }
    if (!data.employeeId) {
      return NextResponse.json({ error: "Teacher code is required" }, { status: 400 });
    }
    if (!/^[A-Z0-9_-]{2,20}$/.test(data.employeeId)) {
      return NextResponse.json(
        { error: "Teacher code must be 2–20 characters (letters, numbers, - or _)" },
        { status: 400 },
      );
    }
    if (!/^[6-9]\d{9}$/.test(data.mobileNumber)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }

    if (data.employeeId !== existing.employeeId) {
      const duplicate = await prisma.staff.findUnique({
        where: { schoolId_employeeId: { schoolId: session.schoolId!, employeeId: data.employeeId } },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: "Teacher code already exists" }, { status: 409 });
      }
    }

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
