import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/auth-login";
import { AuthError, setSessionCookie } from "@/lib/auth";
import { verifyCaptchaAnswer } from "@/lib/captcha";
import { EmailNotVerifiedError } from "@/lib/email-verification";
import { getRoleHome } from "@/lib/roles";
import { AccountLockedError, loginErrorPayload } from "@/lib/login-security";
import { buildLoginContext } from "@/lib/login-geo";
import type { SessionAction } from "@/lib/user-sessions";

function parseSessionAction(value: unknown): SessionAction | null {
  if (value === "keep_all" || value === "logout_others") return value;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, captchaToken, captchaAnswer } = body;
    const sessionAction = parseSessionAction(body.sessionAction);
    const rememberMe = body.rememberMe === true;

    if (!captchaToken || !captchaAnswer) {
      return NextResponse.json(
        { error: "Security code required", captchaRequired: true },
        { status: 400 },
      );
    }

    if (!verifyCaptchaAnswer(captchaToken, captchaAnswer)) {
      return NextResponse.json(
        { error: "Incorrect security code. Please try again.", captchaInvalid: true },
        { status: 400 },
      );
    }

    const ctx = await buildLoginContext(request, body, "web");
    const result = await authenticateCredentials(email, password, ctx, { sessionAction });

    if (result.kind === "student_setup") {
      return NextResponse.json(
        {
          error:
            "Verify the OTP sent to your student email and choose a new password.",
          studentSetupRequired: true,
          otpSent: result.otpSent,
          user: { name: result.name, email: result.email, role: "student" },
        },
        { status: 403 },
      );
    }

    if (result.kind === "device_choice") {
      return NextResponse.json(
        {
          requiresDeviceChoice: true,
          sessions: result.sessions,
          user: { name: result.name, email: result.email, role: result.role },
        },
        { status: 409 },
      );
    }

    const res = NextResponse.json({
      user: result.session,
      redirect: getRoleHome(result.session.role),
      revokedOthers: result.revokedOthers,
    });
    await setSessionCookie(res, result.session, { rememberMe });
    return res;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error instanceof EmailNotVerifiedError) {
        return NextResponse.json(
          { error: error.message, emailNotVerified: true },
          { status: 403 },
        );
      }
      const payload = loginErrorPayload(error);
      const status = error instanceof AccountLockedError ? 423 : error.status;
      return NextResponse.json(payload, { status });
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
