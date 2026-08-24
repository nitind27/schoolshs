import "server-only";

import { prisma } from "@/lib/db";
import { enrolledStudentStatusFilter } from "@/lib/student-list-filters";

export const duplicateGrStudentSelect = {
  id: true,
  grNumber: true,
  firstName: true,
  middleName: true,
  surname: true,
  firstNameGu: true,
  middleNameGu: true,
  surnameGu: true,
  fatherName: true,
  fatherNameGu: true,
  standard: true,
  section: true,
  status: true,
  classId: true,
  rollNumber: true,
  mobileNumber: true,
  schoolClass: {
    select: { id: true, name: true, standard: true, section: true },
  },
} as const;

export function duplicateGrStudentWhere(schoolId: string) {
  return {
    schoolId,
    status: enrolledStudentStatusFilter(),
    AND: [{ grNumber: { not: null } }, { NOT: { grNumber: "" } }],
  };
}

export async function duplicateGrCounts(schoolId: string) {
  const grouped = await prisma.student.groupBy({
    by: ["grNumber"],
    where: duplicateGrStudentWhere(schoolId),
    _count: { _all: true },
  });
  const dupes = grouped.filter((g) => Boolean(g.grNumber) && g._count._all > 1);
  return {
    groupCount: dupes.length,
    studentCount: dupes.reduce((n, g) => n + g._count._all, 0),
    grNumbers: dupes.map((g) => String(g.grNumber)),
  };
}

export async function findDuplicateGrGroups(schoolId: string) {
  const { grNumbers } = await duplicateGrCounts(schoolId);
  if (!grNumbers.length) return [];

  const students = await prisma.student.findMany({
    where: {
      ...duplicateGrStudentWhere(schoolId),
      grNumber: { in: grNumbers },
    },
    select: duplicateGrStudentSelect,
    orderBy: [{ grNumber: "asc" }, { standard: "asc" }, { surname: "asc" }, { firstName: "asc" }],
  });

  const byGr = new Map<string, typeof students>();
  for (const student of students) {
    const gr = String(student.grNumber || "").trim();
    if (!gr) continue;
    const list = byGr.get(gr) || [];
    list.push(student);
    byGr.set(gr, list);
  }

  return [...byGr.entries()]
    .map(([grNumber, rows]) => ({ grNumber, count: rows.length, students: rows }))
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count || a.grNumber.localeCompare(b.grNumber, undefined, { numeric: true }));
}
