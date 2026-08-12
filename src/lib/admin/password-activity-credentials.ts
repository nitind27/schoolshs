import { prisma } from "@/lib/db";
import {
  buildMemberCredentialsPdf,
  type MemberCredentialPdfRow,
} from "@/lib/admin/member-credentials-pdf";
import { decryptUserPassword } from "@/lib/user-password";

const PORTAL_ROLES = ["school_admin", "teacher", "clerk", "ca"] as const;

export const ROLE_LABEL: Record<string, string> = {
  school_admin: "School Administrator",
  teacher: "Teacher",
  clerk: "Clerk",
  ca: "Chartered Accountant",
};

function memberName(first: string, last: string) {
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

export function safeCredentialsFilenamePart(v: string) {
  return v.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "member";
}

export async function loadMembersForCredentialsPdf(opts: {
  loginUrl: string;
  userId?: string;
  staffId?: string;
  schoolId?: string;
  role?: string;
  q?: string;
}): Promise<MemberCredentialPdfRow[]> {
  const { loginUrl } = opts;

  if (opts.userId) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: {
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordEnc: true,
        staff: {
          select: {
            designation: true,
            employeeId: true,
            mobileNumber: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
            settings: { select: { schoolName: true, logoPath: true } },
          },
        },
      },
    });
    if (!user || !(PORTAL_ROLES as readonly string[]).includes(user.role)) return [];
    const password = decryptUserPassword(user.passwordEnc);
    if (!password) return [];
    return [
      {
        name: user.name,
        email: user.email,
        password,
        role: user.role,
        roleLabel: ROLE_LABEL[user.role] || user.role,
        designation:
          user.staff?.designation ||
          (user.role === "school_admin" ? "School Administrator" : null),
        employeeId: user.staff?.employeeId ?? null,
        mobileNumber: user.staff?.mobileNumber ?? null,
        isActive: user.isActive,
        schoolName: user.school?.settings?.schoolName || user.school?.name || "School",
        schoolCode: user.school?.code || "-",
        schoolLogoPath: user.school?.settings?.logoPath ?? null,
        loginUrl,
      },
    ];
  }

  if (opts.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: opts.staffId },
      select: {
        firstName: true,
        lastName: true,
        designation: true,
        employeeId: true,
        mobileNumber: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            isActive: true,
            passwordEnc: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
            settings: { select: { schoolName: true, logoPath: true } },
          },
        },
      },
    });
    if (!staff?.user) return [];
    const password = decryptUserPassword(staff.user.passwordEnc);
    if (!password) return [];
    const role = staff.user.role;
    if (!(PORTAL_ROLES as readonly string[]).includes(role)) return [];
    return [
      {
        name: staff.user.name || memberName(staff.firstName, staff.lastName),
        email: staff.user.email,
        password,
        role,
        roleLabel: ROLE_LABEL[role] || role,
        designation: staff.designation,
        employeeId: staff.employeeId,
        mobileNumber: staff.mobileNumber,
        isActive: staff.user.isActive,
        schoolName: staff.school?.settings?.schoolName || staff.school?.name || "School",
        schoolCode: staff.school?.code || "-",
        schoolLogoPath: staff.school?.settings?.logoPath ?? null,
        loginUrl,
      },
    ];
  }

  const schoolId = opts.schoolId?.trim() || "";
  const role = opts.role?.trim() || "all";
  const q = opts.q?.trim().toLowerCase() || "";
  const filter =
    role === "no_login"
      ? "no_login"
      : role && (PORTAL_ROLES as readonly string[]).includes(role)
        ? role
        : "all";

  const staffWhere = schoolId ? { schoolId } : undefined;
  const adminWhere = schoolId
    ? { role: "school_admin" as const, staffId: null, schoolId }
    : { role: "school_admin" as const, staffId: null };

  const [staffRows, adminOnly] = await Promise.all([
    prisma.staff.findMany({
      where: staffWhere,
      orderBy: [{ school: { name: "asc" } }, { firstName: "asc" }, { lastName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        designation: true,
        employeeId: true,
        mobileNumber: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            isActive: true,
            passwordEnc: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
            settings: { select: { schoolName: true, logoPath: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: adminWhere,
      orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
      select: {
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordEnc: true,
        school: {
          select: {
            name: true,
            code: true,
            settings: { select: { schoolName: true, logoPath: true } },
          },
        },
      },
    }),
  ]);

  type Row = MemberCredentialPdfRow & { roleKey: string | null; searchHay: string };
  const rows: Row[] = [];

  for (const s of staffRows) {
    const u = s.user;
    if (!u) continue;
    const password = decryptUserPassword(u.passwordEnc);
    if (!password) continue;
    if (!(PORTAL_ROLES as readonly string[]).includes(u.role)) continue;
    const name = u.name || memberName(s.firstName, s.lastName);
    rows.push({
      name,
      email: u.email,
      password,
      role: u.role,
      roleKey: u.role,
      roleLabel: ROLE_LABEL[u.role] || u.role,
      designation: s.designation,
      employeeId: s.employeeId,
      mobileNumber: s.mobileNumber,
      isActive: u.isActive,
      schoolName: s.school?.settings?.schoolName || s.school?.name || "School",
      schoolCode: s.school?.code || "-",
      schoolLogoPath: s.school?.settings?.logoPath ?? null,
      loginUrl,
      searchHay: [
        name,
        u.email,
        s.designation,
        s.employeeId,
        s.mobileNumber,
        s.school?.name,
        s.school?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const u of adminOnly) {
    const password = decryptUserPassword(u.passwordEnc);
    if (!password) continue;
    rows.push({
      name: u.name,
      email: u.email,
      password,
      role: u.role,
      roleKey: u.role,
      roleLabel: ROLE_LABEL[u.role] || u.role,
      designation: "School Administrator",
      employeeId: null,
      mobileNumber: null,
      isActive: u.isActive,
      schoolName: u.school?.settings?.schoolName || u.school?.name || "School",
      schoolCode: u.school?.code || "-",
      schoolLogoPath: u.school?.settings?.logoPath ?? null,
      loginUrl,
      searchHay: [u.name, u.email, u.school?.name, u.school?.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    });
  }

  let filtered = rows;
  if (filter !== "all" && filter !== "no_login") {
    filtered = rows.filter((r) => r.roleKey === filter);
  }
  if (q) {
    filtered = filtered.filter((r) => r.searchHay.includes(q));
  }

  return filtered.map(({ searchHay: _s, roleKey: _r, ...rest }) => rest);
}

export async function buildSingleMemberCredentialsPdfBuffer(
  member: MemberCredentialPdfRow,
): Promise<Uint8Array> {
  return buildMemberCredentialsPdf({
    members: [member],
    generatedAt: new Date(),
  });
}

export function credentialsPdfFilename(member: MemberCredentialPdfRow): string {
  return `Codeat-Credentials-${safeCredentialsFilenamePart(member.name)}.pdf`;
}
