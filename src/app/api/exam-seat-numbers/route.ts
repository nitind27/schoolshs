import { NextRequest } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { ensureClassExam } from "@/lib/class-subjects";
import { prisma } from "@/lib/db";
import { compareRollNumbers } from "@/lib/attendance";
import {
  assignSectionSeatNumbers,
  formatBoardSeatNumber,
  isEarlierDivision,
  sectionCode,
  type ExamSeatSeries,
} from "@/lib/exam-seat-series";
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
  if (requested && assignmentCounts.has(requested)) return requested;
  let best = "";
  let bestCount = 0;
  for (const [key, count] of assignmentCounts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  if (best) return best;
  for (const term of terms) {
    const count = assignmentCounts.get(term.key) || 0;
    if (count > bestCount) {
      best = term.key;
      bestCount = count;
    }
  }
  if (best) return best;
  return terms.find((term) => term.key !== "final")?.key || terms[0]?.key || requested || "";
}

async function resolveExamForSeats(
  schoolId: string,
  schoolClass: {
    id: string;
    standard: string;
    section: string;
    stream: string;
    name: string;
    academicYear: string;
  },
  examIdParam: string,
  options?: { createIfMissing?: boolean },
) {
  const examSelect = { id: true, termMeta: true, isPublished: true } as const;

  const classSeat = await prisma.examSeatAssignment.findFirst({
    where: { schoolId, classId: schoolClass.id },
    select: { examId: true },
    orderBy: { updatedAt: "desc" },
  });
  if (classSeat) {
    const fromSeats = await prisma.exam.findFirst({
      where: { id: classSeat.examId, schoolId },
      select: examSelect,
    });
    if (fromSeats) {
      if (!examIdParam || examIdParam === fromSeats.id) return fromSeats;
      const requested = await prisma.exam.findFirst({
        where: { id: examIdParam, schoolId },
        select: examSelect,
      });
      const requestedCount = requested
        ? await prisma.examSeatAssignment.count({
            where: { examId: requested.id, classId: schoolClass.id },
          })
        : 0;
      if (requested && requestedCount > 0) return requested;
      return fromSeats;
    }
  }

  if (examIdParam) {
    const byId = await prisma.exam.findFirst({
      where: { id: examIdParam, schoolId },
      select: examSelect,
    });
    if (byId) {
      const assigned = await prisma.examSeatAssignment.count({
        where: { examId: byId.id, classId: schoolClass.id },
      });
      if (assigned > 0) return byId;
    }
  }

  const exams = await prisma.exam.findMany({
    where: {
      schoolId,
      standard: schoolClass.standard,
      section: schoolClass.section,
      academicYear: schoolClass.academicYear,
      examType: "Annual",
    },
    select: examSelect,
    orderBy: { updatedAt: "desc" },
  });

  if (exams.length) {
    const counts = await prisma.examSeatAssignment.groupBy({
      by: ["examId"],
      where: {
        schoolId,
        classId: schoolClass.id,
        examId: { in: exams.map((item) => item.id) },
      },
      _count: true,
    });
    const ranked = [...exams].sort((a, b) => {
      const aCount = counts.find((row) => row.examId === a.id)?._count || 0;
      const bCount = counts.find((row) => row.examId === b.id)?._count || 0;
      return bCount - aCount;
    });
    return ranked[0]!;
  }

  if (options?.createIfMissing === false) return null;

  const created = await ensureClassExam(schoolId, schoolClass);
  return {
    id: created.exam.id,
    termMeta: created.exam.termMeta,
    isPublished: created.exam.isPublished,
  };
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
    const exam = await resolveExamForSeats(
      session.schoolId,
      schoolClass,
      examIdParam,
      { createIfMissing: false },
    );
    const terms = parseExamTermMeta(exam?.termMeta).terms.map((term) => ({
      key: term.key,
      labelEn: term.labelEn,
      labelGu: term.labelGu,
      examDate: term.examDate,
      published: term.published,
    }));
    const termFromExamId =
      terms.some((term) => term.key === examIdParam) ? examIdParam : "";

    const students = await prisma.student.findMany({
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
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
      },
    });
    const studentIds = students.map((item) => item.id);
    const assignments = await prisma.examSeatAssignment.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [
          { classId },
          ...(exam ? [{ examId: exam.id }] : []),
          ...(studentIds.length ? [{ studentId: { in: studentIds } }] : []),
        ],
      },
      select: {
        studentId: true,
        seatNumber: true,
        isPublished: true,
        termKey: true,
        examId: true,
        classId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const assignmentCounts = new Map<string, number>();
    for (const item of assignments) {
      assignmentCounts.set(item.termKey, (assignmentCounts.get(item.termKey) || 0) + 1);
    }
    const termKey = resolveTermKey(
      terms,
      requestedTerm || termFromExamId,
      assignmentCounts,
    );
    if (
      requestedTerm &&
      terms.length &&
      !terms.some((term) => term.key === requestedTerm) &&
      !assignmentCounts.has(requestedTerm)
    ) {
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
    const seatsByStudent = new Map<
      string,
      Array<{
        termKey: string;
        seatNumber: string;
        isPublished: boolean;
        examId: string;
        source: "assigned";
      }>
    >();
    for (const item of assignments) {
      const list = seatsByStudent.get(item.studentId) || [];
      if (!list.some((row) => row.termKey === item.termKey && row.seatNumber === item.seatNumber)) {
        list.push({
          termKey: item.termKey,
          seatNumber: item.seatNumber,
          isPublished: item.isPublished,
          examId: item.examId,
          source: "assigned",
        });
      }
      seatsByStudent.set(item.studentId, list);
    }

    const suggestedByStudent = assignSectionSeatNumbers(students, seatSeries);

    const rows = students
      .map((student) => {
        const assignedSeats = seatsByStudent.get(student.id) || [];
        const primary =
          assignedSeats.find((item) => termKey && item.termKey === termKey) ||
          assignedSeats.find((item) => item.isPublished) ||
          assignedSeats[0] ||
          null;
        const assigned = primary?.seatNumber || "";
        const suggested = suggestedByStudent[student.id] || "";
        const examSeatNumber = assigned || suggested;
        const boardSeatNumber = formatBoardSeatNumber(schoolClass.standard, student);
        const seats = assignedSeats.length
          ? assignedSeats
          : examSeatNumber
            ? [
                {
                  termKey: termKey || "",
                  seatNumber: examSeatNumber,
                  isPublished: false,
                  examId: exam?.id || "",
                  source: "suggested" as const,
                },
              ]
            : [];
        return {
          ...student,
          boardSeatNumber,
          seatNumber: examSeatNumber,
          examSeatNumber,
          suggestedSeatNumber: suggested,
          isAssigned: Boolean(assigned),
          termKey: primary?.termKey || termKey || null,
          seats,
        };
      })
      .sort(
        (a, b) =>
          compareRollNumbers(a.rollNumber, b.rollNumber) ||
          a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" }) ||
          a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" }),
      );

    const assignedRows = rows.filter((row) => row.isAssigned);
    const filled = rows.filter((row) => row.seatNumber);
    const boardFilled = rows.filter((row) => row.boardSeatNumber);
    return mobileJson(
      {
        classes,
        examId: exam?.id || examIdParam || null,
        termKey: termKey || null,
        terms,
        seatSeries,
        isPublished: assignedForTerm > 0 && publishedForTerm === assignedForTerm,
        publishedCount: publishedForTerm,
        assignedCount: assignedRows.length,
        students: rows,
        seatNumbers: Object.fromEntries(filled.map((row) => [row.id, row.seatNumber])),
        boardSeatNumbers: Object.fromEntries(
          boardFilled.map((row) => [row.id, row.boardSeatNumber]),
        ),
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
    const exam = await resolveExamForSeats(session.schoolId, schoolClass, examIdParam, {
      createIfMissing: true,
    });
    if (!exam) {
      return mobileJson(
        { error: "Create an exam for this class first" },
        { status: 400 },
        origin,
      );
    }
    const terms = parseExamTermMeta(exam.termMeta).terms;
    const existingAssignments = await prisma.examSeatAssignment.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [{ examId: exam.id }, { classId }],
      },
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
