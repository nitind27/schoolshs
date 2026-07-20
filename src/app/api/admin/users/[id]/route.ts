import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashPassword, AuthError } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const body = await request.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "school_admin") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const data: { name?: string; email?: string; schoolId?: string; isActive?: boolean; passwordHash?: string } = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.schoolId !== undefined) {
      const school = await prisma.school.findUnique({ where: { id: body.schoolId } });
      if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
      data.schoolId = school.id;
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      const dup = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (dup) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      data.email = email;
    }
    if (body.password) {
      if (String(body.password).length < 8) {
        return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
      }
      data.passwordHash = hashPassword(String(body.password));
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { school: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      isActive: updated.isActive,
      emailVerified: updated.emailVerified,
      school: updated.school,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "school_admin") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.voucher.updateMany({ where: { createdById: id }, data: { createdById: null } });
      await tx.auditAction.updateMany({ where: { userId: id }, data: { userId: null } });
      await tx.financialYear.updateMany({ where: { submittedById: id }, data: { submittedById: null } });
      await tx.caSchoolAssignment.deleteMany({ where: { userId: id } });
      await tx.chatParticipant.deleteMany({ where: { userId: id } });
      await tx.chatMessage.deleteMany({ where: { senderId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("Delete admin error:", e);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}
