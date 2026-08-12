/** Statuses hidden from the default "All Students" list */
export const STUDENT_LIST_HIDDEN_STATUSES = ["archived", "draft"] as const;

export type StudentListHiddenStatus = (typeof STUDENT_LIST_HIDDEN_STATUSES)[number];

/** Active enrolled students — excludes archived and in-progress GR drafts */
export function activeStudentStatusFilter() {
  return { notIn: [...STUDENT_LIST_HIDDEN_STATUSES] };
}
