import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { decryptUserPassword } from "@/lib/user-password";

const STAFF_ROLES = ["school_admin", "teacher", "clerk", "ca"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const role = (sp.get("role") || "").trim();
    const take = Math.min(2000, Math.max(1, Number(sp.get("limit") || 1000) || 1000));

    const roleFilter =
      role && (STAFF_ROLES as readonly string[]).includes(role)
        ? role
        : { in: [...STAFF_ROLES] };

    const userWhere: Record<string, unknown> = {
      role: roleFilter,
    };
    if (q) {
      userWhere.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { school: { name: { contains: q } } },
        { school: { code: { contains: q } } },
        { staff: { designation: { contains: q } } },
      ];
    }

    const eventWhere: Record<string, unknown> = {
      role: roleFilter,
    };
    if (q) {
      eventWhere.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { actorName: { contains: q } },
      ];
    }

    const [users, events, totalUsers, totalEvents, changed24h, byRoleRaw] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        orderBy: [{ school: { name: "asc" } }, { role: "asc" }, { name: "asc" }],
        take,
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
          staff: { select: { designation: true, employeeId: true } },
        },
      }),
      prisma.passwordChangeEvent.findMany({
        where: eventWhere,
        orderBy: { createdAt: "desc" },
        take: Math.min(take, 300),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              school: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      prisma.user.count({ where: { role: { in: [...STAFF_ROLES] } } }),
      prisma.passwordChangeEvent.count({
        where: { role: { in: [...STAFF_ROLES] } },
      }),
      prisma.passwordChangeEvent.count({
        where: {
          role: { in: [...STAFF_ROLES] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.user.groupBy({
        by: ["role"],
        where: { role: { in: [...STAFF_ROLES] } },
        _count: { _all: true },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const r of STAFF_ROLES) byRole[r] = 0;
    for (const row of byRoleRaw) byRole[row.role] = row._count._all;

    return NextResponse.json({
      accounts: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        currentPassword: decryptUserPassword(u.passwordEnc),
        passwordChangedAt: u.passwordChangedAt?.toISOString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        school: u.school,
        designation: u.staff?.designation || null,
        employeeId: u.staff?.employeeId || null,
      })),
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
      totalUsers,
      totalEvents,
      changed24h,
      byRole,
      roles: STAFF_ROLES,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password-activity]", e);
    return NextResponse.json({ error: "Failed to load password activity" }, { status: 500 });
  }
}
