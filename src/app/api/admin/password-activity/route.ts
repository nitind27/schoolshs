import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { decryptUserPassword } from "@/lib/user-password";

const PORTAL_ROLES = ["school_admin", "teacher", "clerk", "ca"] as const;

function memberName(first: string, last: string) {
  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

/** All school members: every staff row + school admins without staff link */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim().toLowerCase();
    const role = (sp.get("role") || "").trim();
    const schoolId = (sp.get("schoolId") || "").trim();
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

    const [staffRows, adminOnly, schoolOptions, events, totalEvents, changed24h, staffTotal] =
      await Promise.all([
        prisma.staff.findMany({
          where: staffWhere,
          orderBy: [{ school: { name: "asc" } }, { firstName: "asc" }, { lastName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            employeeId: true,
            isActive: true,
            mobileNumber: true,
            schoolId: true,
            school: { select: { id: true, name: true, code: true } },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                passwordEnc: true,
                passwordChangedAt: true,
                lastLoginAt: true,
              },
            },
          },
        }),
        prisma.user.findMany({
          where: adminWhere,
          orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            passwordEnc: true,
            passwordChangedAt: true,
            lastLoginAt: true,
            school: { select: { id: true, name: true, code: true } },
          },
        }),
        prisma.school.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            _count: { select: { staff: true } },
          },
        }),
        prisma.passwordChangeEvent.findMany({
          where: {
            role: { in: [...PORTAL_ROLES] },
            ...(schoolId ? { schoolId } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 300,
          include: {
            user: {
              select: {
                id: true,
                school: { select: { id: true, name: true, code: true } },
              },
            },
          },
        }),
        prisma.passwordChangeEvent.count({
          where: {
            role: { in: [...PORTAL_ROLES] },
            ...(schoolId ? { schoolId } : {}),
          },
        }),
        prisma.passwordChangeEvent.count({
          where: {
            role: { in: [...PORTAL_ROLES] },
            ...(schoolId ? { schoolId } : {}),
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.staff.count({
          ...(schoolId ? { where: { schoolId } } : {}),
        }),
      ]);

    type Member = {
      key: string;
      staffId: string | null;
      userId: string | null;
      name: string;
      email: string | null;
      role: string | null;
      designation: string | null;
      employeeId: string | null;
      mobileNumber: string | null;
      isActive: boolean;
      hasPortalLogin: boolean;
      currentPassword: string | null;
      passwordChangedAt: string | null;
      lastLoginAt: string | null;
      school: { id: string; name: string; code: string } | null;
    };

    const members: Member[] = [];

    for (const s of staffRows) {
      const u = s.user;
      members.push({
        key: u ? `user:${u.id}` : `staff:${s.id}`,
        staffId: s.id,
        userId: u?.id ?? null,
        name: memberName(s.firstName, s.lastName),
        email: u?.email || s.email || null,
        role: u?.role ?? null,
        designation: s.designation || null,
        employeeId: s.employeeId || null,
        mobileNumber: s.mobileNumber || null,
        isActive: u ? u.isActive : s.isActive,
        hasPortalLogin: Boolean(u),
        currentPassword: u ? decryptUserPassword(u.passwordEnc) : null,
        passwordChangedAt: u?.passwordChangedAt?.toISOString() ?? null,
        lastLoginAt: u?.lastLoginAt?.toISOString() ?? null,
        school: s.school,
      });
    }

    for (const u of adminOnly) {
      members.push({
        key: `user:${u.id}`,
        staffId: null,
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        designation: "School Administrator",
        employeeId: null,
        mobileNumber: null,
        isActive: u.isActive,
        hasPortalLogin: true,
        currentPassword: decryptUserPassword(u.passwordEnc),
        passwordChangedAt: u.passwordChangedAt?.toISOString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        school: u.school,
      });
    }

    let filtered = members;
    if (filter === "no_login") {
      filtered = members.filter((m) => !m.hasPortalLogin);
    } else if (filter !== "all") {
      filtered = members.filter((m) => m.role === filter);
    }

    if (q) {
      filtered = filtered.filter((m) => {
        const hay = [
          m.name,
          m.email,
          m.designation,
          m.employeeId,
          m.mobileNumber,
          m.role,
          m.school?.name,
          m.school?.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const byRole: Record<string, number> = {
      school_admin: 0,
      teacher: 0,
      clerk: 0,
      ca: 0,
      no_login: 0,
    };
    for (const m of members) {
      if (!m.hasPortalLogin) byRole.no_login += 1;
      else if (m.role && m.role in byRole) byRole[m.role] += 1;
    }

    const schools = schoolOptions.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      isActive: s.isActive,
      staffCount: s._count.staff,
    }));

    return NextResponse.json({
      members: filtered,
      totalMembers: members.length,
      staffTotal,
      shown: filtered.length,
      staffCount: staffRows.length,
      withLogin: members.filter((m) => m.hasPortalLogin).length,
      withoutLogin: members.filter((m) => !m.hasPortalLogin).length,
      byRole,
      schools,
      schoolId: schoolId || null,
      totalEvents,
      changed24h,
      roles: PORTAL_ROLES,
      events: events.map((e) => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        email: e.email,
        name: e.name,
        role: e.role,
        source: e.source,
        actorName: e.actorName,
        actorRole: e.actorRole,
        passwordAtChange: decryptUserPassword(e.passwordEnc),
        school: e.user?.school ?? null,
        userId: e.userId,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password-activity]", e);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
