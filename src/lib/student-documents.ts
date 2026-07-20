export const DOC_TYPES = [
  "photo",
  "aadhaar",
  "income",
  "caste",
  "marksheet10",
  "marksheet12",
  "bankPassbook",
  "feeReceipt",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_FIELD_MAP: Record<DocType, string> = {
  photo: "photoPath",
  aadhaar: "aadhaarDocPath",
  income: "incomeCertPath",
  caste: "casteCertPath",
  marksheet10: "marksheet10Path",
  marksheet12: "marksheet12Path",
  bankPassbook: "bankPassbookPath",
  feeReceipt: "feeReceiptPath",
};

/** Folder name per document type under uploads/students/{studentId}/ */
export const DOC_FOLDER_MAP: Record<DocType, string> = {
  photo: "passport-photo",
  aadhaar: "aadhaar-card",
  income: "income-certificate",
  caste: "caste-certificate",
  marksheet10: "marksheet-10th",
  marksheet12: "marksheet-12th",
  bankPassbook: "bank-passbook",
  feeReceipt: "fee-receipt",
};

export function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value);
}

export function buildDocRelativePath(studentId: string, docType: DocType, ext: string): string {
  const folder = DOC_FOLDER_MAP[docType];
  const filename = `${docType}${ext}`;
  return `students/${studentId}/${folder}/${filename}`;
}

export function toUploadUrl(relativeOrAbsolute: string): string {
  const normalized = relativeOrAbsolute.replace(/\\/g, "/");
  const uploadsIdx = normalized.indexOf("/uploads/");
  if (uploadsIdx >= 0) {
    return normalized.slice(uploadsIdx + "/uploads".length);
  }
  if (normalized.includes("students/")) {
    const idx = normalized.indexOf("students/");
    return `/api/uploads/${normalized.slice(idx)}`;
  }
  return `/api/uploads/${normalized.replace(/^\/+/, "")}`;
}

export function uploadApiUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const normalized = stored.replace(/\\/g, "/").trim();
  if (normalized.startsWith("/api/uploads/")) return normalized;
  const rel = normalized.replace(/^uploads\//, "").replace(/^\/+/, "");
  return `/api/uploads/${rel}`;
}

export function sortScannerDevices(
  devices: { deviceId: string; label: string }[]
): { deviceId: string; label: string }[] {
  const score = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("scanner") || l.includes("scan")) return 0;
    if (l.includes("epson") || l.includes("canon") || l.includes("hp") || l.includes("brother")) return 1;
    if (l.includes("usb")) return 2;
    return 3;
  };
  return [...devices].sort((a, b) => score(a.label) - score(b.label) || a.label.localeCompare(b.label));
}
