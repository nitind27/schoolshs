import { normalizeGender, parseImportDate } from "@/lib/import/import-formats";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { CSV_HEADERS, CSV_HEADER_LABELS } from "@/lib/constants";
import { normalizeStudentRow, validateStudent, type ValidationError } from "@/lib/validation";

export type ImportFieldKey = (typeof CSV_HEADERS)[number];

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; aadhaarNumber: string; errors: string[] }[];
}

export interface ParsedImportFile {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  fileHeaders: string[];
  rawRows: Record<string, unknown>[];
  columnMap: Record<string, ImportFieldKey | "">;
}

export interface RowValidation {
  rowIndex: number;
  aadhaarNumber: string;
  name: string;
  status: "valid" | "warning" | "error";
  errors: ValidationError[];
  normalized: Record<string, unknown>;
}

const DATE_FIELDS = new Set<ImportFieldKey>([
  "dateOfBirth",
  "startDate",
  "completionDate",
]);

const NUMBER_FIELDS = new Set<ImportFieldKey>([
  "annualFamilyIncome",
  "percentage10th",
  "percentage12th",
  "familySize",
]);

const BOOLEAN_FIELDS = new Set<ImportFieldKey>(["isOrphan", "isHosteler"]);

/** Common header aliases → field key */
const HEADER_ALIASES: Record<string, ImportFieldKey> = (() => {
  const map: Record<string, ImportFieldKey> = {};

  const add = (alias: string, key: ImportFieldKey) => {
    const n = normalizeHeader(alias);
    if (n && !map[n]) map[n] = key;
  };

  for (const key of CSV_HEADERS) {
    add(key, key);
    const label = CSV_HEADER_LABELS[key];
    if (label) add(label, key);
  }

  const extras: [string, ImportFieldKey][] = [
    ["first name", "firstName"],
    ["fname", "firstName"],
    ["surname", "surname"],
    ["last name", "surname"],
    ["lname", "surname"],
    ["middle name", "middleName"],
    ["name as per aadhaar", "aadhaarName"],
    ["aadhaar name", "aadhaarName"],
    ["dob", "dateOfBirth"],
    ["date of birth", "dateOfBirth"],
    ["birth date", "dateOfBirth"],
    ["aadhaar", "aadhaarNumber"],
    ["aadhar", "aadhaarNumber"],
    ["aadhaar no", "aadhaarNumber"],
    ["uid", "aadhaarNumber"],
    ["mobile", "mobileNumber"],
    ["phone", "mobileNumber"],
    ["contact", "mobileNumber"],
    ["mother", "motherName"],
    ["father", "fatherName"],
    ["guardian", "guardianName"],
    ["caste category", "category"],
    ["social category", "category"],
    ["income", "annualFamilyIncome"],
    ["family income", "annualFamilyIncome"],
    ["annual income", "annualFamilyIncome"],
    ["address", "currentAddress"],
    ["district", "currentDistrict"],
    ["city", "currentCity"],
    ["pincode", "currentPincode"],
    ["pin", "currentPincode"],
    ["permanent address", "permanentAddress"],
    ["scheme", "scholarshipScheme"],
    ["fy", "financialYear"],
    ["class", "standard"],
    ["std", "standard"],
    ["division", "section"],
    ["div", "section"],
    ["sec", "section"],
    ["roll", "rollNumber"],
    ["roll no", "rollNumber"],
    ["gr no", "grNumber"],
    ["gr number", "grNumber"],
    ["admission no", "grNumber"],
    ["10th %", "percentage10th"],
    ["ssc %", "percentage10th"],
    ["12th %", "percentage12th"],
    ["hsc %", "percentage12th"],
    ["ifsc", "ifscCode"],
    ["account no", "accountNumber"],
    ["bank account", "accountNumber"],
    ["child uid", "childUid"],
    ["ssg uid", "childUid"],
    ["blood group", "bloodGroup"],
    ["પ્રથમ નામ", "firstName"],
    ["અટક", "surname"],
    ["જન્મ તારીખ", "dateOfBirth"],
    ["આધાર", "aadhaarNumber"],
    ["મોબાઇલ", "mobileNumber"],
  ];

  for (const [alias, key] of extras) add(alias, key);
  return map;
})();

export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[_\-./()]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim();
}

export function autoMapColumns(fileHeaders: string[]): Record<string, ImportFieldKey | ""> {
  const map: Record<string, ImportFieldKey | ""> = {};
  const used = new Set<ImportFieldKey>();

  for (const header of fileHeaders) {
    const n = normalizeHeader(header);
    const key = HEADER_ALIASES[n];
    if (key && !used.has(key)) {
      map[header] = key;
      used.add(key);
    } else {
      map[header] = "";
    }
  }
  return map;
}

