import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudentAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireStudentAuth();

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
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
      },
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({ student });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
