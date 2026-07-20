import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/lib/captcha";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";
import { NextRequest } from "next/server";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const challenge = createCaptchaChallenge();
  return mobileJson(challenge, undefined, origin);
}
