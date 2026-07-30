import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";

const BOARD_STANDARDS = ["10", "12"];
const SSC_SEAT_PREFIXES = new Set(["A", "B", "C", "S", "P"]);
const HSC_SEAT_PREFIXES = new Set([
  "B",
  "E",
  "G",
  "P",
  "A",
  "C",
  "T",
  "H",
  "D",
  "S",
]);

async function assertClassAccess(
  schoolId: string,
  classId: string,
  role: string,
  staffId?: string | null,
) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: {
      classTeacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { students: true } },
    },
  });
  if (!cls) return null;
  if (role === "teacher" && (!staffId || cls.classTeacherId !== staffId)) {
    throw new AuthError("You can only edit your own class", 403);
  }
  if (!BOARD_STANDARDS.includes(cls.standard)) {
    throw new AuthError("Board entry is only for Class 10 and Class 12", 400);
  }
  return cls;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "teacher",
      "clerk",
    ]);
    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId)
      return NextResponse.json({ error: "classId required" }, { status: 400 });

    const cls = await assertClassAccess(
      session.schoolId,
      classId,
      session.role,
      session.staffId,
    );
    if (!cls)
      return NextResponse.json({ error: "Class not found" }, { status: 404 });

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
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "teacher",
      "clerk",
    ]);
    const body = await request.json();
    const classId = String(body.classId || "");
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!classId || !rows.length) {
      return NextResponse.json(
        { error: "classId and rows required" },
        { status: 400 },
      );
    }

    const cls = await assertClassAccess(
      session.schoolId,
      classId,
      session.role,
      session.staffId,
    );
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    const standard = cls.standard as "10" | "12";
    const needDigits = standard === "12" ? 6 : 7;
    const allowedPrefixes =
      standard === "12" ? HSC_SEAT_PREFIXES : SSC_SEAT_PREFIXES;

    for (const row of rows) {
      const rawSeatNumber = String(row.seatNumber || "").trim();
      if (!rawSeatNumber) continue;
      const seatPrefix = String(row.seatPrefix || "")
        .trim()
        .toUpperCase();
      if (!allowedPrefixes.has(seatPrefix) || seatPrefix.length !== 1) {
        return NextResponse.json(
          { error: "Seat number must start with one valid alphabet prefix" },
          { status: 400 },
        );
      }
      if (!new RegExp(`^\\d{${needDigits}}$`).test(rawSeatNumber)) {
        return NextResponse.json(
          {
            error: `Seat number must contain exactly ${needDigits} digits after the alphabet`,
          },
          { status: 400 },
        );
      }
    }

    let updated = 0;
    for (const row of rows) {
      const studentId = String(row.studentId || "");
      if (!studentId) continue;

      const seatPrefix = String(
        row.seatPrefix || (standard === "12" ? "B" : "A"),
      )
        .trim()
        .toUpperCase();
      const seatNumber = String(row.seatNumber || "")
        .replace(/\D/g, "")
        .slice(0, needDigits);
      const hasValidSeat = seatNumber.length === needDigits;
      const pctRaw =
        row.percentage === "" || row.percentage == null
          ? null
          : Number(row.percentage);
      // Percentage only allowed with a valid GSEB seat
      const pct =
        hasValidSeat && pctRaw != null && Number.isFinite(pctRaw)
          ? pctRaw
          : null;
      const examYear = row.examYear ? String(row.examYear) : undefined;

      const data: Record<string, unknown> = {};
      if (standard === "10") {
        data.sscSeatPrefix = hasValidSeat ? seatPrefix : null;
        data.sscSeatNumber = hasValidSeat ? seatNumber : null;
        data.percentage10th = pct != null ? pct : 0;
        if (examYear) data.year10th = examYear;
        data.board10th = "GSEB";
        data.standard = "10";
        if (!hasValidSeat) {
          data.gsebResultJson = null;
          data.gsebFetchedAt = null;
        }
      } else {
        data.hscSeatPrefix = hasValidSeat ? seatPrefix : null;
        data.hscSeatNumber = hasValidSeat ? seatNumber : null;
        data.percentage12th = pct;
        if (examYear) data.year12th = examYear;
        data.board12th = "GSEB";
        data.standard = "12";
        if (!hasValidSeat) {
          data.gsebResultJson = null;
          data.gsebFetchedAt = null;
        }
      }

      const result = await prisma.student.updateMany({
        where: {
          id: studentId,
          schoolId: session.schoolId,
          OR: [
            { classId },
            {
              classId: null,
              standard: cls.standard,
              section: cls.section,
            },
          ],
        },
        data,
      });
      if (result.count) updated++;
    }

    return NextResponse.json({ updated, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
