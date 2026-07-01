import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSchoolAuth();

    const messages = await prisma.smsInboxMessage.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const latestOtp = await prisma.smsInboxMessage.findFirst({
      where: { schoolId: session.schoolId, otpCode: { not: null }, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: session.schoolId },
      select: { smsInboxToken: true },
    });

    return NextResponse.json({
      connected: Boolean(settings?.smsInboxToken),
      latestOtp: latestOtp
        ? { code: latestOtp.otpCode, at: latestOtp.createdAt, consumed: latestOtp.consumed }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        otpCode: m.otpCode,
        consumed: m.consumed,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
