import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const { otp } = await request.json();

    const code = String(otp || "").trim();
    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ error: "Valid 4-8 digit OTP required" }, { status: 400 });
    }

    const job = await prisma.automationJob.findFirst({
      where: { id, schoolId: session.schoolId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!["pending", "running"].includes(job.status)) {
      return NextResponse.json({ error: "Job is not active" }, { status: 400 });
    }

    await prisma.automationJob.update({
      where: { id },
      data: { otpCode: code },
    });

    return NextResponse.json({ success: true, message: "OTP sent to automation — auto-fill hoga" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
