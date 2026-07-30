import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudentAuth, AuthError } from "@/lib/auth";
import { parseExamTermMeta } from "@/lib/results/exam-terms";

export async function GET() {
  try {
    const session = await requireStudentAuth();

    const student = await prisma.student.findFirst({
      where: { id: session.studentId, schoolId: session.schoolId },
      include: {
        schoolClass: true,
        reportCards: {
          where: { isPublished: true },
          orderBy: { createdAt: "desc" },
        },
        examResults: {
          where: { exam: { isPublished: true } },
          include: { exam: true, subject: true },
          orderBy: { createdAt: "desc" },
        },
        examSeatAssignments: {
          where: { isPublished: true },
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                academicYear: true,
                standard: true,
                section: true,
                termMeta: true,
              },
            },
            schoolClass: {
              select: { name: true, standard: true, section: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({
      student: {
        ...student,
        examSeatAssignments: student.examSeatAssignments.map((assignment) => {
          const term = parseExamTermMeta(assignment.exam.termMeta).terms.find(
            (item) => item.key === assignment.termKey,
          );
          return {
            id: assignment.id,
            seatNumber: assignment.seatNumber,
            termKey: assignment.termKey,
            termLabelEn: term?.labelEn || assignment.termKey,
            termLabelGu: term?.labelGu || term?.labelEn || assignment.termKey,
            examDate: term?.examDate || null,
            academicYear: assignment.exam.academicYear,
            className: assignment.schoolClass.name,
            standard: assignment.schoolClass.standard,
            section: assignment.schoolClass.section,
          };
        }),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
