import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";

const BOARD_STANDARDS = ["10", "12"];

async function assertClassAccess(schoolId: string, classId: string, role: string, staffId?: string | null) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: {
      classTeacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { students: true } },
    },
  });
  if (!cls) return null;
  if (role === "teacher" && staffId && cls.classTeacherId !== staffId) {
    throw new AuthError("You can only edit your own class", 403);
  }
  if (!BOARD_STANDARDS.includes(cls.standard)) {
    throw new AuthError("Board entry is only for Class 10 and Class 12", 400);
  }
  return cls;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

    const cls = await assertClassAccess(session.schoolId, classId, session.role, session.staffId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [
          { classId },
          { classId: null, standard: cls.standard, section: cls.section },
        ],
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        rollNumber: true,
        grNumber: true,
        childUid: true,
        category: true,
        standard: true,
        section: true,
        board10th: true,
        percentage10th: true,
        year10th: true,
        board12th: true,
        percentage12th: true,
        year12th: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        gsebFetchedAt: true,
      },
      orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: parseStreamFromClassName(cls.name, cls.standard, cls.stream),
        academicYear: cls.academicYear,
        studentCount: students.length,
        classTeacher: cls.classTeacher
          ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}`
          : null,
      },
      students,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "");
    const standard = String(body.standard || "10") as "10" | "12";
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!classId || !rows.length) {
      return NextResponse.json({ error: "classId and rows required" }, { status: 400 });
    }

    await assertClassAccess(session.schoolId, classId, session.role, session.staffId);

    let updated = 0;
    for (const row of rows) {
      const studentId = String(row.studentId || "");
      if (!studentId) continue;

      const seatPrefix = String(row.seatPrefix || "A").trim().toUpperCase();
      const seatNumber = String(row.seatNumber || "").replace(/\D/g, "").slice(0, 7);
      const pct = row.percentage === "" || row.percentage == null ? null : Number(row.percentage);
      const examYear = row.examYear ? String(row.examYear) : undefined;

      const data: Record<string, unknown> = {};
      if (standard === "10") {
        if (seatPrefix) data.sscSeatPrefix = seatPrefix;
        if (seatNumber) data.sscSeatNumber = seatNumber;
        if (pct != null && Number.isFinite(pct)) data.percentage10th = pct;
        if (examYear) data.year10th = examYear;
        data.board10th = "GSEB";
        data.standard = "10";
      } else {
        if (seatPrefix) data.hscSeatPrefix = seatPrefix;
        if (seatNumber) data.hscSeatNumber = seatNumber;
        if (pct != null && Number.isFinite(pct)) data.percentage12th = pct;
        if (examYear) data.year12th = examYear;
        data.board12th = "GSEB";
        data.standard = "12";
      }

      const result = await prisma.student.updateMany({
        where: { id: studentId, schoolId: session.schoolId },
        data,
      });
      if (result.count) updated++;
    }

    return NextResponse.json({ updated, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
