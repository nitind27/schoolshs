import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { ensureClassExam } from "@/lib/class-subjects";
import { prisma } from "@/lib/db";
import { compareRollNumbers } from "@/lib/attendance";
import { isEarlierDivision, sectionCode, type ExamSeatSeries } from "@/lib/exam-seat-series";
import { parseExamTermMeta } from "@/lib/results/exam-terms";
import { assertTeacherHomeroomAccess } from "@/lib/teacher-attendance";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

const ROLES = ["school_admin", "clerk", "teacher"] as const;
const SEAT_PATTERN = /^[A-Z0-9][A-Z0-9/_-]{0,39}$/;

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

function readTermKey(source: { get?: (key: string) => string | null } | Record<string, unknown>): string {
  const pick = (key: string) => {
    if (typeof (source as { get?: (k: string) => string | null }).get === "function") {
      return String((source as { get: (k: string) => string | null }).get(key) || "").trim();
    }
    const value = (source as Record<string, unknown>)[key];
    return String(value ?? "").trim();
  };
  return pick("termKey") || pick("term") || pick("examTerm") || "";
}

function resolveTermKey(
  terms: Array<{ key: string }>,
  requested: string,
  assignmentCounts: Map<string, number>,
): string {
  if (requested && terms.some((term) => term.key === requested)) return requested;
  let best = "";
  let bestCount = 0;
  for (const term of terms) {
    const count = assignmentCounts.get(term.key) || 0;
    if (count > bestCount) {
      best = term.key;
      bestCount = count;
    }
  }
  if (best) return best;
  return terms.find((term) => term.key !== "final")?.key || terms[0]?.key || "";
}

async function seatSeriesForClass(
  schoolId: string,
  schoolClass: {
    id: string;
    standard: string;
    section: string;
    stream: string;
    name: string;
    academicYear: string;
  },
): Promise<ExamSeatSeries> {
  const section = sectionCode(schoolClass.section, schoolClass.name);
  const siblings = await prisma.schoolClass.findMany({
    where: { schoolId, academicYear: schoolClass.academicYear },
    select: { id: true, standard: true, section: true, stream: true, name: true },
  });
  const earlierIds = siblings
    .filter((item) => item.id !== schoolClass.id && isEarlierDivision(schoolClass, item))
    .map((item) => item.id);
  const priorStudents = earlierIds.length
    ? await prisma.student.count({
        where: {
          schoolId,
          classId: { in: earlierIds },
          status: { not: "archived" },
        },
      })
    : 0;
  return { section, offset: priorStudents, priorStudents };
}