function coerceFieldValue(key: ImportFieldKey, value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (DATE_FIELDS.has(key)) return parseImportDate(value);
  if (NUMBER_FIELDS.has(key)) {
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[,\s₹]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : "";
  }
  if (BOOLEAN_FIELDS.has(key)) {
    const s = String(value).toLowerCase().trim();
    if (["yes", "y", "true", "1", "હા"].includes(s)) return "Yes";
    if (["no", "n", "false", "0", "ના"].includes(s)) return "No";
    return value;
  }
  if (key === "gender") return normalizeGender(value);
  if (key === "ifscCode") return String(value).toUpperCase().trim();
  if (key === "aadhaarNumber" || key === "mobileNumber" || key === "accountNumber" || key === "childUid") {
    return String(value).replace(/\s/g, "").trim();
  }
  return String(value).trim();
}

export function applyColumnMap(
  rawRows: Record<string, unknown>[],
  columnMap: Record<string, ImportFieldKey | "">
): Record<string, unknown>[] {
  return rawRows.map((raw) => {
    const row: Record<string, unknown> = {};
    for (const [fileHeader, fieldKey] of Object.entries(columnMap)) {
      if (!fieldKey || !(raw[fileHeader] !== undefined)) continue;
      const val = raw[fileHeader];
      if (val === null || val === undefined || String(val).trim() === "") continue;
      row[fieldKey] = coerceFieldValue(fieldKey, val);
    }
    return row;
  });
}

export function validateImportRows(rows: Record<string, unknown>[]): RowValidation[] {
  return rows.map((raw, i) => {
    const normalized = normalizeStudentRow(raw);
    const errors = validateStudent(normalized);
    const aadhaar = normalized.aadhaarNumber || "";
    const name = [normalized.firstName, normalized.surname].filter(Boolean).join(" ") || "—";

    let status: RowValidation["status"] = "valid";
    if (!aadhaar) status = "error";
    else if (errors.length > 0) status = "warning";

    return { rowIndex: i + 1, aadhaarNumber: aadhaar, name, status, errors, normalized: raw };
  });
}

export async function parseStudentImportFile(
  file: File,
  sheetName?: string
): Promise<ParsedImportFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    const fileHeaders = parsed.meta.fields || [];
    const rawRows = (parsed.data || []).filter((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
    );
    return {
      fileName: file.name,
      sheetNames: ["CSV"],
      selectedSheet: "CSV",
      fileHeaders,
      rawRows,
      columnMap: autoMapColumns(fileHeaders),
    };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });
  const sheetNames = workbook.SheetNames.filter((n) => !/^instructions?$/i.test(n));
  const selectedSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
  const sheet = workbook.Sheets[selectedSheet];

  let headerRow = 0;
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    const cells: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      cells.push(cell ? String(cell.v ?? "").trim() : "");
    }
    const nonEmpty = cells.filter(Boolean).length;
    if (nonEmpty >= 3) {
      const matched = cells.filter((h) => HEADER_ALIASES[normalizeHeader(h)]).length;
      if (matched >= 2 || cells.some((h) => CSV_HEADERS.includes(h as ImportFieldKey))) {
        headerRow = r;
        break;
      }
    }
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    range: headerRow,
    raw: true,
  });

  const filtered = rawRows.filter((r) =>
    Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
  );

  const fileHeaders = filtered.length > 0 ? Object.keys(filtered[0]) : [];
  return {
    fileName: file.name,
    sheetNames,
    selectedSheet,
    fileHeaders,
    rawRows: filtered,
    columnMap: autoMapColumns(fileHeaders),
  };
}

