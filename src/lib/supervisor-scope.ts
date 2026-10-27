import { prisma } from "@/lib/db";
import { AuthError, type SessionUser } from "@/lib/auth";

const NONE = "__no_supervisor_class__";

/** null = not a supervisor (no extra filter). Empty array = supervisor with no classes. */
export async function getSupervisorClassIds(session: SessionUser): Promise<string[] | null> {
  if (session.role !== "supervisor") return null;
  if (!session.staffId || !session.schoolId) return [];
  const rows = await prisma.staffSupervisorClass.findMany({
    where: { schoolId: session.schoolId, staffId: session.staffId },
    select: { classId: true },
  });
  return rows.map((row) => row.classId);
}

export function supervisorClassIdFilter(classIds: string[] | null): { in: string[] } | null {
  if (classIds === null) return null;
  return { in: classIds.length ? classIds : [NONE] };
}

export async function assertSupervisorClassAccess(
  session: SessionUser,
  classId: string | null | undefined,
) {
  const ids = await getSupervisorClassIds(session);
  if (ids === null) return;
  if (!classId || !ids.includes(classId)) {
    throw new AuthError("You can only manage classes assigned to you", 403);
  }
}

export async function assertSupervisorStudentAccess(
  session: SessionUser,
  student: { classId?: string | null },
) {
  const ids = await getSupervisorClassIds(session);
  if (ids === null) return;
  if (!student.classId || !ids.includes(student.classId)) {
    throw new AuthError("You can only manage students in your assigned classes", 403);
  }
}

export async function assertSupervisorStudentsAccess(session: SessionUser, studentIds: string[]) {
  const ids = await getSupervisorClassIds(session);
  if (ids === null || !studentIds.length) return;
  const allowed = new Set(ids);
  const rows = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId: session.schoolId || undefined },
    select: { id: true, classId: true },
  });
  if (rows.length !== new Set(studentIds).size || rows.some((row) => !row.classId || !allowed.has(row.classId))) {
    throw new AuthError("You can only manage students in your assigned classes", 403);
  }
}
