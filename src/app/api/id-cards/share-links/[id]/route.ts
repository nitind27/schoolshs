import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, hashPassword, requireSchoolAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.idCardShareLink.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.password) {
      const pwd = String(body.password);
      if (pwd.length < 4) return NextResponse.json({ error: "Password too short" }, { status: 400 });
      data.passwordHash = hashPassword(pwd);
    }
    if (body.username) {
      const u = String(body.username).trim();
      if (u.length < 3) return NextResponse.json({ error: "Username too short" }, { status: 400 });
      data.username = u;
    }
    if (body.label !== undefined) data.label = body.label ? String(body.label).trim() : null;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const link = await prisma.idCardShareLink.update({
      where: { id },
      data,
      select: {
        id: true,
        slug: true,
        username: true,
        label: true,
        isActive: true,
        expiresAt: true,
        accessCount: true,
        lastAccessAt: true,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;

    const existing = await prisma.idCardShareLink.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    await prisma.idCardShareLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
