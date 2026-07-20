import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseLimitParam, parsePageParam } from "@/lib/pagination";
import { computeAdmissionCompleteness } from "@/lib/admissions";

function buildWhere(
  schoolId: string,
  params: {
    status: string;
    standard?: string | null;
    section?: string | null;
    classId?: string | null;
    category?: string | null;
    search?: string | null;
  },
) {
  const where: Record<string, unknown> = {
    schoolId,
    admissionStatus: params.status,
  };

  if (params.classId) {
    where.classId = params.classId;
  } else {
    if (params.standard) where.standard = params.standard;
    if (params.section) where.section = params.section;
  }

  if (params.category) where.category = params.category;

  const q = params.search?.trim();
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { surname: { contains: q } },
      { grNumber: { contains: q } },
      { mobileNumber: { contains: q } },
      { rollNumber: { contains: q } },
    ];
  }

  return where;
}

type AdmissionListStudent = Awaited<
  ReturnType<
    typeof prisma.student.findMany<{
      include: { schoolClass: { select: { id: true; name: true; standard: true; section: true } } };
    }>
  >
>[number];

function mapStudent(s: AdmissionListStudent) {
  const completeness = computeAdmissionCompleteness(s);
  return {
    id: s.id,
    firstName: s.firstName,
    middleName: s.middleName,
    surname: s.surname,
    fatherName: s.fatherName,
    standard: s.standard,
    section: s.section,
    classId: s.classId,
    rollNumber: s.rollNumber,
    grNumber: s.grNumber,
    category: s.category,
    mobileNumber: s.mobileNumber,
    gender: s.gender,
    admissionStatus: s.admissionStatus,
    admissionType: s.admissionType,
    verifiedAt: s.verifiedAt,
    verifiedBy: s.verifiedBy,
    notes: s.notes,
    createdAt: s.createdAt,
    startDate: s.startDate,
    status: s.status,
    completeness,
    className: s.schoolClass?.name || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const classId = searchParams.get("classId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parsePageParam(searchParams.get("page"));
    const limit = parseLimitParam(searchParams.get("limit"));

    const where = buildWhere(session.schoolId, {
      status,
      standard,
      section,
      classId,
      category,
      search,
    });

    const schoolWhere = { schoolId: session.schoolId };

    const [students, total, stats, classStats, classes] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { schoolClass: { select: { id: true, name: true, standard: true, section: true } } },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.student.count({ where }),
      prisma.student.groupBy({
        by: ["admissionStatus"],
        where: schoolWhere,
        _count: true,
      }),
      prisma.student.groupBy({
        by: ["standard", "section", "admissionStatus"],
        where: { ...schoolWhere, standard: { not: null } },
        _count: true,
      }),
      prisma.schoolClass.findMany({
        where: { schoolId: session.schoolId },
        select: { id: true, name: true, standard: true, section: true, stream: true },
        orderBy: [{ standard: "asc" }, { section: "asc" }],
      }),
    ]);

    const classBreakdown = classStats
      .filter((r) => r.standard)
      .map((r) => ({
        standard: r.standard!,
        section: r.section || "",
        admissionStatus: r.admissionStatus,
        count: r._count,
      }));

    return NextResponse.json({
      students: students.map(mapStudent),
      total,
      page,
      limit,
      stats,
      classBreakdown,
      classes,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load admissions" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const { studentId, studentIds, admissionStatus, notes } = body;

    const ids: string[] = Array.isArray(studentIds)
      ? studentIds
      : studentId
        ? [studentId]
        : [];

    if (!ids.length || !admissionStatus) {
      return NextResponse.json({ error: "studentId(s) and admissionStatus required" }, { status: 400 });
    }

    const data = {
      admissionStatus,
      verifiedAt: admissionStatus === "verified" ? new Date() : null,
      verifiedBy: admissionStatus === "verified" ? session.name : null,
      ...(notes !== undefined ? { notes: notes || null } : {}),
    };

    const results = await Promise.all(
      ids.map((id) =>
        prisma.student.update({
          where: { id, schoolId: session.schoolId },
          data,
        }),
      ),
    );

    return NextResponse.json({
      updated: results.length,
      students: results.map((s) => ({
        id: s.id,
        admissionStatus: s.admissionStatus,
        verifiedAt: s.verifiedAt,
        verifiedBy: s.verifiedBy,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