async function getClassForSession(
  session: Awaited<ReturnType<typeof requireSchoolAuth>>,
  classId: string,
) {
  await assertTeacherHomeroomAccess(session, classId);
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, schoolId: session.schoolId },
  });
  if (!schoolClass) throw new AuthError("Class not found", 404);
  return schoolClass;
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const params = request.nextUrl.searchParams;
    let classId = params.get("classId") || "";
    const examIdParam = params.get("examId") || "";
    const requestedTerm = readTermKey(params);
    const academicYear = params.get("academicYear") || undefined;

    if (!classId && examIdParam) {
      const examRow = await prisma.exam.findFirst({
        where: { id: examIdParam, schoolId: session.schoolId },
        select: { standard: true, section: true, academicYear: true },
      });
      if (examRow) {
        const matched = await prisma.schoolClass.findFirst({
          where: {
            schoolId: session.schoolId,
            standard: examRow.standard || undefined,
            section: examRow.section || undefined,
            academicYear: examRow.academicYear,
          },
          select: { id: true },
        });
        if (matched) classId = matched.id;
      }
    }

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
      return mobileJson({ classes, terms: [], students: [], examId: examIdParam || null }, undefined, origin);
    }
    if (!classes.some((item) => item.id === classId)) {
      throw new AuthError("Class not found or access denied", 404);
    }

    const schoolClass = await getClassForSession(session, classId);
    const seatSeries = await seatSeriesForClass(session.schoolId, schoolClass);
    const { exam } = await ensureClassExam(session.schoolId, schoolClass);
    const terms = parseExamTermMeta(exam.termMeta).terms.map((term) => ({
      key: term.key,
      labelEn: term.labelEn,
      labelGu: term.labelGu,
      examDate: term.examDate,
      published: term.published,
    }));

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
          firstNameGu: true,
          middleNameGu: true,
          surnameGu: true,
          fatherName: true,
          fatherNameGu: true,
          grNumber: true,
          rollNumber: true,
          gender: true,
        },
      }),
      prisma.examSeatAssignment.findMany({
        where: { schoolId: session.schoolId, examId: exam.id, classId },
        select: {
          studentId: true,
          seatNumber: true,
          isPublished: true,
          termKey: true,
        },
      }),
    ]);

    const assignmentCounts = new Map<string, number>();
    for (const item of assignments) {
      assignmentCounts.set(item.termKey, (assignmentCounts.get(item.termKey) || 0) + 1);
    }
    const termKey = resolveTermKey(terms, requestedTerm, assignmentCounts);
    if (requestedTerm && terms.length && !terms.some((term) => term.key === requestedTerm)) {
      return mobileJson(
        { error: "Selected exam is not configured for this class" },
        { status: 400 },
        origin,
      );
    }

    const publishedForTerm = assignments.filter(
      (item) => (!termKey || item.termKey === termKey) && item.isPublished,
    ).length;
    const assignedForTerm = assignments.filter((item) => !termKey || item.termKey === termKey).length;
    const seatByStudent = new Map(
      assignments
        .filter((item) => !termKey || item.termKey === termKey)
        .map((item) => [item.studentId, item.seatNumber]),
    );
    const seatsByStudent = new Map<string, Array<{ termKey: string; seatNumber: string; isPublished: boolean }>>();
    for (const item of assignments) {
      const list = seatsByStudent.get(item.studentId) || [];
      list.push({
        termKey: item.termKey,
        seatNumber: item.seatNumber,
        isPublished: item.isPublished,
      });
      seatsByStudent.set(item.studentId, list);
    }

    const rows = students
      .map((student) => ({
        ...student,
        seatNumber: seatByStudent.get(student.id) || "",
        termKey: termKey || null,
        seats: seatsByStudent.get(student.id) || [],
      }))
      .sort(
        (a, b) =>
          compareRollNumbers(a.rollNumber, b.rollNumber) ||
          a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" }) ||
          a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" }),
      );

    return mobileJson(
      {
        classes,
        examId: exam.id,
        termKey: termKey || null,
        terms,
        seatSeries,
        isPublished: assignedForTerm > 0 && publishedForTerm === assignedForTerm,
        publishedCount: publishedForTerm,
        assignedCount: assignedForTerm,
        students: rows,
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("GET /api/exam-seat-numbers:", error);
    return mobileJson(
      { error: "Failed to load exam seat numbers" },
      { status: 500 },
      origin,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth([...ROLES]);
    const body = await request.json();
    let classId = String(body.classId || "").trim();
    const examIdParam = String(body.examId || "").trim();
    const action = String(body.action || "save").trim();

    if (!classId && examIdParam) {
      const examRow = await prisma.exam.findFirst({
        where: { id: examIdParam, schoolId: session.schoolId },
        select: { standard: true, section: true, academicYear: true },
      });
      if (examRow) {
        const matched = await prisma.schoolClass.findFirst({
          where: {
            schoolId: session.schoolId,
            standard: examRow.standard || undefined,
            section: examRow.section || undefined,
            academicYear: examRow.academicYear,
          },
          select: { id: true },
        });
        if (matched) classId = matched.id;
      }
    }

    if (!classId) {
      return mobileJson(
        { error: "Class and exam are required" },
        { status: 400 },
        origin,
      );
    }

    const schoolClass = await getClassForSession(session, classId);
    const { exam } = await ensureClassExam(session.schoolId, schoolClass);
    const terms = parseExamTermMeta(exam.termMeta).terms;
    const existingAssignments = await prisma.examSeatAssignment.findMany({
      where: { schoolId: session.schoolId, examId: exam.id, classId },
      select: { termKey: true },
    });
    const assignmentCounts = new Map<string, number>();
    for (const item of existingAssignments) {
      assignmentCounts.set(item.termKey, (assignmentCounts.get(item.termKey) || 0) + 1);
    }
    const termKey = resolveTermKey(terms, readTermKey(body), assignmentCounts);
    if (!termKey) {
      return mobileJson(
        { error: "Create an exam for this class first" },
        { status: 400 },
        origin,
      );
    }
    const termExists = terms.some((term) => term.key === termKey);
    if (!termExists) {
      return mobileJson(
        { error: "Selected exam is not configured for this class" },
        { status: 400 },
        origin,
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
          return mobileJson(
            { error: "Assign seat numbers before publishing to students" },
            { status: 400 },
            origin,
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
      return mobileJson(
        {
          success: true,
          updated: result.count,
          isPublished,
          examId: exam.id,
          termKey,
        },
        undefined,
        origin,
      );
    }

    const updates = (Array.isArray(body.updates) ? body.updates : []) as Array<{
      studentId?: unknown;
      seatNumber?: unknown;
    }>;

    if (!updates.length) {
      return mobileJson(
        { error: "Class, exam and student seat numbers are required" },
        { status: 400 },
        origin,
      );
    }

    const normalized = updates.map((item) => ({
      studentId: String(item.studentId || "").trim(),
      seatNumber: String(item.seatNumber || "").trim().toUpperCase(),
    }));
    if (normalized.some((item) => !item.studentId)) {
      return mobileJson({ error: "Invalid student" }, { status: 400 }, origin);
    }
    const invalid = normalized.find(
      (item) => item.seatNumber && !SEAT_PATTERN.test(item.seatNumber),
    );
    if (invalid) {
      return mobileJson(
        {
          error:
            "Seat numbers may contain only letters, numbers, hyphen, slash or underscore (maximum 40 characters)",
        },
        { status: 400 },
        origin,
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
      return mobileJson(
        { error: "Some students are not in the selected class" },
        { status: 400 },
        origin,
      );
    }

    const nonEmpty = normalized
      .map((item) => item.seatNumber.toLowerCase())
      .filter(Boolean);
    if (new Set(nonEmpty).size !== nonEmpty.length) {
      return mobileJson(
        { error: "Seat numbers must be unique for the selected exam" },
        { status: 400 },
        origin,
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

    return mobileJson(
      { success: true, updated, isPublished: false, examId: exam.id, termKey },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    if ((error as { code?: string }).code === "P2002") {
      return mobileJson(
        { error: "Seat numbers must be unique for the selected exam" },
        { status: 400 },
        origin,
      );
    }
    console.error("PATCH /api/exam-seat-numbers:", error);
    return mobileJson(
      { error: "Failed to save exam seat numbers" },
      { status: 500 },
      origin,
    );
  }
}