export const SAMPLE_IMPORT_ROW: Record<ImportFieldKey, string | number> = {
  firstName: "RAMESH",
  middleName: "KUMAR",
  surname: "PATEL",
  aadhaarName: "RAMESH KUMAR PATEL",
  dateOfBirth: "15/07/2010",
  gender: "Male",
  aadhaarNumber: "123456789012",
  rationCardNumber: "",
  mobileNumber: "9876543210",
  email: "",
  motherName: "SUNITA BEN",
  fatherName: "MAHESH BHAI",
  guardianName: "",
  category: "OBC",
  caste: "Patel",
  religion: "Hindu",
  maritalStatus: "Unmarried",
  parentOccupation: "Farmer",
  isOrphan: "No",
  annualFamilyIncome: 120000,
  currentAddress: "At Post Songadh",
  currentDistrict: "Tapi",
  currentCity: "Songadh",
  currentPincode: "394670",
  permanentAddress: "At Post Songadh",
  permanentDistrict: "Tapi",
  permanentCity: "Songadh",
  permanentPincode: "394670",
  habitationType: "Own",
  familySize: 5,
  residentType: "Rural",
  isHosteler: "No",
  hostelType: "",
  hostelName: "",
  scholarshipScheme: "Post Matric Scholarship - OBC",
  financialYear: "2025-26",
  courseType: "Secondary",
  courseName: "Class 10 (SSC)",
  institutionDistrict: "Tapi",
  institutionName: "Your School Name",
  currentYear: "1st Year",
  admissionType: "Regular",
  startDate: "15/06/2025",
  completionDate: "31/03/2026",
  board10th: "GSEB",
  percentage10th: 72.5,
  year10th: "2025",
  board12th: "",
  percentage12th: "",
  year12th: "",
  previousQualification: "",
  bankName: "BANK OF BARODA",
  branchName: "SONGADH",
  accountNumber: "02670100012345",
  ifscCode: "BARB0FORTSO",
  accountHolderName: "RAMESH KUMAR PATEL",
  rollNumber: "15",
  grNumber: "1234",
  standard: "10",
  section: "A",
  childUid: "",
  bloodGroup: "B+",
};

export function downloadImportTemplate(format: "csv" | "xlsx") {
  const keys = [...CSV_HEADERS];
  const labels = keys.map((h) => CSV_HEADER_LABELS[h] || h);
  const sample = keys.map((k) => SAMPLE_IMPORT_ROW[k] ?? "");

  if (format === "csv") {
    const lines = [
      keys.join(","),
      labels.map((l) => `"${l}"`).join(","),
      sample.map((v) => `"${v}"`).join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, "scholarship_import_template.csv");
  } else {
    const ws = XLSX.utils.aoa_to_sheet([keys, labels, sample]);
    ws["!cols"] = keys.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    const guideRows = [
      ["Field", "Format / Example"],
      ...keys.map((k) => [CSV_HEADER_LABELS[k] || k, String(SAMPLE_IMPORT_ROW[k] || "—")]),
    ];
    const guide = XLSX.utils.aoa_to_sheet(guideRows);
    guide["!cols"] = [{ wch: 35 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, guide, "Column Guide");
    XLSX.writeFile(wb, "scholarship_import_template.xlsx");
  }
}

export function downloadFailedRows(rows: RowValidation[], format: "csv" | "xlsx") {
  const keys = [...CSV_HEADERS];
  const data = rows
    .filter((r) => r.status !== "valid")
    .map((r) => {
      const normalized = normalizeStudentRow(r.normalized);
      const base = keys.map((k) => normalized[k as keyof typeof normalized] ?? "");
      return [...base, r.errors.map((e) => e.message).join("; ")];
    });

  if (data.length === 0) return;

  const headers = [...keys.map((k) => CSV_HEADER_LABELS[k] || k), "Errors"];

  if (format === "csv") {
    const csv = [headers.join(","), ...data.map((row) => row.map((v) => `"${v}"`).join(","))].join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), "import_failed_rows.csv");
  } else {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
    XLSX.writeFile(wb, "import_failed_rows.xlsx");
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const IMPORT_BATCH_SIZE = 50;

export async function runBulkImport(
  rows: Record<string, unknown>[],
  options: { skipInvalid?: boolean; validRowIndexes?: Set<number> },
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const toSend = options.validRowIndexes
    ? rows.filter((_, i) => options.validRowIndexes!.has(i))
    : rows;

  const aggregate: ImportResult = { total: toSend.length, created: 0, updated: 0, failed: 0, errors: [] };

  for (let i = 0; i < toSend.length; i += IMPORT_BATCH_SIZE) {
    const batch = toSend.slice(i, i + IMPORT_BATCH_SIZE);
    const res = await fetch("/api/students/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: batch }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");

    aggregate.created += data.created || 0;
    aggregate.updated += data.updated || 0;
    aggregate.failed += data.failed || 0;
    if (data.errors?.length) aggregate.errors.push(...data.errors);
    onProgress?.(Math.min(i + batch.length, toSend.length), toSend.length);
  }

  return aggregate;
}

export function getMappedFieldCount(columnMap: Record<string, ImportFieldKey | "">): number {
  return new Set(Object.values(columnMap).filter(Boolean)).size;
}

export const REQUIRED_IMPORT_FIELDS: ImportFieldKey[] = [
  "firstName",
  "surname",
  "aadhaarName",
  "dateOfBirth",
  "gender",
  "aadhaarNumber",
  "mobileNumber",
];
