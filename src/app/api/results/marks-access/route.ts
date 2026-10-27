import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { seedClassSubjects } from "@/lib/class-subjects";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    if (session.role === "supervisor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const [staff, classes, grants] = await Promise.all([
      prisma.staff.findMany({
        where: { schoolId: session.schoolId, isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          employeeId: true,
          user: { select: { role: true, isActive: true } },
          classes: { select: { id: true, name: true } },
        },
      }),
      prisma.schoolClass.findMany({
        where: { schoolId: session.schoolId },
        orderBy: [{ academicYear: "desc" }, { standard: "asc" }, { section: "asc" }],
        select: {
          id: true,
          name: true,
          standard: true,
          section: true,
          academicYear: true,
          classSubjects: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { code: true, name: true, type: true },
          },
        },
      }),
      prisma.staffMarksGrant.findMany({
        where: { schoolId: session.schoolId },
        orderBy: { createdAt: "asc" },
        select: { id: true, staffId: true, classId: true, subjectCode: true },
      }),
    ]);

    return NextResponse.json({
      staff: staff.map((person) => ({
        id: person.id,
        name: `${person.firstName} ${person.lastName}`.trim(),
        designation: person.designation,
        employeeId: person.employeeId,
        hasTeacherLogin: person.user?.role === "teacher" && person.user.isActive,
        classTeacherOf: person.classes.map((item) => item.name),
      })),
      classes: classes.map((item) => ({
        id: item.id,
        name: item.name,
        standard: item.standard,
        section: item.section,
        academicYear: item.academicYear,
        subjects: item.classSubjects,
      })),
      grants,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[marks-access GET]", error);
    return NextResponse.json({ error: "Failed to load marks access" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    if (session.role === "supervisor") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const body = await request.json();
    const staffId = String(body.staffId || "").trim();
    const classId = String(body.classId || "").trim();
    const requested: unknown[] = Array.isArray(body.subjectCodes) ? body.subjectCodes : [];
    if (!staffId || !classId) {
      return NextResponse.json({ error: "Staff and class are required" }, { status: 400 });
    }

    const [staff, schoolClass] = await Promise.all([
      prisma.staff.findFirst({
        where: { id: staffId, schoolId: session.schoolId, isActive: true },
        select: { id: true },
      }),
      prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
        select: { id: true, standard: true, stream: true },
      }),
    ]);
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    let subjects = await prisma.classSubject.findMany({
      where: { classId, isActive: true },
      select: { code: true },
    });
    if (!subjects.length) {
      await seedClassSubjects(classId, schoolClass.standard, schoolClass.stream);
      subjects = await prisma.classSubject.findMany({
        where: { classId, isActive: true },
        select: { code: true },
      });
    }
    const allowed = new Map(subjects.map((item) => [item.code.toUpperCase(), item.code]));
    const subjectCodes: string[] = [];
    const seen = new Set<string>();
    for (const raw of requested) {
      const code = allowed.get(String(raw ?? "").trim().toUpperCase());
      if (!code || seen.has(code)) continue;
      seen.add(code);
      subjectCodes.push(code);
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffMarksGrant.deleteMany({
        where: { schoolId: session.schoolId, staffId, classId },
      });
      if (subjectCodes.length) {
        await tx.staffMarksGrant.createMany({
          data: subjectCodes.map((subjectCode) => ({
            schoolId: session.schoolId,
            staffId,
            classId,
            subjectCode,
          })),
        });
      }
    });

    return NextResponse.json({ success: true, subjectCodes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[marks-access PUT]", error);
    return NextResponse.json({ error: "Failed to save marks access" }, { status: 500 });
  }
}
