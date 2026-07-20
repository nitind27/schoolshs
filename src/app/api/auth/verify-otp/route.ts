import { NextRequest, NextResponse } from "next/server";
import { verifyEmailByOtp } from "@/lib/email-verification";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "");
    const otp = String(body.otp || "");
    const password = String(body.password || "");

    const result = await verifyEmailByOtp(email, otp, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, email: result.email, message: "Email verified successfully. You can sign in now." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
