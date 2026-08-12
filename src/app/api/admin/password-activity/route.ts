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
    const take = Math.min(300, Math.max(1, Number(sp.get("limit") || 150) || 150));

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

    const [users, events, totalUsers, totalEvents, changed24h] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        orderBy: [{ passwordChangedAt: "desc" }, { updatedAt: "desc" }],
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
        },
      }),
      prisma.passwordChangeEvent.findMany({
        where: eventWhere,
        orderBy: { createdAt: "desc" },
        take,
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
    ]);

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
