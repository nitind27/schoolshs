import { normalizeGender } from "@/lib/gender-utils";

export type RollSortStudent = {
  id: string;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  gender?: string | null;
  grNumber?: string | null;
  rollNumber?: string | null;
};

/** Girls first, then boys, then other — each group by first name A→Z */
export function genderRollRank(gender?: string | null): number {
  const g = normalizeGender(gender);
  if (g === "Female") return 0;
  if (g === "Male") return 1;
  return 2;
}

export function studentNameSortKey(student: RollSortStudent): string {
  return [student.firstName, student.middleName || "", student.surname || "", student.grNumber || ""]
    .map((part) => String(part || "").trim().toLocaleLowerCase("en"))
    .join("\u0000");
}

export function compareStudentsForRollAssign(a: RollSortStudent, b: RollSortStudent): number {
  const ga = genderRollRank(a.gender);
  const gb = genderRollRank(b.gender);
  if (ga !== gb) return ga - gb;
  return studentNameSortKey(a).localeCompare(studentNameSortKey(b), "en", {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortStudentsForRollAssign<T extends RollSortStudent>(students: T[]): T[] {
  return [...students].sort(compareStudentsForRollAssign);
}

export function assignedRollsById<T extends RollSortStudent>(students: T[]): Record<string, string> {
  return Object.fromEntries(
    sortStudentsForRollAssign(students).map((student, index) => [student.id, String(index + 1)]),
  );
}

function numericRoll(value?: string | null): number | null {
  const n = parseInt(String(value || "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Display order after save: roll 1,2,3… (not string "1","10","2") */
export function sortStudentsBySavedRoll<T extends RollSortStudent>(students: T[]): T[] {
  return [...students].sort((a, b) => {
    const ra = numericRoll(a.rollNumber);
    const rb = numericRoll(b.rollNumber);
    if (ra != null && rb != null && ra !== rb) return ra - rb;
    if (ra != null && rb == null) return -1;
    if (ra == null && rb != null) return 1;
    return compareStudentsForRollAssign(a, b);
  });
}
