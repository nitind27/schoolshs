import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import { sendMemberCredentialsEmail } from "@/lib/member-credentials-email";
import { pickStaffPortalRole } from "@/lib/staff-portal";
import {
  decryptUserPassword,
  generatePortalPassword,
  passwordRecord,
  recordPasswordChange,
} from "@/lib/user-password";

const ALLOWED = new Set(["school_admin", "teacher", "clerk", "ca"]);

type ResolvedMember = {
  userId: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
  designation: string | null;
  schoolName: string;
  schoolCode: string | null;
  passwordEnc: string | null;
  createdNewUser?: boolean;
};

async function resolveOrCreateMember(body: {
  userId?: string | null;
  staffId?: string | null;
  password: string;
}): Promise<{ member?: ResolvedMember; error?: string; status?: number }> {
  const userId = body.userId ? String(body.userId) : "";
  const staffId = body.staffId ? String(body.staffId) : "";

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
        passwordEnc: true,
        staff: { select: { designation: true } },
        school: {
          select: {
            name: true,
            code: true,
            settings: { select: { schoolName: true } },
          },
        },
      },
    });
    if (!user || !ALLOWED.has(user.role)) {
      return { error: "Member not found", status: 404 };
    }
    return {
      member: {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        designation: user.staff?.designation || null,
        schoolName: user.school?.settings?.schoolName || user.school?.name || "Your School",
        schoolCode: user.school?.code || null,
        passwordEnc: user.passwordEnc,
      },
    };
  }

  if (!staffId) {
    return { error: "userId or staffId required", status: 400 };
  }

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          schoolId: true,
          passwordEnc: true,
        },
      },
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          settings: { select: { schoolName: true } },
        },
      },
    },
  });
  if (!staff) return { error: "Staff member not found", status: 404 };

  const schoolName = staff.school?.settings?.schoolName || staff.school?.name || "Your School";
  const schoolCode = staff.school?.code || null;
  const name = `${staff.firstName} ${staff.lastName}`.replace(/\s+/g, " ").trim();
  const email = (staff.user?.email || staff.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      error: "Staff has no email. Add email on staff profile first.",
      status: 400,
    };
  }

  if (staff.user) {
    if (!ALLOWED.has(staff.user.role)) {
      return { error: "Linked account role is not supported", status: 400 };
    }
    return {
      member: {
        userId: staff.user.id,
        email: staff.user.email,
        name: staff.user.name || name,
        role: staff.user.role,
        schoolId: staff.user.schoolId || staff.schoolId,
        designation: staff.designation,
        schoolName,
        schoolCode,
        passwordEnc: staff.user.passwordEnc,
      },
    };
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email },
    select: { id: true, staffId: true },
  });
  if (emailTaken && emailTaken.staffId !== staff.id) {
    return {
      error: `Email ${email} is already used by another account`,
      status: 409,
    };
  }

  const role = pickStaffPortalRole(staff.designation);
  const created = await prisma.user.create({
    data: {
      email,
      name,
      role,
      schoolId: staff.schoolId,
      staffId: staff.id,
      isActive: staff.isActive,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      ...passwordRecord(body.password),
    },
  });

  return {
    member: {
      userId: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      schoolId: created.schoolId,
      designation: staff.designation,
      schoolName,
      schoolCode,
      passwordEnc: created.passwordEnc,
      createdNewUser: true,
    },
  };
}

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

    let regenerated = Boolean(member.createdNewUser) || forceNew || !provisional;
    if (!member.createdNewUser) {
      const current = decryptUserPassword(member.passwordEnc);
      if (forceNew || !current) {
        password = generatePortalPassword();
        regenerated = true;
        await prisma.user.update({
          where: { id: member.userId },
          data: {
            ...passwordRecord(password),
            failedLoginCount: 0,
            lockedUntil: null,
          },
        });
        await recordPasswordChange({
          userId: member.userId,
          email: member.email,
          name: member.name,
          role: member.role,
          schoolId: member.schoolId,
          password,
          source: "admin_reset",
          actorUserId: null,
          actorRole: "super_admin",
          actorName: "Super Admin",
        });
      } else {
        password = current;
        regenerated = false;
      }
    } else {
      await recordPasswordChange({
        userId: member.userId,
        email: member.email,
        name: member.name,
        role: member.role,
        schoolId: member.schoolId,
        password,
        source: "staff_create",
        actorUserId: null,
        actorRole: "super_admin",
        actorName: "Super Admin",
      });
    }

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
