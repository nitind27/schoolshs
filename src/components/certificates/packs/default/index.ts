/**
 * Shared / Default certificate pack.
 * Until a school gets a dedicated school-code pack, Super Admin assigns `default`.
 *
 * New school pack workflow:
 * - Copy this folder to `packs/<SCHOOL_CODE>/`
 * - Customize letterhead & layouts
 * - Register in `lib/certificates/packs-registry.ts`
 */
export { BonafideCertificateView } from "@/components/certificates/bonafide-certificate";
export { LeavingCertificateView } from "@/components/certificates/leaving-certificate";
export { CharacterCertificateView } from "@/components/certificates/character-certificate";
export { MonthlyAttendancePatrakView } from "@/components/certificates/monthly-attendance-patrak";
export { DailyAttendanceBookView } from "@/components/certificates/daily-attendance-book";
export { ClassRegisterView } from "@/components/certificates/class-register";
export { GeneralRegisterView, GeneralRegisterPrintBundle } from "@/components/certificates/general-register";
export { MonthlyReportsView } from "@/components/certificates/monthly-reports";
