import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import { sendMemberCredentialsEmail } from "@/lib/member-credentials-email";
import {
  decryptUserPassword,
  generatePortalPassword,
  passwordRecord,
  recordPasswordChange,
} from "@/lib/user-password";

type Params = { params: Promise<{ userId: string }> };

const ALLOWED = new Set(["school_admin", "teacher", "clerk", "ca"]);

async function loadMember(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      passwordEnc: true,
      isActive: true,
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          settings: { select: { schoolName: true } },
        },
      },
      staff: { select: { designation: true, employeeId: true } },
    },
  });
}

/** Super Admin — set / reset password (optional email) */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { userId } = await params;
    const body = await request.json().catch(() => ({}));

    const user = await loadMember(userId);
    if (!user || !ALLOWED.has(user.role)) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let password = String(body.password || "").trim();
    const generate = Boolean(body.generate);
    const sendEmail = Boolean(body.sendEmail);

    if (generate || !password) {
      password = generatePortalPassword();
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...passwordRecord(password),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await recordPasswordChange({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
      password,
      source: "admin_reset",
      actorUserId: null,
      actorRole: "super_admin",
      actorName: "Super Admin",
    });

    let emailSent = false;
    let emailError: string | undefined;
    if (sendEmail) {
      const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
      const schoolName =
        user.school?.settings?.schoolName || user.school?.name || "Your School";
      const result = await sendMemberCredentialsEmail({
        memberName: user.name,
        schoolName,
        schoolCode: user.school?.code,
        loginEmail: user.email,
        password,
        role: user.role,
        designation: user.staff?.designation,
        loginUrl: `${origin.replace(/\/$/, "")}/login`,
        note: "Your password was updated by Codeat Super Admin.",
      });
      emailSent = result.sent;
      emailError = result.error;
    }

    return NextResponse.json({
      ok: true,
      password,
      emailSent,
      emailError,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password PATCH]", e);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}

/** Super Admin — email current (or newly generated) credentials */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { userId } = await params;
    const body = await request.json().catch(() => ({}));
    const forceNew = Boolean(body.generateNew);

    const user = await loadMember(userId);
    if (!user || !ALLOWED.has(user.role)) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    let password = decryptUserPassword(user.passwordEnc);
    let regenerated = false;
    if (forceNew || !password) {
      password = generatePortalPassword();
      regenerated = true;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...passwordRecord(password),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await recordPasswordChange({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        password,
        source: "admin_reset",
        actorUserId: null,
        actorRole: "super_admin",
        actorName: "Super Admin",
      });
    }

    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
    const schoolName =
      user.school?.settings?.schoolName || user.school?.name || "Your School";
    const result = await sendMemberCredentialsEmail({
      memberName: user.name,
      schoolName,
      schoolCode: user.school?.code,
      loginEmail: user.email,
      password,
      role: user.role,
      designation: user.staff?.designation,
      loginUrl: `${origin.replace(/\/$/, "")}/login`,
      note: regenerated
        ? "A new password was generated and is included below."
        : "Your current portal password is included below.",
    });

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error || "Failed to send email", password, regenerated },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      regenerated,
      password,
      to: user.email,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password POST send]", e);
    return NextResponse.json({ error: "Failed to send credentials email" }, { status: 500 });
  }
}
