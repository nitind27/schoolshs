import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireStaffAuth } from "@/lib/auth";
import { notifySchoolRoles } from "@/lib/notifications";
import { studentAuditLabel, writeChangeLog } from "@/lib/change-log";
import { assignNextClassRoll, closeClassRollGap } from "@/lib/roll-resequence";

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
    const rollMode = body.rollMode === "blank" ? "blank" : body.rollMode === "shift" ? "shift" : null;

    if (!active && !deactivate) {
      return NextResponse.json(
        { error: "Send { active: true } or { active: false }" },
        { status: 400 },
      );
    }

    if (deactivate && !rollMode) {
      return NextResponse.json(
        { error: "Choose how the class roll should be handled" },
        { status: 400 },
      );
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
      select: {
        id: true,
        status: true,
        previousStatus: true,
        deactivateRollMode: true,
        firstName: true,
        surname: true,
        classId: true,
        grNumber: true,
        rollNumber: true,
        standard: true,
        section: true,
        schoolClass: { select: { standard: true, section: true, name: true } },
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

      const keepSeat = rollMode === "blank";
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.student.update({
          where: { id },
          data: {
            previousStatus: student.status || "ready",
            status: "archived",
            deactivateRollMode: rollMode,
            ...(keepSeat ? {} : { rollNumber: null }),
          },
        });
        if (student.user?.id) {
          await tx.user.update({
            where: { id: student.user.id },
            data: { isActive: false },
          });
          await tx.userSession.updateMany({
            where: { userId: student.user.id, revokedAt: null },
            data: { revokedAt: new Date(), revokeReason: "student_deactivated" },
          });
        }
        if (!keepSeat && student.classId) {
          await closeClassRollGap(tx, {
            schoolId: session.schoolId,
            classId: student.classId,
            excludeStudentId: id,
          });
        }
        return row;
      });

      const studentName = [student.firstName, student.surname].filter(Boolean).join(" ").trim() || "Student";
      const classLabel = [
        student.standard || student.schoolClass?.standard || "",
        student.section || student.schoolClass?.section || "",
      ]
        .filter(Boolean)
        .join("-");
      const modeText = keepSeat
        ? "Name stays on the monthly attendance patrak with blank attendance. Other roll numbers were not changed."
        : "Later roll numbers moved up, and the name was removed from the monthly attendance patrak.";
      const details = [
        student.grNumber ? `GR ${student.grNumber}` : "",
        student.rollNumber ? `Roll ${student.rollNumber}` : "",
        classLabel ? `Class ${classLabel}` : "",
      ].filter(Boolean);
      try {
        await notifySchoolRoles({
          schoolId: session.schoolId,
          roles: ["school_admin", "supervisor"],
          type: "student",
          title: "Student deactivated",
          body: `${session.name || "A staff member"} deactivated ${studentName}${
            details.length ? ` (${details.join(", ")})` : ""
          }. ${modeText}`,
          href: "/students/inactive",
          meta: {
            kind: "student_deactivated",
            studentId: student.id,
            studentName,
            grNumber: student.grNumber,
            rollNumber: student.rollNumber,
            classLabel,
            rollMode,
            actorUserId: session.userId,
            actorName: session.name || "",
          },
        });
      } catch (notifyError) {
        console.error("deactivate notification", notifyError);
      }

      await writeChangeLog({
        actor: session,
        kind: "student",
        action: "deactivate",
        targetId: student.id,
        targetLabel: studentAuditLabel(student),
        summary: keepSeat
          ? "Deactivated. Name stays on the attendance patrak with blank attendance."
          : "Deactivated. Later roll numbers moved up and the name left the patrak.",
      });

      return NextResponse.json({
        ok: true,
        active: false,
        rollMode,
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
          deactivateRollMode: null,
        },
      });
      if (student.user?.id) {
        await tx.user.update({
          where: { id: student.user.id },
          data: { isActive: true },
        });
      }
      const keptSeat = student.deactivateRollMode === "blank" && Boolean(student.rollNumber);
      if (!keptSeat && student.classId && restoreStatus !== "draft") {
        await assignNextClassRoll(tx, {
          schoolId: session.schoolId,
          classId: student.classId,
          studentId: id,
        });
      }
      return row;
    });

    await writeChangeLog({
      actor: session,
      kind: "student",
      action: "activate",
      targetId: student.id,
      targetLabel: studentAuditLabel(student),
      summary: "Student activated again",
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
