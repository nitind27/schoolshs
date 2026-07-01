import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const jobs = await prisma.automationJob.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        mode: j.mode,
        actionMode: j.actionMode,
        totalCount: j.totalCount,
        completedCount: j.completedCount,
        failedCount: j.failedCount,
        currentStep: j.currentStep,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        finishedAt: j.finishedAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
