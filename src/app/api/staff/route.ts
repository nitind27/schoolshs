import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

function salaryFields(body: Record<string, unknown>) {
  return {
    monthlySalary: body.monthlySalary != null && body.monthlySalary !== "" ? Number(body.monthlySalary) : null,
    hra: body.hra != null && body.hra !== "" ? Number(body.hra) : 0,
    conveyance: body.conveyance != null && body.conveyance !== "" ? Number(body.conveyance) : 0,
    pfDeduction: body.pfDeduction != null && body.pfDeduction !== "" ? Number(body.pfDeduction) : 0,
    bankName: String(body.bankName || "").trim() || null,
    bankAccount: String(body.bankAccount || "").trim() || null,
    ifscCode: String(body.ifscCode || "").trim() || null,
  };
}

function normalizeStaff(body: Record<string, unknown>) {
  return {
    employeeId: String(body.employeeId || "").trim() || null,
    firstName: String(body.firstName || "").trim(),
    lastName: String(body.lastName || "").trim(),
    designation: String(body.designation || "").trim(),
    department: String(body.department || "").trim() || null,
    mobileNumber: String(body.mobileNumber || "").replace(/\s/g, "").trim(),
    email: String(body.email || "").trim() || null,
    gender: String(body.gender || "").trim() || null,
    dateOfJoining: String(body.dateOfJoining || "").trim() || null,
    dateOfBirth: String(body.dateOfBirth || "").trim() || null,
    panNumber: String(body.panNumber || "").trim().toUpperCase() || null,
    gpfCpfNo: String(body.gpfCpfNo || "").trim() || null,
    aadhaarNumber: String(body.aadhaarNumber || "").replace(/\s/g, "") || null,
    qualification: String(body.qualification || "").trim() || null,
    payLevel: String(body.payLevel || "").trim() || null,
    isActive: body.isActive !== false,
    photoPath: String(body.photoPath || "").trim() || null,
    ...salaryFields(body),
  };
}

async function generateEmployeeId(schoolId: string): Promise<string> {
  const staffRows = await prisma.staff.findMany({
    where: { schoolId, employeeId: { not: null } },
    select: { employeeId: true },
  });

  const used = new Set(
    staffRows
      .map((s) => String(s.employeeId || "").trim().toUpperCase())
      .filter(Boolean)
  );

  let maxSeq = 0;
  for (const id of used) {
    const match = /^EMP(\d+)$/.exec(id);
    if (!match) continue;
    const seq = Number.parseInt(match[1], 10);
    if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
  }

  let nextSeq = maxSeq + 1;
  let candidate = `EMP${String(nextSeq).padStart(4, "0")}`;
  while (used.has(candidate)) {
    nextSeq += 1;
    candidate = `EMP${String(nextSeq).padStart(4, "0")}`;
  }
  return candidate;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const designation = searchParams.get("designation");
    const activeOnly = searchParams.get("active") !== "false";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (activeOnly) where.isActive = true;
    if (designation) where.designation = designation;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { mobileNumber: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        orderBy: [{ designation: "asc" }, { firstName: "asc" }],
        include: { _count: { select: { classes: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ]);

    return NextResponse.json({ staff, total, page, limit });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to fetch staff", staff: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const data = normalizeStaff(body);

    if (!data.firstName || !data.lastName || !data.designation || !data.mobileNumber) {
      return NextResponse.json({ error: "Name, designation and mobile are required" }, { status: 400 });
    }

    if (!data.employeeId) {
      data.employeeId = await generateEmployeeId(session.schoolId);
    }

    if (data.employeeId) {
      const existing = await prisma.staff.findUnique({
        where: { schoolId_employeeId: { schoolId: session.schoolId, employeeId: data.employeeId } },
      });
      if (existing) return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
    }

    const staff = await prisma.staff.create({ data: { ...data, schoolId: session.schoolId } });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
