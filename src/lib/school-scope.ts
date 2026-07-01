import { NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function withSchoolAuth<T>(
  handler: (ctx: { schoolId: string }) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const session = await requireSchoolAuth();
    return handler({ schoolId: session.schoolId });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
