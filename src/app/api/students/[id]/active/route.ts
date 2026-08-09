import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireStaffAuth } from "@/lib/auth";

/**
 * Activate / deactivate a student.
 * Deactivate → status=archived (hidden from all active lists) + portal login off
 * Activate → restore previousStatus (or ready) + portal login on
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaffAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const active = body.active === true || body.active === "true";
    const deactivate = body.active === false || body.active === "false" || body.deactivate === true;

    if (!active && !deactivate) {
      return NextResponse.json(
        { error: "Send { active: true } or { active: false }" },
        { status: 400 },
      );
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
      select: {
        id: true,
        status: true,
        previousStatus: true,
        firstName: true,
        surname: true,
        user: { select: { id: true, isActive: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (deactivate || !active) {
      if (student.status === "archived") {
        return NextResponse.json({
          ok: true,
          active: false,
          student: { id: student.id, status: "archived" },
          message: "Already deactivated",
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.student.update({
          where: { id },
          data: {
            previousStatus: student.status || "ready",
            status: "archived",
          },
        });
        if (student.user?.id) {
          await tx.user.update({
            where: { id: student.user.id },
            data: { isActive: false },
          });
        }
        return row;
      });

      return NextResponse.json({
        ok: true,
        active: false,
        student: { id: updated.id, status: updated.status, previousStatus: updated.previousStatus },
      });
    }

    // Activate
    const restoreStatus =
      student.status === "archived"
        ? student.previousStatus && student.previousStatus !== "archived"
          ? student.previousStatus
          : "ready"
        : student.status;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.student.update({
        where: { id },
        data: {
          status: restoreStatus,
          previousStatus: null,
        },
      });
      if (student.user?.id) {
        await tx.user.update({
          where: { id: student.user.id },
          data: { isActive: true },
        });
      }
      return row;
    });

    return NextResponse.json({
      ok: true,
      active: true,
      student: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/students/[id]/active", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}
