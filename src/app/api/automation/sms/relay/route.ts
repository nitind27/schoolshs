import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractOtpFromSms } from "@/lib/sms-otp";
import { pushOtpToSchool } from "@/lib/sms-inbox-push";

export const dynamic = "force-dynamic";

async function schoolFromToken(token: string) {
  if (!token) return null;
  return prisma.schoolSettings.findFirst({
    where: { smsInboxToken: token },
    select: { schoolId: true, dgOtpMobile: true, schoolName: true },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const settings = await schoolFromToken(token);
  if (!settings?.schoolId) {
    return NextResponse.json({ error: "Invalid link" }, { status: 401 });
  }

  const mobile = settings.dgOtpMobile || "";
  const masked = mobile.length >= 10 ? `${mobile.slice(0, 2)}xxxxx${mobile.slice(-3)}` : null;

  return NextResponse.json({
    schoolName: settings.schoolName,
    mobileMasked: masked,
    connected: Boolean(mobile),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const settings = await schoolFromToken(token);
    if (!settings?.schoolId) {
      return NextResponse.json({ error: "Invalid link" }, { status: 401 });
    }

    const otp = String(body.otp || extractOtpFromSms(String(body.text || "")) || "").trim();
    if (!/^\d{4,8}$/.test(otp)) {
      return NextResponse.json({ error: "Valid OTP required" }, { status: 400 });
    }

    const sender = settings.dgOtpMobile ? `+91${settings.dgOtpMobile}` : "phone-bridge";
    await pushOtpToSchool(
      prisma,
      settings.schoolId,
      otp,
      sender,
      `OTP from phone bridge: ${otp}`
    );

    return NextResponse.json({ ok: true, message: "OTP website par bhej diya" });
  } catch (err) {
    console.error("[sms/relay] POST failed:", err);
    return NextResponse.json({ error: "OTP save nahi hua" }, { status: 500 });
  }
}
