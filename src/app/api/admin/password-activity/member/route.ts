import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import { sendMemberCredentialsEmail } from "@/lib/member-credentials-email";
import {
  ensureMemberPassword,
  resolveOrCreateMember,
} from "@/lib/admin/password-activity-member";
import {
  decryptUserPassword,
  generatePortalPassword,
  passwordRecord,
  recordPasswordChange,
} from "@/lib/user-password";

/** Super Admin — change password (creates portal login for staff if missing) */
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json().catch(() => ({}));

    let password = String(body.password || "").trim();
    const generate = Boolean(body.generate);
    const sendEmail = Boolean(body.sendEmail);
    if (generate || !password) password = generatePortalPassword();
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const resolved = await resolveOrCreateMember({
      userId: body.userId,
      staffId: body.staffId,
      password,
    });
    if (!resolved.member) {
      return NextResponse.json(
        { error: resolved.error || "Member not found" },
        { status: resolved.status || 404 },
      );
    }
    const member = resolved.member;

    if (!member.createdNewUser) {
      await prisma.user.update({
        where: { id: member.userId },
        data: {
          ...passwordRecord(password),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    }

    await recordPasswordChange({
      userId: member.userId,
      email: member.email,
      name: member.name,
      role: member.role,
      schoolId: member.schoolId,
      password,
      source: member.createdNewUser ? "staff_create" : "admin_reset",
      actorUserId: null,
      actorRole: "super_admin",
      actorName: "Super Admin",
    });

    let emailSent = false;
    let emailError: string | undefined;
    if (sendEmail) {
      const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
      const result = await sendMemberCredentialsEmail({
        memberName: member.name,
        schoolName: member.schoolName,
        schoolCode: member.schoolCode,
        loginEmail: member.email,
        password,
        role: member.role,
        designation: member.designation,
        loginUrl: `${origin.replace(/\/$/, "")}/login`,
        note: member.createdNewUser
          ? "A portal login was created for you by Codeat Super Admin."
          : "Your password was updated by Codeat Super Admin.",
      });
      emailSent = result.sent;
      emailError = result.error;
    }

    return NextResponse.json({
      ok: true,
      password,
      emailSent,
      emailError,
      createdNewUser: Boolean(member.createdNewUser),
      user: {
        id: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password member PATCH]", e);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}

/** Super Admin — email credentials (creates login if staff has none) */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json().catch(() => ({}));
    const forceNew = Boolean(body.generateNew);

    // Need a password up-front if we must create a new user
    let provisional = decryptUserPassword(null);
    let password = generatePortalPassword();

    // If user exists, try current password first (unless force new)
    if (body.userId && !body.staffId) {
      const existing = await prisma.user.findUnique({
        where: { id: String(body.userId) },
        select: { passwordEnc: true },
      });
      provisional = decryptUserPassword(existing?.passwordEnc);
      if (!forceNew && provisional) password = provisional;
    } else if (body.staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: String(body.staffId) },
        select: { user: { select: { passwordEnc: true } } },
      });
      provisional = decryptUserPassword(staff?.user?.passwordEnc);
      if (!forceNew && provisional) password = provisional;
    }

    const resolved = await resolveOrCreateMember({
      userId: body.userId,
      staffId: body.staffId,
      password,
    });
    if (!resolved.member) {
      return NextResponse.json(
        { error: resolved.error || "Member not found" },
        { status: resolved.status || 404 },
      );
    }
    const member = resolved.member;

    const ensured = await ensureMemberPassword({ member, forceNew });
    password = ensured.password;
    const regenerated = ensured.regenerated;

    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
    const result = await sendMemberCredentialsEmail({
      memberName: member.name,
      schoolName: member.schoolName,
      schoolCode: member.schoolCode,
      loginEmail: member.email,
      password,
      role: member.role,
      designation: member.designation,
      loginUrl: `${origin.replace(/\/$/, "")}/login`,
      note: member.createdNewUser
        ? "A portal login was created for you. Details are below."
        : regenerated
          ? "A new password was generated and is included below."
          : "Your current portal password is included below.",
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          error: result.error || "Failed to send email",
          password,
          regenerated,
          createdNewUser: Boolean(member.createdNewUser),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      regenerated,
      createdNewUser: Boolean(member.createdNewUser),
      password,
      to: member.email,
      userId: member.userId,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password member POST]", e);
    return NextResponse.json({ error: "Failed to send credentials email" }, { status: 500 });
  }
}
