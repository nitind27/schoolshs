import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { resendStudentFirstLoginOtp } from "@/lib/student-first-login";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await resendStudentFirstLoginOtp(
      String(body.email || "").trim().toLowerCase(),
      String(body.currentPassword || ""),
    );
    return NextResponse.json({
      ok: true,
      message: "A new OTP was sent to the student email.",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Student first-login OTP resend error:", error);
    return NextResponse.json(
      { error: "Unable to send student verification OTP" },
      { status: 500 },
    );
  }
}
