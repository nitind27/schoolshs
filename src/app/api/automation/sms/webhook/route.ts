import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractOtpFromSms, isLikelyDgOtpSms } from "@/lib/sms-otp";
import { pushOtpToSchool } from "@/lib/sms-inbox-push";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function parseSmsPayload(request: NextRequest, body: Record<string, unknown>): { sender: string | null; text: string } {
  const q = request.nextUrl.searchParams;
  const text = String(
    body.text ??
      body.body ??
      body.message ??
      body.msg ??
      body.sms ??
      body.content ??
      q.get("text") ??
      q.get("body") ??
      q.get("message") ??
      q.get("msg") ??
      ""
  ).trim();
  const sender = String(body.from ?? body.sender ?? body.phone ?? q.get("from") ?? q.get("sender") ?? "").trim() || null;
  return { sender, text };
}

async function resolveSchoolByToken(token: string) {
  if (!token) return null;
  return prisma.schoolSettings.findFirst({
    where: { smsInboxToken: token },
    select: { schoolId: true },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || request.headers.get("x-sms-token") || "";
  const settings = await resolveSchoolByToken(token);
  if (!settings?.schoolId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { sender, text } = parseSmsPayload(request, {});
  if (!text) {
    return NextResponse.json({ ok: true, message: "Webhook ready — send text/body/message param" });
  }

  return storeSms(settings.schoolId, sender, text);
}

export async function POST(request: NextRequest) {
  try {
    const token =
      request.nextUrl.searchParams.get("token") ||
      request.headers.get("x-sms-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";

    const settings = await resolveSchoolByToken(token);
    if (!settings?.schoolId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      form.forEach((v, k) => {
        body[k] = String(v);
      });
    }

    const { sender, text } = parseSmsPayload(request, body);
    if (!text) {
      return NextResponse.json({ error: "Empty SMS body" }, { status: 400 });
    }

    return storeSms(settings.schoolId, sender, text);
  } catch (error) {
    console.error("SMS webhook error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function storeSms(schoolId: string, sender: string | null, text: string) {
  const otpCode = extractOtpFromSms(text);
  const relevant = isLikelyDgOtpSms(text, sender);

  if (otpCode) {
    await pushOtpToSchool(prisma, schoolId, otpCode, sender, text);
    const msg = await prisma.smsInboxMessage.findFirst({
      where: { schoolId, otpCode },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      ok: true,
      id: msg?.id,
      otpDetected: true,
      otpCode: `${otpCode.slice(0, 2)}****`,
      relevant,
    });
  }

  const msg = await prisma.smsInboxMessage.create({
    data: {
      schoolId,
      sender,
      body: text.slice(0, 2000),
      otpCode: null,
      consumed: false,
    },
  });

  return NextResponse.json({
    ok: true,
    id: msg.id,
    otpDetected: false,
    otpCode: null,
    relevant,
  });
}

export function generateSmsToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
