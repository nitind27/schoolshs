import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";

/** Super Admin — list staff for one school (roster modal) */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth(["super_admin"]);
    const { id: schoolId } = await context.params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, code: true },
    });
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const staff = await prisma.staff.findMany({
      where: { schoolId },
      orderBy: [{ designation: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        employeeId: true,
        mobileNumber: true,
        department: true,
        isActive: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      school,
      total: staff.length,
      staff: staff.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.replace(/\s+/g, " ").trim(),
        email: s.user?.email || s.email || null,
        designation: s.designation,
        employeeId: s.employeeId,
        mobileNumber: s.mobileNumber,
        department: s.department,
        isActive: s.isActive,
        hasPortalLogin: Boolean(s.user),
        portalRole: s.user?.role ?? null,
        portalActive: s.user?.isActive ?? null,
        lastLoginAt: s.user?.lastLoginAt?.toISOString() ?? null,
        userId: s.user?.id ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin school staff]", e);
    return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
  }
}
