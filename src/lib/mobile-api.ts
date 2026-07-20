import { NextResponse } from "next/server";

export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export const MOBILE_ALLOWED_ROLES = ["teacher", "student"] as const;

export type MobileRole = (typeof MOBILE_ALLOWED_ROLES)[number];

export function isMobileRole(role: string): role is MobileRole {
  return MOBILE_ALLOWED_ROLES.includes(role as MobileRole);
}

export function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "86400",
  };
}

export function mobileJson(
  data: unknown,
  init?: { status?: number; headers?: HeadersInit },
  origin?: string | null,
) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }
  return NextResponse.json(data, { status: init?.status, headers });
}

export function mobileOptions(origin?: string | null) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}
