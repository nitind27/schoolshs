import { resolveCertificatePackId } from "@/lib/certificates/packs-registry";
import type { CertificateTypeId } from "@/lib/certificates/config";
import * as defaultPack from "@/components/certificates/packs/default";
import * as songadhPack from "@/components/certificates/packs/24261004405";
import * as pack403 from "@/components/certificates/packs/24261004403";
import * as pack404 from "@/components/certificates/packs/24261004404";

type PackModule = typeof defaultPack;

const PACK_MODULES: Record<string, PackModule> = {
  default: defaultPack,
  "24261004405": songadhPack,
  "24261004403": pack403,
  "24261004404": pack404,
};

export type CertificateViewKey =
  | "BonafideCertificateView"
  | "LeavingCertificateView"
  | "CharacterCertificateView"
  | "MonthlyAttendancePatrakView"
  | "DailyAttendanceBookView"
  | "ClassRegisterView"
  | "GeneralRegisterView"
  | "GeneralRegisterPrintBundle"
  | "MonthlyReportsView";

const TYPE_TO_VIEW: Record<CertificateTypeId, CertificateViewKey> = {
  bonafide: "BonafideCertificateView",
  lc: "LeavingCertificateView",
  character: "CharacterCertificateView",
  "monthly-attendance": "MonthlyAttendancePatrakView",
  "daily-attendance-book": "DailyAttendanceBookView",
  "class-register": "ClassRegisterView",
  "general-register": "GeneralRegisterView",
  "monthly-reports": "MonthlyReportsView",
};

export function getCertificatePackModule(formatId: string | null | undefined): PackModule {
  const id = resolveCertificatePackId(formatId);
  return PACK_MODULES[id] || PACK_MODULES.default;
}

export function getCertificateViewForType(
  formatId: string | null | undefined,
  typeId: CertificateTypeId,
) {
  const pack = getCertificatePackModule(formatId);
  const key = TYPE_TO_VIEW[typeId];
  return pack[key];
}
