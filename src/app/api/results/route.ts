import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { gradeFromPercent } from "@/lib/results/exam-rules";
import { loadSchoolExamRules } from "@/lib/results/exam-stats";
import {
  ANNUAL_RESULT_SUBJECTS,
  resultSessionName,
} from "@/lib/results/config";
import { assignRanks, computeResultStatus, computeStudentTotals } from "@/lib/results/calculations";
import {
  assertExamInSchool,
  assertExamSubjectsInSchool,
  assertStudentsInSchool,
  SchoolScopeError,
} from "@/lib/school-assertions";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";
import { getSupervisorClassIds } from "@/lib/supervisor-scope";
import { describeMarkChange, logMarkEdits, studentAuditLabel } from "@/lib/change-log";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    await requireSchoolFeature(session.schoolId, "results");
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get("standard");
    const examId = searchParams.get("examId");
    const section = searchParams.get("section");

    const supervisorClassIds = await getSupervisorClassIds(session);
    const supervisorClasses = supervisorClassIds
      ? await prisma.schoolClass.findMany({
          where: {
            schoolId: session.schoolId,
            id: { in: supervisorClassIds.length ? supervisorClassIds : ["__no_supervisor_class__"] },
          },
          select: { id: true, standard: true, section: true },
        })
      : null;

    const exams = await prisma.exam.findMany({
      where: {
        schoolId: session.schoolId,
        ...(standard ? { standard } : {}),
        ...(section ? { section } : {}),
      },
      include: {
        subjects: { orderBy: { sortOrder: "asc" } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const visibleExams = supervisorClasses
      ? exams.filter((exam) =>
          supervisorClasses.some(
            (cls) => cls.standard === exam.standard && (!exam.section || cls.section === exam.section),
          ),
        )
      : exams;

    if (examId) {
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId: session.schoolId },
        include: {
          subjects: { orderBy: { sortOrder: "asc" } },
          results: {
            include: { student: { include: { schoolClass: true } }, subject: true },
          },
        },
      });
      if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (
        supervisorClasses &&
        !supervisorClasses.some(
          (cls) => cls.standard === exam.standard && (!exam.section || cls.section === exam.section),
        )
      ) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const reportCards = await prisma.reportCard.findMany({
        where: { examId },
        include: { student: { include: { schoolClass: true } } },
        orderBy: [{ rank: "asc" }, { percentage: "desc" }],
      });

      const students = await prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          standard: exam.standard || undefined,
          ...(exam.section ? { section: exam.section } : {}),
          ...(supervisorClasses
            ? { classId: { in: supervisorClasses.map((cls) => cls.id) } }
            : {}),
        },
        orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
        include: { schoolClass: true },
      });

      if (supervisorClasses) {
        const allowed = new Set(supervisorClasses.map((cls) => cls.id));
        exam.results = exam.results.filter((row) => row.student.classId && allowed.has(row.student.classId));
        for (let i = reportCards.length - 1; i >= 0; i--) {
          const classId = reportCards[i]?.student.classId;
          if (!classId || !allowed.has(classId)) reportCards.splice(i, 1);
        }
      }

      let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });
      if (!settings) {
        settings = await prisma.schoolSettings.create({
          data: { schoolId: session.schoolId, schoolName: session.schoolName || "My School" },
        });
      }

      return NextResponse.json({ exam, exams: visibleExams, reportCards, students, settings, template: ANNUAL_RESULT_SUBJECTS });
    }

    const examIds = visibleExams.map((e) => e.id);
    const reportCards = examIds.length
      ? await prisma.reportCard.findMany({
          where: { examId: { in: examIds }, rank: { not: null } },
          include: { student: true },
          orderBy: [{ examId: "desc" }, { rank: "asc" }],
        })
      : [];

    return NextResponse.json({ exams: visibleExams, reportCards, template: ANNUAL_RESULT_SUBJECTS });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    await requireSchoolFeature(session.schoolId, "results");
    const body = await request.json();
    const examRules = await loadSchoolExamRules(session.schoolId);

    if (body.action === "create_session") {
      const { academicYear, standard, section, reopeningDate } = body;
      const existing = await prisma.exam.findFirst({
        where: {
          schoolId: session.schoolId,
          academicYear: academicYear || DEFAULT_ACADEMIC_YEAR,
          standard,
          section: section || null,
          examType: "Annual",
        },
      });
      if (existing) {
        return NextResponse.json(existing);
      }

      const exam = await prisma.exam.create({
        data: {
          schoolId: session.schoolId,
          name: resultSessionName(standard, academicYear || DEFAULT_ACADEMIC_YEAR),
          examType: "Annual",
          academicYear: academicYear || DEFAULT_ACADEMIC_YEAR,
          standard,
          section: section || null,
          term: "Annual",
          maxMarks: 1000,
          passingMarks: 33,
          reopeningDate: reopeningDate || null,
          subjects: {
            create: ANNUAL_RESULT_SUBJECTS.map((s, i) => ({
              name: s.name,
              code: s.nameEn,
              maxMarks: s.maxMarks,
              sortOrder: i,
            })),
          },
        },
        include: { subjects: true },
      });
      return NextResponse.json(exam);
    }

    if (body.action === "save_student") {
      const { examId, studentId, marks, meta, reopeningDate } = body;
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId: session.schoolId },
        include: { subjects: true },
      });
      if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const subjectMap = new Map(exam.subjects.map((s) => [s.id, s]));
      const [person, existingMarks] = await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, schoolId: session.schoolId },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            surname: true,
            firstNameGu: true,
            middleNameGu: true,
            surnameGu: true,
            grNumber: true,
          },
        }),
        prisma.examResult.findMany({ where: { examId, studentId } }),
      ]);
      const beforeBySubject = new Map(existingMarks.map((row) => [row.subjectId, row]));
      const markEdits: { studentId: string; studentLabel: string; line: string }[] = [];
      const studentLabel = person ? studentAuditLabel(person) : "Student";

      for (const m of marks || []) {
        const max = m.maxMarks || subjectMap.get(m.subjectId)?.maxMarks || 100;
        const obtained = Number(m.marksObtained) || 0;
        const achievement = Number(m.achievementMarks) || 0;
        const grace = Number(m.graceMarks) || 0;
        const finalMarks = m.isAbsent ? 0 : obtained + achievement + grace;
        const before = beforeBySubject.get(m.subjectId);
        const line = describeMarkChange(
          subjectMap.get(m.subjectId)?.name || "Subject",
          before
            ? {
                marksObtained: before.marksObtained,
                isAbsent: before.isAbsent,
                graceMarks: before.graceMarks,
                achievementMarks: before.achievementMarks,
              }
            : null,
          {
            marksObtained: obtained,
            isAbsent: Boolean(m.isAbsent),
            graceMarks: grace,
            achievementMarks: achievement,
          },
        );
        if (line) markEdits.push({ studentId, studentLabel, line });
        await prisma.examResult.upsert({
          where: {
            examId_subjectId_studentId: { examId, subjectId: m.subjectId, studentId },
          },
          create: {
            examId,
            subjectId: m.subjectId,
            studentId,
            marksObtained: obtained,
            achievementMarks: achievement,
            graceMarks: grace,
            grade: gradeFromPercent((finalMarks / max) * 100, examRules),
            isAbsent: m.isAbsent || false,
          },
          update: {
            marksObtained: obtained,
            achievementMarks: achievement,
            graceMarks: grace,
            grade: gradeFromPercent((finalMarks / max) * 100, examRules),
            isAbsent: m.isAbsent || false,
          },
        });
      }

      if (reopeningDate) {
        await prisma.exam.update({ where: { id: examId }, data: { reopeningDate } });
      }

      const savedResults = await prisma.examResult.findMany({
        where: { examId, studentId },
        include: { subject: true },
      });

      const totals = computeStudentTotals(
        savedResults.map((r) => ({
          marksObtained: r.marksObtained,
          achievementMarks: r.achievementMarks,
          graceMarks: r.graceMarks,
          maxMarks: r.subject.maxMarks,
          isAbsent: r.isAbsent,
        })),
        examRules,
      );

      const existing = await prisma.reportCard.findFirst({ where: { studentId, examId } });
      const rcData = {
        studentId,
        examId,
        academicYear: exam.academicYear,
        standard: exam.standard || "",
        section: exam.section,
        passNumber: meta?.passNumber || null,
        attendancePresent: meta?.attendancePresent != null ? Number(meta.attendancePresent) : null,
        attendanceTotal: meta?.attendanceTotal != null ? Number(meta.attendanceTotal) : null,
        reopeningDate: reopeningDate || exam.reopeningDate || null,
        totalMarks: totals.totalFinal,
        percentage: totals.percentage,
        grade: totals.grade,
        result: computeResultStatus(totals.percentage, totals.totalGrace, examRules),
        isPublished: exam.isPublished,
      };
      if (existing) await prisma.reportCard.update({ where: { id: existing.id }, data: rcData });
      else await prisma.reportCard.create({ data: rcData });

      await logMarkEdits(session, exam.name, markEdits);

      return NextResponse.json({ success: true, totals });
    }

    if (body.action === "unpublish") {
      const exam = await prisma.exam.findFirst({ where: { id: body.examId, schoolId: session.schoolId } });
      if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.exam.update({
        where: { id: body.examId },
        data: { isPublished: false, publishedAt: null },
      });
      await prisma.reportCard.updateMany({
        where: { examId: body.examId },
        data: { isPublished: false, rank: null },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "save_marks") {
      const { examId, marks } = body;
      if (!examId || !Array.isArray(marks) || !marks.length) {
        return NextResponse.json({ error: "examId and marks required" }, { status: 400 });
      }

      await assertExamInSchool(session.schoolId, String(examId));
      await assertStudentsInSchool(
        session.schoolId,
        marks.map((m: { studentId?: string }) => String(m.studentId || "")),
      );
      await assertExamSubjectsInSchool(
        session.schoolId,
        String(examId),
        marks.map((m: { subjectId?: string }) => String(m.subjectId || "")),
      );

      const studentIds = [...new Set(marks.map((m: { studentId?: string }) => String(m.studentId || "")).filter(Boolean))];
      const subjectIds = [...new Set(marks.map((m: { subjectId?: string }) => String(m.subjectId || "")).filter(Boolean))];
      const [examRow, people, existingRows] = await Promise.all([
        prisma.exam.findFirst({
          where: { id: String(examId), schoolId: session.schoolId },
          select: { name: true, subjects: { select: { id: true, name: true } } },
        }),
        prisma.student.findMany({
          where: { schoolId: session.schoolId, id: { in: studentIds } },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            surname: true,
            firstNameGu: true,
            middleNameGu: true,
            surnameGu: true,
            grNumber: true,
          },
        }),
        prisma.examResult.findMany({
          where: { examId: String(examId), studentId: { in: studentIds }, subjectId: { in: subjectIds } },
        }),
      ]);
      const subjectNames = new Map((examRow?.subjects || []).map((s) => [s.id, s.name]));
      const labels = new Map(people.map((person) => [person.id, studentAuditLabel(person)]));
      const beforeByKey = new Map(existingRows.map((row) => [`${row.studentId}:${row.subjectId}`, row]));
      const markEdits: { studentId: string; studentLabel: string; line: string }[] = [];

      for (const m of marks) {
        const max = m.maxMarks || 100;
        const obtained = Number(m.marksObtained) || 0;
        const achievement = Number(m.achievementMarks) || 0;
        const grace = Number(m.graceMarks) || 0;
        const finalMarks = m.isAbsent ? 0 : obtained + achievement + grace;
        const before = beforeByKey.get(`${m.studentId}:${m.subjectId}`);
        const line = describeMarkChange(
          subjectNames.get(m.subjectId) || "Subject",
          before
            ? {
                marksObtained: before.marksObtained,
                isAbsent: before.isAbsent,
                graceMarks: before.graceMarks,
                achievementMarks: before.achievementMarks,
              }
            : null,
          {
            marksObtained: obtained,
            isAbsent: Boolean(m.isAbsent),
            graceMarks: grace,
            achievementMarks: achievement,
          },
        );
        if (line) {
          markEdits.push({
            studentId: String(m.studentId),
            studentLabel: labels.get(String(m.studentId)) || "Student",
            line,
          });
        }
        await prisma.examResult.upsert({
          where: {
            examId_subjectId_studentId: {
              examId,
              subjectId: m.subjectId,
              studentId: m.studentId,
            },
          },
          create: {
            examId,
            subjectId: m.subjectId,
            studentId: m.studentId,
            marksObtained: obtained,
            achievementMarks: achievement,
            graceMarks: grace,
            grade: gradeFromPercent((finalMarks / max) * 100, examRules),
            isAbsent: m.isAbsent || false,
          },
          update: {
            marksObtained: obtained,
            achievementMarks: achievement,
            graceMarks: grace,
            grade: gradeFromPercent((finalMarks / max) * 100, examRules),
            isAbsent: m.isAbsent || false,
          },
        });
      }
      await logMarkEdits(session, examRow?.name || "Exam", markEdits);
      return NextResponse.json({ success: true, count: marks.length });
    }

    if (body.action === "save_meta") {
      const { examId, meta } = body;
      const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId: session.schoolId } });
      if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

      if (body.reopeningDate) {
        await prisma.exam.update({ where: { id: examId }, data: { reopeningDate: body.reopeningDate } });
      }

      for (const m of meta || []) {
        const existing = await prisma.reportCard.findFirst({
          where: { studentId: m.studentId, examId },
        });
        const data = {
          studentId: m.studentId,
          examId,
          academicYear: exam.academicYear,
          standard: exam.standard || "",
          section: exam.section || m.section || null,
          passNumber: m.passNumber || null,
          attendancePresent: m.attendancePresent != null ? Number(m.attendancePresent) : null,
          attendanceTotal: m.attendanceTotal != null ? Number(m.attendanceTotal) : null,
          reopeningDate: body.reopeningDate || exam.reopeningDate || null,
        };
        if (existing) {
          await prisma.reportCard.update({ where: { id: existing.id }, data });
        } else {
          await prisma.reportCard.create({ data });
        }
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === "publish") {
      const exam = await prisma.exam.findFirst({
        where: { id: body.examId, schoolId: session.schoolId },
        include: { subjects: true },
      });
      if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const resultCount = await prisma.examResult.count({ where: { examId: body.examId } });
      if (resultCount === 0) {
        return NextResponse.json({ error: "No marks entered yet. Save student marks before publishing." }, { status: 400 });
      }

      await prisma.exam.update({
        where: { id: body.examId },
        data: { isPublished: true, publishedAt: new Date() },
      });

      const results = await prisma.examResult.findMany({
        where: { examId: body.examId },
        include: { student: true, subject: true },
      });

      const byStudent = new Map<string, typeof results>();
      for (const r of results) {
        const list = byStudent.get(r.studentId) || [];
        list.push(r);
        byStudent.set(r.studentId, list);
      }

      const summaryRows: { studentId: string; percentage: number; totalFinal: number; totalGrace: number; data: Record<string, unknown> }[] = [];

      for (const [studentId, studentResults] of byStudent) {
        const totals = computeStudentTotals(
          studentResults.map((r) => ({
            marksObtained: r.marksObtained,
            achievementMarks: r.achievementMarks,
            graceMarks: r.graceMarks,
            maxMarks: r.subject.maxMarks,
            isAbsent: r.isAbsent,
          })),
          examRules,
        );
        summaryRows.push({
          studentId,
          percentage: totals.percentage,
          totalFinal: totals.totalFinal,
          totalGrace: totals.totalGrace,
          data: {
            totalMarks: totals.totalFinal,
            percentage: totals.percentage,
            grade: totals.grade,
            result: computeResultStatus(totals.percentage, totals.totalGrace, examRules),
          },
        });
      }

      const ranked = assignRanks(summaryRows);

      for (const row of ranked) {
        const existing = await prisma.reportCard.findFirst({
          where: { studentId: row.studentId, examId: body.examId },
        });
        const data = {
          studentId: row.studentId,
          examId: body.examId,
          academicYear: exam.academicYear,
          standard: exam.standard || "",
          section: exam.section,
          rank: row.rank,
          isPublished: true,
          reopeningDate: exam.reopeningDate,
          ...row.data,
        };
        if (existing) {
          await prisma.reportCard.update({ where: { id: existing.id }, data });
        } else {
          await prisma.reportCard.create({ data });
        }
      }

      return NextResponse.json({ success: true, published: ranked.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
