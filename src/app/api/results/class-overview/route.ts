import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { ensureClassExam, getClassMarksSheetConfig } from "@/lib/class-subjects";
import { computeStudentTotals, subjectFinalMarks } from "@/lib/results/calculations";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const academicYear = searchParams.get("academicYear") || "2025-26";

    if (!classId) {
      const classes = await prisma.schoolClass.findMany({
        where: { schoolId: session.schoolId, academicYear },
        orderBy: [{ standard: "asc" }, { section: "asc" }],
        include: {
          classTeacher: { select: { firstName: true, lastName: true } },
          _count: { select: { students: true } },
        },
      });

      const exams = await prisma.exam.findMany({
        where: { schoolId: session.schoolId, academicYear, examType: "Annual" },
        select: { id: true, standard: true, section: true, isPublished: true },
      });

      const overview = classes.map((cls) => {
        const exam = exams.find((e) => e.standard === cls.standard && e.section === cls.section);
        return {
          id: cls.id,
          name: cls.name,
          standard: cls.standard,
          section: cls.section,
          academicYear: cls.academicYear,
          studentCount: cls._count.students,
          classTeacher: cls.classTeacher,
          examId: exam?.id ?? null,
          isPublished: exam?.isPublished ?? false,
        };
      });

      return NextResponse.json({ classes: overview, academicYear });
    }

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      include: {
        classTeacher: { select: { firstName: true, lastName: true } },
        students: {
          orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        },
      },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    let exam = await prisma.exam.findFirst({
      where: {
        schoolId: session.schoolId,
        standard: schoolClass.standard,
        section: schoolClass.section,
        academicYear: schoolClass.academicYear,
        examType: "Annual",
      },
      include: { subjects: { orderBy: { sortOrder: "asc" } } },
    });

    const results = exam
      ? await prisma.examResult.findMany({ where: { examId: exam.id }, include: { subject: true } })
      : [];
    const reportCards = exam
      ? await prisma.reportCard.findMany({ where: { examId: exam.id } })
      : [];

    const sheetConfig = await getClassMarksSheetConfig(
      schoolClass.id,
      schoolClass.standard,
      schoolClass.stream,
    );
    const subjectCount = exam?.subjects.length || sheetConfig.subjects.length;

    const students = schoolClass.students.map((st) => {
      const studentResults = results.filter((r) => r.studentId === st.id);
      const rc = reportCards.find((r) => r.studentId === st.id);
      const filled = studentResults.filter((r) => r.marksObtained > 0 || r.isAbsent).length;
      let marksStatus: "pending" | "partial" | "complete" = "pending";
      if (filled >= subjectCount) marksStatus = "complete";
      else if (filled > 0) marksStatus = "partial";

      const totals = studentResults.length
        ? computeStudentTotals(
            studentResults.map((r) => ({
              marksObtained: r.marksObtained,
              achievementMarks: r.achievementMarks,
              graceMarks: r.graceMarks,
              maxMarks: r.subject.maxMarks,
              isAbsent: r.isAbsent,
            })),
          )
        : null;

      return {
        id: st.id,
        firstName: st.firstName,
        middleName: st.middleName,
        surname: st.surname,
        rollNumber: st.rollNumber,
        grNumber: st.grNumber,
        section: st.section,
        marksStatus,
        marksFilled: filled,
        totalSubjects: subjectCount,
        totalMarks: rc?.totalMarks ?? totals?.totalFinal ?? null,
        percentage: rc?.percentage ?? totals?.percentage ?? null,
        grade: rc?.grade ?? totals?.grade ?? null,
        rank: rc?.rank ?? null,
        result: rc?.result ?? null,
        isPublished: rc?.isPublished ?? false,
      };
    });

    return NextResponse.json({
      class: {
        id: schoolClass.id,
        name: schoolClass.name,
        standard: schoolClass.standard,
        section: schoolClass.section,
        academicYear: schoolClass.academicYear,
        classTeacher: schoolClass.classTeacher,
        studentCount: schoolClass.students.length,
      },
      exam,
      students,
      stats: {
        total: students.length,
        complete: students.filter((s) => s.marksStatus === "complete").length,
        partial: students.filter((s) => s.marksStatus === "partial").length,
        pending: students.filter((s) => s.marksStatus === "pending").length,
        published: Boolean(exam?.isPublished),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const body = await request.json();

    if (body.action === "ensure_session") {
      const classId = body.classId as string;
      const schoolClass = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
      });
      if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

      const { exam } = await ensureClassExam(session.schoolId, schoolClass, {
        reopeningDate: body.reopeningDate || null,
      });

      return NextResponse.json({ exam, class: schoolClass });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
