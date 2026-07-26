import { NextRequest } from "next/server";
import { authenticateCredentials } from "@/lib/auth-login";
import { AuthError, createAuthToken } from "@/lib/auth";
import { verifyCaptchaAnswer } from "@/lib/captcha";
import { parseLoginPayload } from "@/lib/parse-login-body";
import { isMobileRole, mobileJson, mobileOptions } from "@/lib/mobile-api";
import { AccountLockedError, loginErrorPayload } from "@/lib/login-security";
import { buildLoginContext } from "@/lib/login-geo";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  try {
    const payload = await parseLoginPayload(request);
    const { email, password, captchaToken, captchaAnswer } = payload;

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

    const ctx = await buildLoginContext(
      request,
      {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracyM: payload.accuracyM,
      },
      "mobile",
    );

    // Mobile skips multi-device web gate
    const result = await authenticateCredentials(email, password, ctx, {
      sessionAction: "keep_all",
    });

    if (result.kind !== "ok") {
      return mobileJson({ error: "Login failed" }, { status: 500 }, origin);
    }

    if (!isMobileRole(result.session.role)) {
      return mobileJson(
        { error: "Mobile app supports Teacher and Student login only" },
        { status: 403 },
        origin,
      );
    }

    const token = await createAuthToken(result.session);

    return mobileJson(
      {
        user: result.session,
        token,
        expiresIn: 7 * 24 * 60 * 60,
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      const errPayload = loginErrorPayload(error);
      const status = error instanceof AccountLockedError ? 423 : error.status;
      return mobileJson(errPayload, { status }, origin);
    }
    console.error("Mobile login error:", error);
    return mobileJson({ error: "Login failed" }, { status: 500 }, origin);
  }
}
