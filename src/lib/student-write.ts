import { Prisma } from "@/generated/prisma/client";

/** Relation / meta keys that must not appear on UncheckedCreate/Update */
const STRIP_KEYS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "school",
  "schoolClass",
  "user",
  "examResults",
  "reportCards",
  "attendanceMonths",
  "generalRegisterEntries",
  "_count",
]);

/**
 * Prisma create/update XOR: scalar FKs (classId, schoolId) only work on
 * Unchecked*Input. Explicit `classId: null` plus a loose cast can make the
 * runtime validator pick Checked CreateInput (no classId) → crash.
 */
export function toStudentUncheckedCreate(
  raw: Record<string, unknown>,
  extras: {
    schoolId: string;
    status: string;
    validationErrors?: string | null;
  },
): Prisma.StudentUncheckedCreateInput {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (STRIP_KEYS.has(key)) continue;
    if (key === "schoolId" || key === "status" || key === "validationErrors") continue;
    cleaned[key] = value;
  }

  const classId =
    typeof cleaned.classId === "string" && cleaned.classId.trim()
      ? cleaned.classId.trim()
      : null;

  return {
    ...(cleaned as Prisma.StudentUncheckedCreateInput),
    schoolId: extras.schoolId,
    classId,
    status: extras.status,
    validationErrors: extras.validationErrors ?? null,
  };
}

export function toStudentUncheckedUpdate(
  raw: Record<string, unknown>,
  extras?: {
    schoolId?: string;
    status?: string;
    validationErrors?: string | null;
  },
): Prisma.StudentUncheckedUpdateInput {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (STRIP_KEYS.has(key)) continue;
    cleaned[key] = value;
  }

  if ("classId" in cleaned) {
    const cid = cleaned.classId;
    cleaned.classId =
      typeof cid === "string" && cid.trim() ? cid.trim() : null;
  }

  if (extras?.schoolId !== undefined) cleaned.schoolId = extras.schoolId;
  if (extras?.status !== undefined) cleaned.status = extras.status;
  if (extras && "validationErrors" in extras) {
    cleaned.validationErrors = extras.validationErrors ?? null;
  }

  return cleaned as Prisma.StudentUncheckedUpdateInput;
}
