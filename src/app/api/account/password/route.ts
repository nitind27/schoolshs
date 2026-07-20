import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  AuthError,
  hashPassword,
  requireSchoolAuth,
  verifyPassword,
} from "@/lib/auth";

/** School admin changes their own password */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.userId, schoolId: session.schoolId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[account/password]", e);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
