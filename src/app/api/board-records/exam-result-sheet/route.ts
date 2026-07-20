import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { mergeBoardResultJson } from "@/lib/board-records/result-list-config";
import {
  buildExamResultSheetRow,
  getExamSheetSubjects,
  padExamResultSheetRows,
  type ExamResultSheetMeta,
} from "@/lib/board-records/exam-result-sheet";
import { gsebGrade } from "@/lib/board-records/gseb";

const BOARD_STANDARDS = ["10", "12"];

async function assertClassAccess(schoolId: string, classId: string, role: string, staffId?: string | null) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: {
      school: { select: { name: true, city: true, district: true, udiseCode: true } },
    },
  });
  if (!cls) return null;
  if (role === "teacher" && staffId && cls.classTeacherId !== staffId) {
    throw new AuthError("You can only edit your own class", 403);
  }
  if (!BOARD_STANDARDS.includes(cls.standard)) {
    throw new AuthError("Exam result sheet is only for Class 10 and Class 12", 400);
  }
  return cls;
}

function defaultExamCenter(cls: {
  school: { city: string | null; district: string | null; udiseCode: string | null } | null;
}): string {
  const s = cls.school;
  if (!s) return "";
  if (s.udiseCode) return s.udiseCode;
  return [s.city, s.district].filter(Boolean).join(", ");
}

function schoolAveragePct(
  students: { percentage10th: number | null; percentage12th: number | null }[],
  standard: "10" | "12",
): string {
  const vals = students
    .map((s) => (standard === "10" ? s.percentage10th : s.percentage12th))
    .filter((v): v is number => v != null && v > 0);
  if (!vals.length) return "";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const classId = request.nextUrl.searchParams.get("classId");
    const sessionMonth = request.nextUrl.searchParams.get("session") === "July" ? "July" : "March";
    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

    const cls = await assertClassAccess(session.schoolId, classId, session.role, session.staffId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const stream = parseStreamFromClassName(cls.name, cls.standard, cls.stream);
    const standard = cls.standard as "10" | "12";
    const subjects = getExamSheetSubjects(cls.standard, stream);
    const examCenter = defaultExamCenter(cls);

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
        mobileNumber: true,
        currentAddress: true,
        currentCity: true,
        currentDistrict: true,
        currentPincode: true,
        childUid: true,
        rollNumber: true,
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

    const rows = padExamResultSheetRows(
      students.map((s, i) => buildExamResultSheetRow(s, i + 1, standard, subjects, examCenter)),
      subjects,
    );

    const schoolPct = schoolAveragePct(students, standard);
    const schoolGrade = schoolPct ? gsebGrade(Number(schoolPct)).label : "";

    const meta: ExamResultSheetMeta = {
      academicYear: cls.academicYear,
      session: sessionMonth,
      standard,
      stream,
      section: cls.section,
      className: cls.name,
      examCenter,
      boardPct: "",
      centerPct: "",
      schoolPct,
      schoolGrade: schoolGrade !== "—" ? schoolGrade : "",
    };

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream,
        academicYear: cls.academicYear,
      },
      subjects,
      meta,
      rows,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load exam result sheet" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();
    const classId = String(body.classId || "");
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const metaPatch = body.meta || {};
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

      const subjectsFlat: Record<string, number | null> = {};
      const subjectsDetail: Record<string, { board?: number | null; school?: number | null; total?: number | null; grade?: string | null }> = {};
      if (row.subjects && typeof row.subjects === "object") {
        for (const [key, val] of Object.entries(row.subjects as Record<string, { board?: number | null; school?: number | null; total?: number | null; grade?: string | null }>)) {
          subjectsDetail[key] = val;
          if (val.total != null) subjectsFlat[key] = val.total;
        }
      }

      const gsebJson = mergeBoardResultJson(student.gsebResultJson, {
        subjects: subjectsFlat,
        subjectsDetail,
        totalMarks: row.totalMarks != null ? Number(row.totalMarks) : null,
        percentile: row.percentile != null ? Number(row.percentile) : null,
        grade: row.gradeRank || null,
      });

      const data: Record<string, unknown> = { gsebResultJson: gsebJson };

      const seatPrefix = String(row.seatPrefix || "").trim().toUpperCase();
      const seatNumber = String(row.seatNumber || "")
        .replace(/\D/g, "")
        .slice(0, standard === "12" ? 6 : 7);

      if (standard === "10") {
        if (seatPrefix) data.sscSeatPrefix = seatPrefix;
        if (seatNumber) data.sscSeatNumber = seatNumber;
      } else {
        if (seatPrefix) data.hscSeatPrefix = seatPrefix;
        if (seatNumber) data.hscSeatNumber = seatNumber;
      }

      await prisma.student.update({ where: { id: row.studentId }, data });
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      meta: metaPatch,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
