import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { calculateGrade } from "@/lib/accounting";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher"]);
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get("standard");
    const examId = searchParams.get("examId");

    const exams = await prisma.exam.findMany({
      where: { schoolId: session.schoolId, ...(standard ? { standard } : {}) },
      include: { subjects: true, _count: { select: { results: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (examId) {
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId: session.schoolId },
        include: {
          subjects: { orderBy: { sortOrder: "asc" } },
          results: { include: { student: true, subject: true } },
        },
      });
      return NextResponse.json({ exam, exams });
    }

    return NextResponse.json({ exams });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher"]);
    const body = await request.json();

    if (body.action === "create_exam") {
      const exam = await prisma.exam.create({
        data: {
          schoolId: session.schoolId,
          name: body.name,
          examType: body.examType,
          academicYear: body.academicYear || "2025-26",
          standard: body.standard,
          term: body.term,
          maxMarks: body.maxMarks || 100,
          passingMarks: body.passingMarks || 33,
          examDate: body.examDate ? new Date(body.examDate) : null,
          subjects: {
            create: (body.subjects || []).map((s: { name: string; code?: string; maxMarks?: number }, i: number) => ({
              name: s.name,
              code: s.code,
              maxMarks: s.maxMarks || 100,
              sortOrder: i,
            })),
          },
        },
        include: { subjects: true },
      });
      return NextResponse.json(exam);
    }

    if (body.action === "save_marks") {
      const { examId, marks } = body;
      for (const m of marks) {
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
            marksObtained: m.marksObtained,
            grade: calculateGrade((m.marksObtained / (m.maxMarks || 100)) * 100),
            isAbsent: m.isAbsent || false,
          },
          update: {
            marksObtained: m.marksObtained,
            grade: calculateGrade((m.marksObtained / (m.maxMarks || 100)) * 100),
            isAbsent: m.isAbsent || false,
          },
        });
      }
      return NextResponse.json({ success: true, count: marks.length });
    }

    if (body.action === "publish") {
      const exam = await prisma.exam.update({
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

      for (const [studentId, studentResults] of byStudent) {
        const total = studentResults.reduce((s, r) => s + r.marksObtained, 0);
        const max = studentResults.reduce((s, r) => s + r.subject.maxMarks, 0);
        const pct = max > 0 ? (total / max) * 100 : 0;
        const existing = await prisma.reportCard.findFirst({
          where: { studentId, examId: body.examId },
        });
        const data = {
          studentId,
          examId: body.examId,
          academicYear: exam.academicYear,
          standard: exam.standard || "",
          totalMarks: total,
          percentage: pct,
          grade: calculateGrade(pct),
          result: pct >= exam.passingMarks ? "Pass" : "Fail",
          isPublished: true,
        };
        if (existing) {
          await prisma.reportCard.update({ where: { id: existing.id }, data });
        } else {
          await prisma.reportCard.create({ data });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
