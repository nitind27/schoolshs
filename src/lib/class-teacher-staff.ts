import type { Staff } from "@/generated/prisma/client";

/** Fetch enough active staff for class-teacher dropdowns (API default page size is 10). */
export const CLASS_TEACHER_STAFF_QUERY = "active=true&limit=1000&page=1";

const NON_TEACHING = new Set([
  "peon",
  "puen",
  "watchman",
  "security",
  "driver",
  "sweeper",
]);

export type TeacherClassAssignment = {
  classId: string;
  className: string;
};

type ClassTeacherSource = {
  id: string;
  name: string;
  classTeacherId?: string | null;
  classTeacher?: { id: string } | null;
};

/** Map teacherId → class they already teach (one class teacher per staff). */
export function buildTeacherClassMap(
  classes: ClassTeacherSource[],
): Map<string, TeacherClassAssignment> {
  const map = new Map<string, TeacherClassAssignment>();
  for (const c of classes) {
    const teacherId = c.classTeacher?.id || c.classTeacherId || "";
    if (!teacherId) continue;
    map.set(teacherId, { classId: c.id, className: c.name });
  }
  return map;
}

export function getTeacherBusyClass(
  teacherId: string,
  currentClassId: string | null | undefined,
  assignments: Map<string, TeacherClassAssignment>,
): TeacherClassAssignment | null {
  const assigned = assignments.get(teacherId);
  if (!assigned) return null;
  if (currentClassId && assigned.classId === currentClassId) return null;
  return assigned;
}

export function formatClassTeacherOptionLabel(opts: {
  firstName: string;
  lastName: string;
  designation?: string | null;
  busyClassName?: string | null;
}): string {
  const name = `${opts.firstName} ${opts.lastName}`.trim();
  if (opts.busyClassName) {
    return `${name} (${opts.busyClassName})`;
  }
  if (opts.designation) {
    return `${name} · ${opts.designation}`;
  }
  return name;
}

/** Loose match: teacher / principal / head / supervisor / subject teacher, etc. */
export function isClassTeacherEligible(designation: string | null | undefined): boolean {
  const d = String(designation || "").trim().toLowerCase();
  if (!d) return true;
  if (NON_TEACHING.has(d)) return false;
  if (NON_TEACHING.has(d.replace(/\s+/g, ""))) return false;
  return (
    d.includes("teacher") ||
    d.includes("principal") ||
    d.includes("head master") ||
    d.includes("headmistress") ||
    d.includes("head teacher") ||
    d === "hm" ||
    d.includes("supervisor") ||
    d.includes("lecturer") ||
    d.includes("faculty") ||
    d.includes("instructor") ||
    d === "other"
  );
}

/**
 * Staff list for Class Teacher selects.
 * Shows all active staff except peon/security so custom designations are never hidden.
 * Teaching-related designations are sorted to the top.
 */
export function pickClassTeacherOptions<
  T extends Pick<Staff, "id" | "designation" | "firstName" | "lastName">,
>(staff: T[]): T[] {
  const usable = staff.filter((s) => {
    const d = String(s.designation || "").trim().toLowerCase();
    return !NON_TEACHING.has(d);
  });

  return [...usable].sort((a, b) => {
    const aTeach = isClassTeacherEligible(a.designation) ? 0 : 1;
    const bTeach = isClassTeacherEligible(b.designation) ? 0 : 1;
    if (aTeach !== bTeach) return aTeach - bTeach;
    const an = `${a.firstName} ${a.lastName}`.toLowerCase();
    const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
    return an.localeCompare(bn);
  });
}

/** Available teachers first; already-assigned-elsewhere teachers last (still listed, disabled in UI). */
export function sortClassTeacherOptionsForClass<
  T extends Pick<Staff, "id" | "designation" | "firstName" | "lastName">,
>(
  teachers: T[],
  currentClassId: string | null | undefined,
  assignments: Map<string, TeacherClassAssignment>,
): T[] {
  return [...teachers].sort((a, b) => {
    const aBusy = getTeacherBusyClass(a.id, currentClassId, assignments) ? 1 : 0;
    const bBusy = getTeacherBusyClass(b.id, currentClassId, assignments) ? 1 : 0;
    if (aBusy !== bBusy) return aBusy - bBusy;
    const aTeach = isClassTeacherEligible(a.designation) ? 0 : 1;
    const bTeach = isClassTeacherEligible(b.designation) ? 0 : 1;
    if (aTeach !== bTeach) return aTeach - bTeach;
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
}
