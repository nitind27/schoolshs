import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { resolveCertificatePackId } from "@/lib/certificates/packs-registry";

/** Letterhead / DISE / index numbers printed on certificates */
export type CertificateSchoolBrand = {
  nameEn: string;
  nameEnAlt: string;
  nameGu: string;
  address: string;
  addressGu: string;
  sscIndex: string;
  hscIndex: string;
  diseCode: string;
  phone: string;
  medium: string;
  section: string;
  principalLabel: string;
  clerkLabel: string;
  classTeacherLabel: string;
};

export type LiveSchoolLetterhead = {
  name?: string | null;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  udiseCode?: string | null;
  city?: string | null;
  district?: string | null;
  taluka?: string | null;
  pincode?: string | null;
};

const SHARED_LABELS = {
  medium: "Gujarati / ગુજરાતી",
  section: "Secondary & Higher Secondary Section",
  principalLabel: "Principal / Head Master",
  clerkLabel: "Clerk / ક્લાર્ક",
  classTeacherLabel: "Class Teacher / વર્ગ શિક્ષક",
} as const;

/** Pack defaults — live school profile overlays name/address/phone/UDISE at runtime */
export const CERTIFICATE_PACK_BRANDS: Record<string, CertificateSchoolBrand> = {
  default: {
    nameEn: "SCHOOL",
    nameEnAlt: "SCHOOL",
    nameGu: "શાળા",
    address: "",
    addressGu: "",
    sscIndex: "—",
    hscIndex: "—",
    diseCode: "",
    phone: "",
    ...SHARED_LABELS,
  },
  "24261004405": { ...CERTIFICATE_SCHOOL },
  "24261004403": {
    nameEn: "SHREE SARVAJANIK HIGHSCHOOL FORT-SONGADH",
    nameEnAlt: "Shree Sarvajanik Highschool Fort-Songadh",
    nameGu: "શ્રી સાર્વજનિક હાઈસ્કૂલ ફોર્ટ-સોનગઢ",
    address: "Navagam, Ta. Songadh Dist. Tapi",
    addressGu: "નવાગામ, તા. સોનગઢ જિ. તાપી",
    sscIndex: "—",
    hscIndex: "—",
    diseCode: "24261004403",
    phone: "",
    ...SHARED_LABELS,
    section: "Granted Upper Primary Section",
  },
  "24261004404": {
    nameEn: "SHREE SARVAJANIK HIGHSCHOOL FORT-SONGADH",
    nameEnAlt: "Shree Sarvajanik Highschool Fort-Songadh",
    nameGu: "શ્રી સાર્વજનિક હાઈસ્કૂલ ફોર્ટ-સોનગઢ",
    address: "Navagam, Ta. Songadh Dist. Tapi",
    addressGu: "નવાગામ, તા. સોનગઢ જિ. તાપી",
    sscIndex: "—",
    hscIndex: "—",
    diseCode: "24261004404",
    phone: "",
    ...SHARED_LABELS,
    section: "Granted Upper Primary Section",
  },
};

export function getPackCertificateBrand(packId: string | null | undefined): CertificateSchoolBrand {
  const id = resolveCertificatePackId(packId);
  return CERTIFICATE_PACK_BRANDS[id] || CERTIFICATE_PACK_BRANDS.default;
}

export function mergeCertificateBrand(
  pack: CertificateSchoolBrand,
  live?: LiveSchoolLetterhead | null,
): CertificateSchoolBrand {
  if (!live) return pack;

  const dise = (live.udiseCode || live.code || pack.diseCode || "").trim();
  const dedicated =
    Boolean(pack.diseCode) &&
    pack.nameEnAlt !== "SCHOOL" &&
    pack.nameGu !== "શાળા";

  // Official pack letterheads (403/404/405) keep printed school name/address from pack.
  // Only DISE / phone come from live school profile.
  if (dedicated) {
    return {
      ...pack,
      diseCode: dise || pack.diseCode,
      phone: live.phone?.trim() || pack.phone,
    };
  }

  const name = live.name?.trim();
  const parts = [live.address, live.taluka, live.city, live.district, live.pincode]
    .map((x) => (x || "").trim())
    .filter(Boolean);
  const address = parts.length ? parts.join(", ") : pack.address;

  return {
    ...pack,
    nameEn: name ? name.toUpperCase() : pack.nameEn,
    nameEnAlt: name || pack.nameEnAlt,
    nameGu: pack.nameGu && pack.nameGu !== "શાળા" ? pack.nameGu : name || pack.nameGu,
    address: address || pack.address,
    phone: live.phone?.trim() || pack.phone,
    diseCode: dise || pack.diseCode,
  };
}

export function resolveCertificateBrand(
  packId: string | null | undefined,
  live?: LiveSchoolLetterhead | null,
): CertificateSchoolBrand {
  return mergeCertificateBrand(getPackCertificateBrand(packId), live);
}
