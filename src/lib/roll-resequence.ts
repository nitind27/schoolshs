import type { Prisma } from "@/generated/prisma/client";
import { activeStudentStatusFilter } from "@/lib/student-list-filters";
import { sortStudentsBySavedRoll, sortStudentsForRollAssign } from "@/lib/roll-order";

type Tx = Prisma.TransactionClient;

/**
 * Re-assign class roll numbers: girls first (A→Z), then boys (A→Z).
 * Includes draft/incomplete students. Skips archived only.
 */
export async function resequenceClassRollNumbers(
  tx: Tx,
  opts: { schoolId: string; classId: string | null | undefined; excludeStudentId?: string },
): Promise<number> {
  const classId = opts.classId?.trim();
  if (!classId) return 0;

  const students = await tx.student.findMany({
    where: {
      schoolId: opts.schoolId,
      classId,
      status: activeStudentStatusFilter(),
      ...(opts.excludeStudentId ? { id: { not: opts.excludeStudentId } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      gender: true,
      grNumber: true,
      rollNumber: true,
    },
  });

  const ordered = sortStudentsForRollAssign(students);

  // Two-pass to avoid unique clashes while swapping rolls
  for (const student of ordered) {
    await tx.student.update({
      where: { id: student.id },
      data: { rollNumber: `tmp-${student.id.slice(-10)}` },
    });
  }

  let i = 1;
  for (const student of ordered) {
    await tx.student.update({
      where: { id: student.id },
      data: { rollNumber: String(i++) },
    });
  }

  return ordered.length;
}

/**
 * Close a gap after a student leaves: keep the current roll order and number 1, 2, 3…
 * Roll 6 becomes 5. People already above the gap keep their place.
 */
export async function closeClassRollGap(
  tx: Tx,
  opts: { schoolId: string; classId: string | null | undefined; excludeStudentId?: string },
): Promise<number> {
  const classId = opts.classId?.trim();
  if (!classId) return 0;

  const students = await tx.student.findMany({
    where: {
      schoolId: opts.schoolId,
      classId,
      status: activeStudentStatusFilter(),
      ...(opts.excludeStudentId ? { id: { not: opts.excludeStudentId } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      gender: true,
      grNumber: true,
      rollNumber: true,
    },
  });

  const held = await tx.student.findMany({
    where: {
      schoolId: opts.schoolId,
      classId,
      status: "archived",
      deactivateRollMode: "blank",
    },
    select: { rollNumber: true },
  });
  const reserved = new Set(
    held.map((student) => String(student.rollNumber || "").trim()).filter(Boolean),
  );

  const ordered = sortStudentsBySavedRoll(students);
  let roll = 1;
  for (const student of ordered) {
    while (reserved.has(String(roll))) roll += 1;
    const next = String(roll++);
    if (student.rollNumber === next) continue;
    await tx.student.update({
      where: { id: student.id },
      data: { rollNumber: next },
    });
  }
  return ordered.length;
}

/** Next free roll at the end of the class. Does not move anyone else. */
export async function assignNextClassRoll(
  tx: Tx,
  opts: { schoolId: string; classId: string; studentId: string },
): Promise<string> {
  const students = await tx.student.findMany({
    where: {
      schoolId: opts.schoolId,
      classId: opts.classId,
      id: { not: opts.studentId },
      OR: [{ status: activeStudentStatusFilter() }, { status: "archived", deactivateRollMode: "blank" }],
    },
    select: { rollNumber: true },
  });
  let max = 0;
  for (const student of students) {
    const n = parseInt(String(student.rollNumber || "").trim(), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = String(max + 1);
  await tx.student.update({
    where: { id: opts.studentId },
    data: { rollNumber: next },
  });
  return next;
}
