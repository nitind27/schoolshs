import { prisma } from "@/lib/db";
import { pickStaffPortalRole } from "@/lib/staff-portal";
import {
  decryptUserPassword,
  generatePortalPassword,
  passwordRecord,
  recordPasswordChange,
} from "@/lib/user-password";

const ALLOWED = new Set(["school_admin", "teacher", "clerk", "ca"]);

export type ResolvedMember = {
  userId: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
  designation: string | null;
  schoolName: string;
  schoolCode: string | null;
  passwordEnc: string | null;
  mobileNumber: string | null;
  createdNewUser?: boolean;
};

export async function resolveOrCreateMember(body: {
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
        staff: { select: { designation: true, mobileNumber: true } },
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
        mobileNumber: user.staff?.mobileNumber ?? null,
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
        mobileNumber: staff.mobileNumber,
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
      mobileNumber: staff.mobileNumber,
      createdNewUser: true,
    },
  };
}

/** Ensure member has a password; optionally regenerate. Returns plaintext password. */
export async function ensureMemberPassword(opts: {
  member: ResolvedMember;
  forceNew: boolean;
}): Promise<{ password: string; regenerated: boolean }> {
  const { member, forceNew } = opts;
  let password = generatePortalPassword();
  let regenerated = Boolean(member.createdNewUser) || forceNew;

  const provisional = decryptUserPassword(member.passwordEnc);
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
    password = decryptUserPassword(member.passwordEnc) || password;
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

  return { password, regenerated };
}
