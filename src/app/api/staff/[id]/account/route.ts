import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, hashPassword, requireSchoolAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/roles";

type RouteParams = { params: Promise<{ id: string }> };

const STAFF_PORTAL_ROLES: UserRole[] = ["teacher", "clerk"];

function pickPortalRole(role: unknown, designation?: string | null): UserRole {
  const r = String(role || "").trim();
  if (STAFF_PORTAL_ROLES.includes(r as UserRole)) return r as UserRole;
  const d = (designation || "").toLowerCase();
  if (d.includes("clerk")) return "clerk";
  return "teacher";
}

/** Get portal login account linked to a staff member */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;

    const staff = await prisma.staff.findFirst({
      where: { id, schoolId: session.schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`.trim(),
      staffEmail: staff.email,
      designation: staff.designation,
      suggestedRole: pickPortalRole(null, staff.designation),
      account: staff.user
        ? {
            id: staff.user.id,
            email: staff.user.email,
            role: staff.user.role,
            isActive: staff.user.isActive,
            lastLoginAt: staff.user.lastLoginAt?.toISOString() || null,
            createdAt: staff.user.createdAt.toISOString(),
          }
        : null,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[staff/account GET]", e);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

/** Create or update staff portal login + optional password reset */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;

    const staff = await prisma.staff.findFirst({
      where: { id, schoolId: session.schoolId },
      include: { user: true },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = pickPortalRole(body.role, staff.designation);
    const password = body.password != null ? String(body.password) : "";
    const isActive = body.isActive !== false;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid login email is required" }, { status: 400 });
    }

    const emailTaken = await prisma.user.findFirst({
      where: {
        email,
        NOT: staff.user ? { id: staff.user.id } : undefined,
      },
      select: { id: true },
    });
    if (emailTaken) {
      return NextResponse.json({ error: "This email is already used by another account" }, { status: 409 });
    }

    if (staff.user) {
      if (password && password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: staff.user.id },
        data: {
          email,
          role,
          name: `${staff.firstName} ${staff.lastName}`.trim(),
          isActive,
          ...(password
            ? {
                passwordHash: hashPassword(password),
                failedLoginCount: 0,
                lockedUntil: null,
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        created: false,
        passwordUpdated: Boolean(password),
        account: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          isActive: updated.isActive,
          lastLoginAt: updated.lastLoginAt?.toISOString() || null,
        },
      });
    }

    // Create new portal account
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password (min 8 characters) is required to create login" },
        { status: 400 },
      );
    }

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name: `${staff.firstName} ${staff.lastName}`.trim(),
        role,
        schoolId: session.schoolId,
        staffId: staff.id,
        isActive,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      created: true,
      passwordUpdated: true,
      account: {
        id: created.id,
        email: created.email,
        role: created.role,
        isActive: created.isActive,
        lastLoginAt: null,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[staff/account PUT]", e);
    return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
  }
}
