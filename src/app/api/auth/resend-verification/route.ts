import { NextRequest, NextResponse } from "next/server";
import {
  getRequestOriginFromHeaders,
  resendVerificationForCredentials,
} from "@/lib/email-verification";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "");
    const password = String(body.password || "");
    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);

    const result = await resendVerificationForCredentials(email, password, origin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Verification OTP sent. Check your inbox." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
