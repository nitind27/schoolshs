import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSecret } from "@/lib/env-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    getAuthSecret();
    checks.authSecret = "ok";
  } catch (e) {
    checks.authSecret = e instanceof Error ? e.message : "missing";
  }

  try {
    const count = await prisma.user.count();
    checks.database = `ok (${count} users)`;
  } catch (e) {
    checks.database = e instanceof Error ? e.message : "failed";
  }

  const ok = checks.authSecret === "ok" && checks.database.startsWith("ok");

  return NextResponse.json(
    { ok, checks, hint: ok ? "Login should work" : "Fix Vercel env vars or run prisma db push on Hostinger" },
    { status: ok ? 200 : 503 }
  );
}
