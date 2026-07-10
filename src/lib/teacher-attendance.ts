import { prisma } from "@/lib/db";
import { AuthError, type SessionUser } from "@/lib/auth";

/** Teachers may only mark attendance for classes where they are class teacher. */
export async function assertTeacherAttendanceAccess(
  session: SessionUser & { schoolId: string },
  classId: string | null | undefined
) {
  if (session.role !== "teacher") return;

  if (!session.staffId) {
    throw new AuthError("Staff profile not linked to your account", 403);
  }
  if (!classId) {
    throw new AuthError("Select your class to mark attendance", 400);
  }

  const cls = await prisma.schoolClass.findFirst({
    where: {
      id: classId,
      schoolId: session.schoolId,
      classTeacherId: session.staffId,
    },
    select: { id: true },
  });

  if (!cls) {
    throw new AuthError("You can only mark attendance for your assigned class", 403);
  }
}

export async function teacherClassIds(session: SessionUser & { schoolId: string }): Promise<string[]> {
  if (session.role !== "teacher" || !session.staffId) return [];
  const rows = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId, classTeacherId: session.staffId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
