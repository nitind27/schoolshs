import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const session = await getSession();
  if (!session) {
    return mobileJson({ user: null }, { status: 401 }, origin);
  }
  return mobileJson({ user: session }, undefined, origin);
}
