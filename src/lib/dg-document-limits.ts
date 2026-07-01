import type { DocType } from "@/components/documents/document-uploader";

/** Digital Gujarat portal document size limits */
export const DG_MAX_KB = 200;

export interface DocLimitConfig {
  maxKB: number;
  maxWidth: number;
  maxHeight: number;
  label: string;
}

export const DG_DOC_LIMITS: Record<DocType, DocLimitConfig> = {
  photo: {
    maxKB: 200,
    maxWidth: 350,
    maxHeight: 450,
    label: "Passport Photo (max 200 KB)",
  },
  aadhaar: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "Aadhaar (max 200 KB)" },
  income: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "Income Cert (max 200 KB)" },
  caste: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "Caste Cert (max 200 KB)" },
  marksheet10: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "10th Marksheet (max 200 KB)" },
  marksheet12: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "12th Marksheet (max 200 KB)" },
  bankPassbook: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "Bank Passbook (max 200 KB)" },
  feeReceipt: { maxKB: 200, maxWidth: 1400, maxHeight: 1400, label: "Fee Receipt (max 200 KB)" },
};

export function getMaxBytes(docType: DocType): number {
  return DG_DOC_LIMITS[docType].maxKB * 1024;
}

export function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function isDGReady(bytes: number, docType: DocType): boolean {
  return bytes <= getMaxBytes(docType);
}
