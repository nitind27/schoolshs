import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const gender = searchParams.get("gender");
    const institutionName = searchParams.get("institutionName");
    const scholarshipScheme = searchParams.get("scholarshipScheme");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (classId) where.classId = classId;
    if (standard) where.standard = standard;
    if (section) where.section = section;
    if (gender) where.gender = gender;
    if (institutionName) where.institutionName = { contains: institutionName };
    if (scholarshipScheme) where.scholarshipScheme = scholarshipScheme;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { surname: { contains: search } },
        { aadhaarNumber: { contains: search } },
        { mobileNumber: { contains: search } },
        { institutionName: { contains: search } },
        { rollNumber: { contains: search } },
        { grNumber: { contains: search } },
        { childUid: { contains: search } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          schoolClass: {
            select: { id: true, name: true, standard: true, section: true, academicYear: true },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({ students, total, page, limit });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "Failed to fetch students", students: [], total: 0, page: 1, limit: 50 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const data = normalizeStudentRow(body);

    if (!data.classId) {
      return NextResponse.json({ error: "Class is required. Please assign a class before saving student." }, { status: 400 });
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

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({
      where: {
        schoolId_aadhaarNumber: {
          schoolId: session.schoolId,
          aadhaarNumber: data.aadhaarNumber!,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Student with this Aadhaar already exists in your school" }, { status: 409 });
    }

    const student = await prisma.student.create({
      data: {
        ...data,
        schoolId: session.schoolId,
        status: errors.length === 0 ? "ready" : "draft",
        validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
      } as Parameters<typeof prisma.student.create>[0]["data"],
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
