import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { getBoardResultListConfig, mergeBoardResultJson } from "@/lib/board-records/result-list-config";
import {
  buildBoardResultListRow,
  padBoardResultListRows,
} from "@/lib/board-records/result-list-data";
import { gsebGrade, resultStatus } from "@/lib/board-records/gseb";

const BOARD_STANDARDS = ["10", "12"];

async function assertClassAccess(schoolId: string, classId: string, role: string, staffId?: string | null) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: { classTeacher: { select: { firstName: true, lastName: true } } },
  });
  if (!cls) return null;
  if (role === "teacher" && staffId && cls.classTeacherId !== staffId) {
    throw new AuthError("You can only edit your own class", 403);
  }
  if (!BOARD_STANDARDS.includes(cls.standard)) {
    throw new AuthError("Board result list is only for Class 10 and Class 12", 400);
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

    const stream = parseStreamFromClassName(cls.name, cls.standard, cls.stream);
    const config = getBoardResultListConfig(cls.standard, stream);

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
        middleName: true,
        surname: true,
        fatherName: true,
        grNumber: true,
        dateOfBirth: true,
        caste: true,
        category: true,
        rollNumber: true,
        standard: true,
        percentage10th: true,
        percentage12th: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        gsebResultJson: true,
      },
      orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    const rows = padBoardResultListRows(
      students.map((s, i) => buildBoardResultListRow(s, i + 1, config)),
      config,
    );

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream,
        academicYear: cls.academicYear,
      },
      config,
      rows,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load board result list" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "");
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!classId || !rows.length) {
      return NextResponse.json({ error: "classId and rows required" }, { status: 400 });
    }

    const cls = await assertClassAccess(session.schoolId, classId, session.role, session.staffId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const standard = cls.standard as "10" | "12";
    let updated = 0;

    for (const row of rows) {
      if (!row.studentId || String(row.studentId).startsWith("empty-")) continue;

      const student = await prisma.student.findFirst({
        where: { id: row.studentId, schoolId: session.schoolId },
        select: { gsebResultJson: true },
      });
      if (!student) continue;

      const pct =
        row.percentage === "" || row.percentage == null ? null : Number(row.percentage);
      const grade =
        row.grade ||
        (pct != null ? gsebGrade(pct).label : null);
      const resultText =
        row.result ||
        (pct != null
          ? resultStatus(pct) === "pass"
            ? "પાસ"
            : resultStatus(pct) === "fail"
              ? "નાપાસ"
              : ""
          : "");

      const gsebJson = mergeBoardResultJson(student.gsebResultJson, {
        subjects: row.subjects || {},
        totalMarks: row.totalMarks != null ? Number(row.totalMarks) : null,
        rankScore: row.rankScore != null ? Number(row.rankScore) : null,
        grade: grade !== "—" ? grade : null,
        result: resultText || null,
      });

      const data: Record<string, unknown> = { gsebResultJson: gsebJson };

      const seatPrefix = String(row.seatPrefix || "").trim().toUpperCase();
      const seatNumber = String(row.seatNumber || "")
        .replace(/\D/g, "")
        .slice(0, standard === "12" ? 6 : 7);

      if (standard === "10") {
        if (seatPrefix) data.sscSeatPrefix = seatPrefix;
        if (seatNumber) data.sscSeatNumber = seatNumber;
        if (pct != null && Number.isFinite(pct)) data.percentage10th = pct;
        data.board10th = "GSEB";
      } else {
        if (seatPrefix) data.hscSeatPrefix = seatPrefix;
        if (seatNumber) data.hscSeatNumber = seatNumber;
        if (pct != null && Number.isFinite(pct)) data.percentage12th = pct;
        data.board12th = "GSEB";
      }

      await prisma.student.update({
        where: { id: row.studentId },
        data,
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
