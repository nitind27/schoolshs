import { NextResponse } from "next/server";

/** Legacy link verification — replaced by OTP. */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Link verification is no longer used. Enter the 6-digit OTP from your email on the login page.",
    },
    { status: 400 },
  );
}
