import { CERTIFICATE_TYPES, type CertificateTypeId } from "@/lib/certificates/config";

/**
 * Certificate layout packs — one folder per school code (or shared "default").
 *
 * Add a new school format:
 * 1. Create `src/components/certificates/packs/<SCHOOL_CODE>/`
 * 2. Put certificate views in that folder (or re-export from shared)
 * 3. Register the pack here with the same `id` as the school code
 * 4. Super Admin → Formats / school Panel Access → assign that pack to the school
 *
 * Only the pack Super Admin assigns is used at runtime for that school.
 */

export type CertificatePackDef = {
  /** Prefer school `code` for school-specific packs; use `default` for shared. */
  id: string;
  label: string;
  description: string;
  /** Matching School.code when this pack is school-specific */
  schoolCode: string | null;
  /** Which certificate types this pack implements */
  certificateTypes: CertificateTypeId[];
  /** Folder under components/certificates/packs/ */
  folder: string;
};

const ALL_TYPES = CERTIFICATE_TYPES.map((c) => c.id) as CertificateTypeId[];

export const CERTIFICATE_PACKS: CertificatePackDef[] = [
  {
    id: "default",
    label: "Default (Codeat)",
    description: "Shared multi-school certificate layouts — use when a school has no custom pack yet",
    schoolCode: null,
    certificateTypes: ALL_TYPES,
    folder: "default",
  },
  {
    id: "24261004405",
    label: "Sarvajanik High School · Songadh",
    description: "Official Songadh / Fort-Songadh letterhead formats (bonafide, LC, GR, patrak, …)",
    schoolCode: "24261004405",
    certificateTypes: ALL_TYPES,
    folder: "24261004405",
  },
  {
    id: "24261004403",
    label: "Songadh Primary · 24261004403",
    description:
      "Primary bonafide (scan) + Upper Primary LC — school code 24261004403",
    schoolCode: "24261004403",
    certificateTypes: ALL_TYPES,
    folder: "24261004403",
  },
  {
    id: "24261004404",
    label: "Songadh Primary · 24261004404",
    description:
      "Primary bonafide (scan) + Upper Primary LC — school code 24261004404",
    schoolCode: "24261004404",
    certificateTypes: ALL_TYPES,
    folder: "24261004404",
  },
];

/** Legacy aliases still accepted in moduleFormats */
export const CERTIFICATE_PACK_ALIASES: Record<string, string> = {
  songadh: "24261004405",
};

export function resolveCertificatePackId(raw: string | null | undefined): string {
  const id = (raw || "default").trim();
  return CERTIFICATE_PACK_ALIASES[id] || id;
}

export function getCertificatePack(id: string | null | undefined): CertificatePackDef {
  const resolved = resolveCertificatePackId(id);
  return (
    CERTIFICATE_PACKS.find((p) => p.id === resolved) ||
    CERTIFICATE_PACKS.find((p) => p.id === "default")!
  );
}

export function listCertificatePackOptions(): { id: string; label: string; description?: string }[] {
  return CERTIFICATE_PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.schoolCode
      ? `${p.description} · School code ${p.schoolCode}`
      : p.description,
  }));
}

export function isKnownCertificatePackId(id: string): boolean {
  const resolved = resolveCertificatePackId(id);
  return CERTIFICATE_PACKS.some((p) => p.id === resolved);
}
