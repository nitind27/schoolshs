import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { buildClassName, MANAGE_STANDARDS } from "@/lib/class-structure";
import { enrolledStudentStatusFilter } from "@/lib/student-list-filters";
import { seedClassSubjects } from "@/lib/class-subjects";
import { assertStaffInSchool, assertClassTeacherAvailable } from "@/lib/school-assertions";

function normalizeStream(standard: string, stream: unknown): string {
  const s = String(stream || "").trim();
  if (!["11", "12"].includes(standard)) return "";
  return s;
}

export function normalizeClass(body: Record<string, unknown>) {
  const standard = String(body.standard || "").trim();
  const section = String(body.section || "A").trim().toUpperCase();
  const stream = normalizeStream(standard, body.stream);
  // Academic year is not user-facing — keep a stable default for DB uniqueness.
  const academicYear = "2025-26";
  const name =
    String(body.name || "").trim() ||
    buildClassName(standard, section, stream || undefined);

  return {
    name,
    standard,
    section,
    stream,
    academicYear,
  };
}

function classUniqueWhere(schoolId: string, data: ReturnType<typeof normalizeClass>) {
  return {
    schoolId_standard_section_stream_academicYear: {
      schoolId,
      standard: data.standard,
      section: data.section,
      stream: data.stream,
      academicYear: data.academicYear,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const stream = searchParams.get("stream");
    const academicYear = searchParams.get("academicYear");
    const search = searchParams.get("search");
    const managedOnly = searchParams.get("managed") === "1";

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (standard) {
      where.standard = standard;
    } else if (managedOnly) {
      where.standard = { in: [...MANAGE_STANDARDS] };
    }
    if (section) where.section = section;
    if (stream !== null && searchParams.has("stream")) where.stream = stream;
    if (academicYear) where.academicYear = academicYear;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { institutionName: { contains: search } },
      ];
    }

    const enrolled = enrolledStudentStatusFilter();
    const classes = await prisma.schoolClass.findMany({
      where,
      orderBy: [{ standard: "asc" }, { stream: "asc" }, { section: "asc" }],
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true, designation: true } },
        _count: {
          select: {
            students: { where: { status: enrolled } },
          },
        },
      },
    });

    const classIds = classes.map((c) => c.id);
    const linked: { classId: string | null; _count: { _all: number } }[] = [];
    const unassigned: {
      standard: string | null;
      section: string | null;
      courseType: string;
      _count: { _all: number };
    }[] = [];
    if (classIds.length) {
      const [linkedRows, unassignedRows] = await Promise.all([
        prisma.student.groupBy({
          by: ["classId"],
          where: {
            schoolId: session.schoolId,
            status: enrolled,
            classId: { in: classIds },
          },
          _count: { _all: true },
        }),
        prisma.student.groupBy({
          by: ["standard", "section", "courseType"],
          where: {
            schoolId: session.schoolId,
            status: enrolled,
            classId: null,
            AND: [
              { standard: { not: null } },
              { NOT: { standard: "" } },
              { section: { not: null } },
              { NOT: { section: "" } },
            ],
          },
          _count: { _all: true },
        }),
      ]);
      linked.push(...linkedRows);
      unassigned.push(...unassignedRows);
    }

    const linkedById = new Map(
      linked.filter((row) => row.classId).map((row) => [row.classId as string, row._count._all]),
    );
    const pendingByKey = new Map<string, number>();
    for (const row of unassigned) {
      const std = String(row.standard || "").trim();
      const sec = String(row.section || "").trim();
      const course = String(row.courseType || "").trim();
      const stream =
        ["11", "12"].includes(std) && ["Arts", "Commerce", "Science"].includes(course)
          ? course
          : "";
      const key = `${std}|${sec}|${stream}`;
      pendingByKey.set(key, (pendingByKey.get(key) || 0) + row._count._all);
    }

    const withCounts = classes.map((cls) => {
      const pendingKey = `${cls.standard}|${cls.section}|${cls.stream || ""}`;
      const students =
        (linkedById.get(cls.id) || 0) + (pendingByKey.get(pendingKey) || 0);
      return {
        ...cls,
        _count: { ...cls._count, students },
      };
    });

    return NextResponse.json({ classes: withCounts, total: withCounts.length });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes", classes: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const data = normalizeClass(body);

    if (!data.standard || !data.section) {
      return NextResponse.json({ error: "Standard and section are required" }, { status: 400 });
    }

    const existing = await prisma.schoolClass.findUnique({
      where: classUniqueWhere(session.schoolId, data),
    });

    if (existing) {
      const label = data.stream
        ? `${data.standard} ${data.stream}-${data.section}`
        : `${data.standard}-${data.section}`;
      return NextResponse.json(
        { error: `Class ${label} already exists` },
        { status: 409 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: {
        name: true,
        district: true,
        settings: { select: { schoolName: true } },
      },
    });

    const classTeacherId = body.classTeacherId ? String(body.classTeacherId) : null;
    if (classTeacherId) {
      await assertStaffInSchool(session.schoolId, [classTeacherId]);
      await assertClassTeacherAvailable(session.schoolId, classTeacherId);
    }

    const schoolClass = await prisma.schoolClass.create({
      data: {
        ...data,
        schoolId: session.schoolId,
        institutionName: school?.settings?.schoolName || school?.name || null,
        institutionDistrict: school?.district || null,
        classTeacherId,
      },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true } },
      },
    });

    await seedClassSubjects(schoolClass.id, schoolClass.standard, schoolClass.stream);

    return NextResponse.json(schoolClass, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("POST /api/classes error:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
