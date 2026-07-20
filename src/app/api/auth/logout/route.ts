import { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const res = mobileJson({ success: true }, undefined, origin);
  clearSessionCookie(res);
  return res;
}
