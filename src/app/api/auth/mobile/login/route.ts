import { NextRequest } from "next/server";
import { authenticateCredentials } from "@/lib/auth-login";
import { AuthError, createAuthToken } from "@/lib/auth";
import { verifyCaptchaAnswer } from "@/lib/captcha";
import { parseLoginPayload } from "@/lib/parse-login-body";
import { isMobileRole, mobileJson, mobileOptions } from "@/lib/mobile-api";
import {
  AccountLockedError,
  getClientIp,
  loginErrorPayload,
} from "@/lib/login-security";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const { email, password, captchaToken, captchaAnswer } = await parseLoginPayload(request);

    if (!captchaToken || !captchaAnswer) {
      return mobileJson(
        { error: "Security code required", captchaRequired: true },
        { status: 400 },
        origin,
      );
    }

    if (!verifyCaptchaAnswer(captchaToken, captchaAnswer)) {
      return mobileJson(
        { error: "Incorrect security code", captchaInvalid: true },
        { status: 400 },
        origin,
      );
    }

    const ip = getClientIp(request);
    const sessionUser = await authenticateCredentials(email, password, ip);

    if (!isMobileRole(sessionUser.role)) {
      return mobileJson(
        { error: "Mobile app supports Teacher and Student login only" },
        { status: 403 },
        origin,
      );
    }

    const token = await createAuthToken(sessionUser);

    return mobileJson(
      {
        user: sessionUser,
        token,
        expiresIn: 7 * 24 * 60 * 60,
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      const payload = loginErrorPayload(error);
      const status = error instanceof AccountLockedError ? 423 : error.status;
      return mobileJson(payload, { status }, origin);
    }
    console.error("Mobile login error:", error);
    return mobileJson({ error: "Login failed" }, { status: 500 }, origin);
  }
}
