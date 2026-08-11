import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { USER_ROLES, isUserRole } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const role = (sp.get("role") || "").trim();
    const source = (sp.get("source") || "").trim();
    const take = Math.min(200, Math.max(1, Number(sp.get("limit") || 80) || 80));

    const where: Record<string, unknown> = {};

    if (role && isUserRole(role)) {
      where.role = role;
    }
    if (source === "web" || source === "mobile") {
      where.source = source;
    }
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { ip: { contains: q } },
        { city: { contains: q } },
        { region: { contains: q } },
        { country: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { school: { name: { contains: q } } } },
        { user: { school: { code: { contains: q } } } },
      ];
    }

    const [events, total, byRoleRaw, last24h] = await Promise.all([
      prisma.loginEvent.findMany({
        where,
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
      prisma.loginEvent.count({ where }),
      prisma.loginEvent.groupBy({
        by: ["role"],
        _count: { _all: true },
        orderBy: { _count: { role: "desc" } },
      }),
      prisma.loginEvent.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const byRole: Record<string, number> = {};
    for (const r of USER_ROLES) byRole[r] = 0;
    for (const row of byRoleRaw) {
      byRole[row.role] = row._count._all;
    }

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        email: e.email,
        role: e.role,
        schoolId: e.schoolId,
        ip: e.ip,
        latitude: e.latitude,
        longitude: e.longitude,
        accuracyM: e.accuracyM,
        userAgent: e.userAgent,
        source: e.source,
        geoSource: e.geoSource,
        city: e.city,
        region: e.region,
        country: e.country,
        user: e.user
          ? {
              id: e.user.id,
              name: e.user.name,
              email: e.user.email,
              role: e.user.role,
              school: e.user.school,
            }
          : null,
      })),
      total,
      last24h,
      byRole,
      roles: USER_ROLES,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[admin login-events]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
