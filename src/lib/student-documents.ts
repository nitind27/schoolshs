import { requires10thBoard, requires12thBoard } from "@/lib/student-academic-rules";

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

/** Flutter / mobile catalog — EN + GU labels, accept MIME, DG size limit */
export type DocCatalogItem = {
  type: DocType;
  field: string;
  labelEn: string;
  labelGu: string;
  descriptionEn: string;
  descriptionGu: string;
  accept: string[];
  required: boolean;
  maxKB: number;
  maxInputBytes: number;
};

export const DOC_CATALOG: DocCatalogItem[] = [
  {
    type: "photo",
    field: "photoPath",
    labelEn: "Passport Photo",
    labelGu: "પાસપોર્ટ ફોટો",
    descriptionEn: "Recent passport size photo",
    descriptionGu: "તાજેતરનો પાસપોર્ટ સાઈઝ ફોટો",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    required: true,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "aadhaar",
    field: "aadhaarDocPath",
    labelEn: "Aadhaar Card",
    labelGu: "આધાર કાર્ડ",
    descriptionEn: "Front side scan",
    descriptionGu: "આગળની બાજુ સ્કેન",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "income",
    field: "incomeCertPath",
    labelEn: "Income Certificate",
    labelGu: "આવક પ્રમાણપત્ર",
    descriptionEn: "Family income proof",
    descriptionGu: "પરિવાર આવક પુરાવો",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "caste",
    field: "casteCertPath",
    labelEn: "Caste Certificate",
    labelGu: "જાતિ પ્રમાણપત્ર",
    descriptionEn: "SC/ST/OBC certificate",
    descriptionGu: "SC/ST/OBC પ્રમાણપત્ર",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "marksheet10",
    field: "marksheet10Path",
    labelEn: "10th Marksheet",
    labelGu: "10મું માર્કશીટ",
    descriptionEn: "Standard 10 marksheet",
    descriptionGu: "ધોરણ 10 માર્કશીટ",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "marksheet12",
    field: "marksheet12Path",
    labelEn: "12th Marksheet",
    labelGu: "12મું માર્કશીટ",
    descriptionEn: "Standard 12 marksheet",
    descriptionGu: "ધોરણ 12 માર્કશીટ",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "bankPassbook",
    field: "bankPassbookPath",
    labelEn: "Bank Passbook",
    labelGu: "બેંક પાસબુક",
    descriptionEn: "First page with account details",
    descriptionGu: "ખાતા વિગતો સાથે પહેલું પાનું",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
  {
    type: "feeReceipt",
    field: "feeReceiptPath",
    labelEn: "Fee Receipt",
    labelGu: "ફી રસીદ",
    descriptionEn: "Current year fee receipt",
    descriptionGu: "હાલના વર્ષની ફી રસીદ",
    accept: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    required: false,
    maxKB: 200,
    maxInputBytes: 10 * 1024 * 1024,
  },
];

export function getDocCatalogItem(type: DocType): DocCatalogItem {
  return DOC_CATALOG.find((d) => d.type === type)!;
}

/**
 * Which docs to show for a student:
 * - 10th marksheet only after 10th is passed (Std 11+)
 * - 12th marksheet only after 12th is passed (above Std 12) — never show early
 */
export function visibleDocTypesForStandard(standard: string | null | undefined): DocType[] {
  const show10 = requires10thBoard(standard);
  const show12 = requires12thBoard(standard);
  return DOC_TYPES.filter((type) => {
    if (type === "marksheet10") return show10;
    if (type === "marksheet12") return show12;
    return true;
  });
}

export function catalogForStandard(standard: string | null | undefined): DocCatalogItem[] {
  const allowed = new Set(visibleDocTypesForStandard(standard));
  return DOC_CATALOG.filter((d) => allowed.has(d.type));
}

export function isDocVisibleForStandard(
  docType: string,
  standard: string | null | undefined,
): docType is DocType {
  return isDocType(docType) && visibleDocTypesForStandard(standard).includes(docType);
}

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
