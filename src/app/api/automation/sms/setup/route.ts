import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

function generateSmsToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });

    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { schoolId: session.schoolId, schoolName: session.schoolName || "My School" },
      });
    }

    if (!settings.smsInboxToken) {
      settings = await prisma.schoolSettings.update({
        where: { schoolId: session.schoolId },
        data: { smsInboxToken: generateSmsToken() },
      });
    }

    const origin = request.nextUrl.origin;
    const token = settings.smsInboxToken!;
    const webhookUrl = `${origin}/api/automation/sms/webhook?token=${token}`;
    const phoneBridgeUrl = `${origin}/m/sms-bridge?token=${token}`;
    const mobile = settings.dgOtpMobile || "";

    return NextResponse.json({
      connected: Boolean(mobile),
      dgOtpMobile: mobile,
      mobileMasked: mobile.length >= 10 ? `${mobile.slice(0, 2)}xxxxx${mobile.slice(-3)}` : null,
      webhookUrl,
      phoneBridgeUrl,
      tokenPreview: `${token.slice(0, 8)}...`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireSchoolAuth();
    const token = generateSmsToken();

    await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || "My School",
        smsInboxToken: token,
      },
      update: { smsInboxToken: token },
    });

    return NextResponse.json({ success: true, message: "New SMS token generated — phone app me update karein" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
