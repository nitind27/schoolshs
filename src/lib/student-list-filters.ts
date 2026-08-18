/** Statuses hidden from attendance, roll numbers, GR counts */
export const STUDENT_LIST_HIDDEN_STATUSES = ["archived", "draft"] as const;

export type StudentListHiddenStatus = (typeof STUDENT_LIST_HIDDEN_STATUSES)[number];

/** Active enrolled students — excludes archived and in-progress GR drafts */
export function activeStudentStatusFilter() {
  return { notIn: [...STUDENT_LIST_HIDDEN_STATUSES] };
}

/** All Students list — archived only. Drafts still show class-wise. */
export function enrolledStudentStatusFilter() {
  return { not: "archived" as const };
}

export type PendingReason = "documents" | "profile" | "division";

export type PendingReasonStudent = {
  status?: string | null;
  classId?: string | null;
  standard?: string | null;
  photoPath?: string | null;
  aadhaarDocPath?: string | null;
  validationErrors?: string | null;
};

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function hasValidationIssues(value?: string | null) {
  const raw = value?.trim();
  return Boolean(raw && raw !== "[]");
}

/** Prisma OR clauses for the Pending work queue (not admissionStatus). */
export function pendingWorkOrFilters() {
  return [
    { status: "draft" },
    {
      AND: [
        { classId: null },
        { standard: { not: null } },
        { NOT: { standard: "" } },
      ],
    },
    { photoPath: null },
    { photoPath: "" },
    { aadhaarDocPath: null },
    { aadhaarDocPath: "" },
    {
      AND: [
        { validationErrors: { not: null } },
        { NOT: { validationErrors: "" } },
        { NOT: { validationErrors: "[]" } },
      ],
    },
  ];
}

export function pendingWorkWhere() {
  return {
    status: enrolledStudentStatusFilter(),
    OR: pendingWorkOrFilters(),
  };
}

export function andStudentWhere(
  where: Record<string, unknown>,
  clause: Record<string, unknown>,
) {
  const existingAnd = Array.isArray(where.AND)
    ? [...(where.AND as object[])]
    : where.AND
      ? [where.AND as object]
      : [];
  if (where.OR) {
    existingAnd.unshift({ OR: where.OR as object });
    delete where.OR;
  }
  existingAnd.push(clause);
  where.AND = existingAnd;
}

export function studentPendingReasons(s: PendingReasonStudent): PendingReason[] {
  const reasons: PendingReason[] = [];
  if (!hasText(s.photoPath) || !hasText(s.aadhaarDocPath)) {
    reasons.push("documents");
  }
  if (s.status === "draft" || hasValidationIssues(s.validationErrors)) {
    reasons.push("profile");
  }
  if (hasText(s.standard) && !s.classId) {
    reasons.push("division");
  }
  return reasons;
}
