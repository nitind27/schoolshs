import { NextRequest } from "next/server";
import { getSchoolBrandingByCode } from "@/lib/school-branding";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (!code) {
    return mobileJson({ error: "School code required" }, { status: 400 }, origin);
  }

  const branding = await getSchoolBrandingByCode(code);
  if (!branding) {
    return mobileJson({ error: "School not found" }, { status: 404 }, origin);
  }

  return mobileJson({ school: branding }, undefined, origin);
}
