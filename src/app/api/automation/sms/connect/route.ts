import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { buildPhoneBridgeUrl } from "@/lib/env-auth";

function generateSmsToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length >= 10 ? digits.slice(-10) : digits;
  if (ten.length !== 10 || !/^[6-9]/.test(ten)) return null;
  return ten;
}

function bridgeUrl(origin: string, token: string) {
  return buildPhoneBridgeUrl(origin, token);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { mobile } = await request.json();
    const normalized = normalizeMobile(String(mobile || ""));

    if (!normalized) {
      return NextResponse.json({ error: "Valid 10-digit Indian mobile required" }, { status: 400 });
    }

    let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });
    const token = settings?.smsInboxToken || generateSmsToken();

    settings = await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || "My School",
        dgOtpMobile: normalized,
        smsInboxToken: token,
      },
      update: {
        dgOtpMobile: normalized,
        smsInboxToken: settings?.smsInboxToken || token,
      },
    });

    const origin = request.nextUrl.origin;
    const url = bridgeUrl(origin, settings.smsInboxToken!);

    return NextResponse.json({
      success: true,
      mobile: normalized,
      mobileMasked: `${normalized.slice(0, 2)}xxxxx${normalized.slice(-3)}`,
      phoneBridgeUrl: url,
      message: "Phone connected — ab phone par link kholein",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
