import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  AuthError,
  requireAuth,
  verifyPassword,
} from "@/lib/auth";
import { passwordRecord } from "@/lib/user-password";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Super Admin — load own account */
export async function GET() {
  try {
    const session = await requireAuth(["super_admin"]);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginCity: true,
        lastLoginRegion: true,
        lastLoginCountry: true,
        createdAt: true,
        passwordChangedAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin/account GET]", e);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

/**
 * Super Admin updates own name / email / password.
 * Email & password changes require currentPassword.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth(["super_admin"]);
    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
    const emailRaw =
      body.email !== undefined ? String(body.email || "").trim().toLowerCase() : undefined;
    const newPassword = body.newPassword !== undefined ? String(body.newPassword || "") : undefined;
    const confirmPassword = String(body.confirmPassword || "");

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, passwordHash: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const changingEmail = emailRaw !== undefined && emailRaw !== user.email;
    const changingPassword = Boolean(newPassword);
    const changingName = name !== undefined && name !== user.name;

    if (!changingEmail && !changingPassword && !changingName) {
      return NextResponse.json({ error: "No changes to save" }, { status: 400 });
    }

    if (changingEmail || changingPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change email or password" },
          { status: 400 },
        );
      }
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      passwordEnc?: string;
      passwordChangedAt?: Date;
      emailVerified?: boolean;
      emailVerifiedAt?: Date | null;
      failedLoginCount?: number;
      lockedUntil?: Date | null;
    } = {};

    if (changingName) {
      if (!name || name.length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
      }
      data.name = name;
    }

    if (changingEmail) {
      if (!emailRaw || !isValidEmail(emailRaw)) {
        return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
      }
      const taken = await prisma.user.findFirst({
        where: { email: emailRaw, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
      }
      data.email = emailRaw;
      // Super admin owns the platform — mark verified on change
      data.emailVerified = true;
      data.emailVerifiedAt = new Date();
    }

    if (changingPassword) {
      if (newPassword!.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 },
        );
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
      }
      if (verifyPassword(newPassword!, user.passwordHash)) {
        return NextResponse.json(
          { error: "New password must be different from current password" },
          { status: 400 },
        );
      }
      Object.assign(data, passwordRecord(newPassword!));
      data.failedLoginCount = 0;
      data.lockedUntil = null;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        passwordChangedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: changingPassword
        ? "Account updated. Use your new password next login."
        : "Account updated successfully.",
      user: {
        ...updated,
        lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
        passwordChangedAt: updated.passwordChangedAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin/account PATCH]", e);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
