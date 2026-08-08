import { requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";

const BOARD_ROLES = ["school_admin", "teacher", "clerk"] as const;

/** Auth + Super Admin feature gate for board exam result APIs. */
export async function requireBoardRecordsAuth(
  roles: readonly ("school_admin" | "teacher" | "clerk")[] = BOARD_ROLES,
) {
  const session = await requireSchoolAuth([...roles]);
  await requireSchoolFeature(session.schoolId, "board_records");
  return session;
}
