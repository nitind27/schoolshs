import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;

    const job = await prisma.automationJob.findFirst({
      where: { id, schoolId: session.schoolId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let studentProgress = [];
    try {
      studentProgress = job.studentProgress ? JSON.parse(job.studentProgress) : [];
    } catch {
      studentProgress = [];
    }

    const overallPercent =
      job.totalCount > 0
        ? Math.round(((job.completedCount + job.failedCount) / job.totalCount) * 100)
        : 0;

    return NextResponse.json({
      job: {
        ...job,
        studentProgress,
        overallPercent,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
