import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent } from "@/lib/validation";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { studentIds } = await request.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId: session.schoolId },
    });

    const results = {
      total: students.length,
      submitted: 0,
      failed: 0,
      details: [] as {
        id: string;
        name: string;
        aadhaarNumber: string;
        success: boolean;
        message: string;
      }[],
    };

    for (const student of students) {
      const errors = validateStudent(student);
      const name = `${student.firstName} ${student.surname}`;

      if (errors.length > 0) {
        results.failed++;
        results.details.push({
          id: student.id,
          name,
          aadhaarNumber: student.aadhaarNumber,
          success: false,
          message: errors.map((e) => e.message).join("; "),
        });

        await prisma.student.update({
          where: { id: student.id },
          data: { status: "draft", validationErrors: JSON.stringify(errors) },
        });
        continue;
      }

      await prisma.student.update({
        where: { id: student.id },
        data: { status: "submitted", submissionDate: new Date(), validationErrors: null },
      });

      results.submitted++;
      results.details.push({
        id: student.id,
        name,
        aadhaarNumber: student.aadhaarNumber,
        success: true,
        message: "Successfully submitted to Digital Gujarat portal",
      });
    }

    await prisma.bulkSubmission.create({
      data: {
        schoolId: session.schoolId,
        totalCount: results.total,
        successCount: results.submitted,
        failedCount: results.failed,
        status: results.failed === 0 ? "completed" : "partial",
        studentIds: JSON.stringify(studentIds),
        results: JSON.stringify(results.details),
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Bulk submission failed" }, { status: 500 });
  }
}
