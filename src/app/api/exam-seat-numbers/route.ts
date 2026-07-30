import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { ensureClassExam } from "@/lib/class-subjects";
import { prisma } from "@/lib/db";
import { parseExamTermMeta } from "@/lib/results/exam-terms";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";

const ROLES = ["school_admin", "clerk", "teacher"] as const;
const SEAT_PATTERN = /^[A-Z0-9][A-Z0-9/_-]{0,39}$/;

async function getClassForSession(
  session: Awaited<ReturnType<typeof requireSchoolAuth>>,
  classId: string,
) {
  await assertTeacherAttendanceAccess(session, classId);
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId: session.schoolId },
  });
  if (!schoolClass) throw new AuthError("Class not found", 404);
  return schoolClass;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const classId = request.nextUrl.searchParams.get("classId");
    const termKey = request.nextUrl.searchParams.get("termKey");
    const academicYear =
      request.nextUrl.searchParams.get("academicYear") || undefined;

    const classes = await prisma.schoolClass.findMany({
      where: {
        schoolId: session.schoolId,
        ...(academicYear ? { academicYear } : {}),
        ...(session.role === "teacher"
          ? { classTeacherId: session.staffId || "__unlinked__" }
          : {}),
      },
      orderBy: [
        { academicYear: "desc" },
        { standard: "asc" },
        { section: "asc" },
      ],
      select: {
        id: true,
        name: true,
        standard: true,
        section: true,
        stream: true,
        academicYear: true,
        _count: { select: { students: true } },
      },
    });

    if (!classId) {
      return NextResponse.json({ classes, terms: [], students: [] });
    }
    if (!classes.some((item) => item.id === classId)) {
      throw new AuthError("Class not found or access denied", 404);
    }

    const schoolClass = await getClassForSession(session, classId);
    const { exam } = await ensureClassExam(session.schoolId, schoolClass);
    const terms = parseExamTermMeta(exam.termMeta).terms.map((term) => ({
      key: term.key,
      labelEn: term.labelEn,
      labelGu: term.labelGu,
      examDate: term.examDate,
      published: term.published,
    }));

    if (!termKey) {
      return NextResponse.json({ classes, examId: exam.id, terms, students: [] });
    }
    if (!terms.some((term) => term.key === termKey)) {
      return NextResponse.json(
        { error: "Selected exam is not configured for this class" },
        { status: 400 },
      );
    }

    const [students, assignments] = await Promise.all([
      prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          classId,
          status: { not: "archived" },
        },
        orderBy: [
          { rollNumber: "asc" },
          { surname: "asc" },
          { firstName: "asc" },
        ],
        select: {
          id: true,
          firstName: true,
          middleName: true,
          surname: true,
          grNumber: true,
          rollNumber: true,
          gender: true,
        },
      }),
      prisma.examSeatAssignment.findMany({
        where: { schoolId: session.schoolId, examId: exam.id, termKey, classId },
        select: { studentId: true, seatNumber: true, isPublished: true },
      }),
    ]);
    const seatByStudent = new Map(
      assignments.map((item) => [item.studentId, item.seatNumber]),
    );
    const publishedCount = assignments.filter((item) => item.isPublished).length;

    return NextResponse.json({
      classes,
      examId: exam.id,
      terms,
      isPublished: assignments.length > 0 && publishedCount === assignments.length,
      publishedCount,
      assignedCount: assignments.length,
      students: students.map((student) => ({
        ...student,
        seatNumber: seatByStudent.get(student.id) || "",
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/exam-seat-numbers:", error);
    return NextResponse.json(
      { error: "Failed to load exam seat numbers" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const body = await request.json();
    const classId = String(body.classId || "").trim();
    const termKey = String(body.termKey || "").trim();
    const action = String(body.action || "save").trim();

    if (!classId || !termKey) {
      return NextResponse.json(
        { error: "Class and exam are required" },
        { status: 400 },
      );
    }

    const schoolClass = await getClassForSession(session, classId);
    const { exam } = await ensureClassExam(session.schoolId, schoolClass);
    const termExists = parseExamTermMeta(exam.termMeta).terms.some(
      (term) => term.key === termKey,
    );
    if (!termExists) {
      return NextResponse.json(
        { error: "Selected exam is not configured for this class" },
        { status: 400 },
      );
    }

    if (action === "publish" || action === "unpublish") {
      const isPublished = action === "publish";
      if (isPublished) {
        const assigned = await prisma.examSeatAssignment.count({
          where: {
            schoolId: session.schoolId,
            examId: exam.id,
            termKey,
            classId,
          },
        });
        if (!assigned) {
          return NextResponse.json(
            { error: "Assign seat numbers before publishing to students" },
            { status: 400 },
          );
        }
      }
      const result = await prisma.examSeatAssignment.updateMany({
        where: {
          schoolId: session.schoolId,
          examId: exam.id,
          termKey,
          classId,
        },
        data: {
          isPublished,
          publishedAt: isPublished ? new Date() : null,
        },
      });
      return NextResponse.json({
        success: true,
        updated: result.count,
        isPublished,
      });
    }

    const updates = (Array.isArray(body.updates) ? body.updates : []) as Array<{
      studentId?: unknown;
      seatNumber?: unknown;
    }>;

    if (!updates.length) {
      return NextResponse.json(
        { error: "Class, exam and student seat numbers are required" },
        { status: 400 },
      );
    }

    const normalized = updates.map((item) => ({
      studentId: String(item.studentId || "").trim(),
      seatNumber: String(item.seatNumber || "").trim().toUpperCase(),
    }));
    if (normalized.some((item) => !item.studentId)) {
      return NextResponse.json({ error: "Invalid student" }, { status: 400 });
    }
    const invalid = normalized.find(
      (item) => item.seatNumber && !SEAT_PATTERN.test(item.seatNumber),
    );
    if (invalid) {
      return NextResponse.json(
        {
          error:
            "Seat numbers may contain only letters, numbers, hyphen, slash or underscore (maximum 40 characters)",
        },
        { status: 400 },
      );
    }

    const currentStudents = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        classId,
        id: { in: normalized.map((item) => item.studentId) },
        status: { not: "archived" },
      },
      select: { id: true },
    });
    if (currentStudents.length !== new Set(normalized.map((x) => x.studentId)).size) {
      return NextResponse.json(
        { error: "Some students are not in the selected class" },
        { status: 400 },
      );
    }

    const nonEmpty = normalized
      .map((item) => item.seatNumber.toLowerCase())
      .filter(Boolean);
    if (new Set(nonEmpty).size !== nonEmpty.length) {
      return NextResponse.json(
        { error: "Seat numbers must be unique for the selected exam" },
        { status: 400 },
      );
    }

    let updated = 0;
    for (const item of normalized) {
      if (!item.seatNumber) {
        const deleted = await prisma.examSeatAssignment.deleteMany({
          where: { examId: exam.id, termKey, studentId: item.studentId },
        });
        updated += deleted.count;
        continue;
      }
      await prisma.examSeatAssignment.upsert({
        where: {
          examId_termKey_studentId: {
            examId: exam.id,
            termKey,
            studentId: item.studentId,
          },
        },
        create: {
          schoolId: session.schoolId,
          examId: exam.id,
          termKey,
          classId,
          studentId: item.studentId,
          seatNumber: item.seatNumber,
          assignedBy: session.userId,
          isPublished: false,
        },
        update: {
          classId,
          seatNumber: item.seatNumber,
          assignedBy: session.userId,
          // Editing seats unpublishes so students do not see stale drafts.
          isPublished: false,
          publishedAt: null,
        },
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated, isPublished: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Seat numbers must be unique for the selected exam" },
        { status: 400 },
      );
    }
    console.error("PATCH /api/exam-seat-numbers:", error);
    return NextResponse.json(
      { error: "Failed to save exam seat numbers" },
      { status: 500 },
    );
  }
}
