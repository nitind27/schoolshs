import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { completeStudentFirstLogin } from "@/lib/student-first-login";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await completeStudentFirstLogin({
      email: String(body.email || "").trim().toLowerCase(),
      currentPassword: String(body.currentPassword || ""),
      otp: String(body.otp || ""),
      newPassword: String(body.newPassword || ""),
      confirmPassword: String(body.confirmPassword || ""),
    });
    return NextResponse.json({
      ok: true,
      email: result.email,
      message:
        "Email verified and password changed. Sign in with your new password.",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.warn(
        `[student-first-login] rejected (${error.status}): ${error.message}`,
      );
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Student first-login setup error:", error);
    return NextResponse.json(
      { error: "Unable to complete student account setup" },
      { status: 500 },
    );
  }
}
