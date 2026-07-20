import { NextRequest, NextResponse } from "next/server";
import { authenticateCredentials } from "@/lib/auth-login";
import { AuthError, setSessionCookie } from "@/lib/auth";
import { verifyCaptchaAnswer } from "@/lib/captcha";
import { EmailNotVerifiedError } from "@/lib/email-verification";
import { getRoleHome } from "@/lib/roles";
import {
  AccountLockedError,
  getClientIp,
  loginErrorPayload,
} from "@/lib/login-security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, captchaToken, captchaAnswer } = body;

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

    const ip = getClientIp(request);
    const sessionUser = await authenticateCredentials(email, password, ip);

    const res = NextResponse.json({
      user: sessionUser,
      redirect: getRoleHome(sessionUser.role),
    });
    await setSessionCookie(res, sessionUser);
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
