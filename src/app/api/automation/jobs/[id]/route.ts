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

    let resolvedJob = job;
    const staleMinutes = Number.parseInt(process.env.AUTOMATION_STALE_MINUTES || "20", 10);
    const staleMs = Number.isNaN(staleMinutes) ? 20 * 60 * 1000 : staleMinutes * 60 * 1000;
    const maxRunMinutes = Number.parseInt(process.env.AUTOMATION_MAX_RUN_MINUTES || "25", 10);
    const maxRunMs = Number.isNaN(maxRunMinutes) ? 25 * 60 * 1000 : maxRunMinutes * 60 * 1000;
    const isActive = ["pending", "running"].includes(job.status);
    const isStale = Date.now() - new Date(job.updatedAt).getTime() > staleMs;
    const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
    const runningTooLong = isActive && startedAt !== null && Date.now() - startedAt > maxRunMs;

    if (isActive && (isStale || runningTooLong)) {
      const reason = runningTooLong
        ? `Automation exceeded ${Math.round(maxRunMs / 60000)} minutes (likely stuck at login/CAPTCHA on VPS)`
        : `Automation worker seems stopped (no updates for ${Math.round(staleMs / 60000)} minutes)`;
      const staleMessage = `${reason}. Please restart job.`;
      resolvedJob = await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          currentStep: "Worker stopped",
          errorMessage: staleMessage,
          finishedAt: new Date(),
          logs: `${job.logs || ""}\n[${new Date().toLocaleTimeString("en-IN")}] ${staleMessage}`.trim(),
        },
      });
    }

    let studentProgress = [];
    try {
      studentProgress = resolvedJob.studentProgress ? JSON.parse(resolvedJob.studentProgress) : [];
    } catch {
      studentProgress = [];
    }

    const overallPercent =
      resolvedJob.totalCount > 0
        ? Math.round(((resolvedJob.completedCount + resolvedJob.failedCount) / resolvedJob.totalCount) * 100)
        : 0;

    return NextResponse.json({
      job: {
        ...resolvedJob,
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
