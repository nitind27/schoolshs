import type { Prisma } from "@/generated/prisma/client";
import { activeStudentStatusFilter } from "@/lib/student-list-filters";
import { sortStudentsForRollAssign } from "@/lib/roll-order";

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
