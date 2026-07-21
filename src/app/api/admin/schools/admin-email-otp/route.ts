import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import {
  getEmailVerificationRequired,
  sendPendingAdminEmailOtp,
  verifyPendingAdminEmailOtp,
  isPendingAdminEmailVerified,
} from "@/lib/pending-admin-email-otp";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() || "";
    const required = await getEmailVerificationRequired();

    if (!email) {
      return NextResponse.json({ required, verified: false });
    }

    const verified = required ? await isPendingAdminEmailVerified(email) : true;
    return NextResponse.json({ required, verified });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "send") {
      const result = await sendPendingAdminEmailOtp({
        email: String(body.email || ""),
        adminName: String(body.adminName || ""),
        schoolName: body.schoolName ? String(body.schoolName) : undefined,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: "OTP sent to admin email. Check inbox." });
    }

    if (action === "verify") {
      const result = await verifyPendingAdminEmailOtp(
        String(body.email || ""),
        String(body.otp || ""),
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, verified: true, message: "Email verified successfully." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Admin email OTP error:", e);
    const message =
      e instanceof Error && e.message
        ? e.message
        : "Failed to process OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
