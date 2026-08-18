/** Play Store review student — first login uses a fixed OTP, password stays 123456. */

export const PLAYSTORE_DEMO_SCHOOL_CODE = "DUMMY90001";
export const PLAYSTORE_DEMO_STUDENT_EMAIL = "student2@dummy90001.local";
export const PLAYSTORE_DEMO_STUDENT_PASSWORD = "123456";
/** Shown to reviewers. Asked only on first student login, then never again. */
export const PLAYSTORE_DEMO_STUDENT_OTP = "900012";

export function isPlaystoreDemoStudent(email?: string | null): boolean {
  return String(email || "").trim().toLowerCase() === PLAYSTORE_DEMO_STUDENT_EMAIL;
}
