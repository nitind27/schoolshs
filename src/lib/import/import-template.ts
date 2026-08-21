import ExcelJS from "exceljs";
import {
  CATEGORIES,
  CLASS_SECTIONS,
  CSV_HEADER_LABELS,
  FINANCIAL_YEARS,
  GENDERS,
  RELIGIONS,
} from "@/lib/constants";
import { MANAGE_STANDARDS } from "@/lib/class-structure";
import {
  REQUIRED_IMPORT_FIELDS,
  SAMPLE_IMPORT_ROW,
  type ImportFieldKey,
} from "@/lib/import/student-import";

const LISTS: Partial<Record<ImportFieldKey, string[]>> = {
  gender: [...GENDERS],
  category: [...CATEGORIES],
  religion: [...RELIGIONS],
  standard: [...MANAGE_STANDARDS],
  section: [...CLASS_SECTIONS],
  isOrphan: ["Yes", "No"],
  isHosteler: ["Yes", "No"],
  financialYear: [...FINANCIAL_YEARS],
  residentType: ["Rural", "Urban"],
  habitationType: ["Own", "Rent"],
  maritalStatus: ["Unmarried", "Married"],
  courseType: ["Secondary", "Higher Secondary", "Arts", "Commerce"],
  bloodGroup: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
};

function colLetter(index: number) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function buildStudentImportWorkbook(
  fields: ImportFieldKey[],
  opts?: { includeSample?: boolean },
): Promise<Buffer> {
  const includeSample = opts?.includeSample !== false;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Codeat Education";
  wb.created = new Date();

  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  const listRange: Partial<Record<ImportFieldKey, string>> = {};
  let listCol = 1;
  for (const [key, values] of Object.entries(LISTS) as [ImportFieldKey, string[]][]) {
    if (!fields.includes(key)) continue;
    const letter = colLetter(listCol - 1);
    values.forEach((v, i) => {
      lists.getCell(i + 1, listCol).value = v;
    });
    listRange[key] = `Lists!$${letter}$1:$${letter}$${values.length}`;
    listCol += 1;
  }

  const readme = wb.addWorksheet("Instructions");
  readme.getColumn(1).width = 28;
  readme.getColumn(2).width = 72;
  readme.getCell("A1").value = "Student import template";
  readme.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F766E" } };
  const notes: [string, string][] = [
    ["1", "Do not change or delete the header row on the Students sheet."],
    ["2", "Yellow columns are required. Fill at least those for each student."],
    ["3", "Dates must be DD/MM/YYYY (example 15/07/2010)."],
    ["4", "Standard = 9 / 10 / 11 / 12. Section (A/B/C) is optional — division can be assigned later."],
    ["5", "If Permanent Address is empty, Current Address is copied on import."],
    ["6", "Same Aadhaar number updates the existing student in your school."],
    ["7", "Delete the example row (Aadhaar 123456789012) before upload, or it is skipped automatically."],
    ["8", "Incomplete rows still import as Draft — complete them later in Students."],
  ];
  notes.forEach(([n, text], i) => {
    readme.getCell(i + 3, 1).value = n;
    readme.getCell(i + 3, 2).value = text;
  });
  readme.getCell("A12").value = "Columns in this file";
  readme.getCell("A12").font = { bold: true };
  fields.forEach((key, i) => {
    const req = REQUIRED_IMPORT_FIELDS.includes(key);
    readme.getCell(13 + i, 1).value = req ? `${CSV_HEADER_LABELS[key]} *` : CSV_HEADER_LABELS[key];
    readme.getCell(13 + i, 2).value = String(SAMPLE_IMPORT_ROW[key] ?? "—");
    if (req) {
      readme.getCell(13 + i, 1).font = { color: { argb: "FFB45309" }, bold: true };
    }
  });

  const ws = wb.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
  const header = ws.addRow(fields.map((k) => CSV_HEADER_LABELS[k] || k));
  header.height = 28;
  header.eachCell((cell, colNumber) => {
    const key = fields[colNumber - 1];
    const required = REQUIRED_IMPORT_FIELDS.includes(key);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: required ? "FFD97706" : "FF0D9488" },
    };
    cell.alignment = { vertical: "middle", wrapText: true, horizontal: "center" };
    cell.note = required ? "Required" : CSV_HEADER_LABELS[key];
  });

  if (includeSample) {
    const sample = ws.addRow(fields.map((k) => SAMPLE_IMPORT_ROW[k] ?? ""));
    sample.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF64748B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    });
  }

  const dataStart = includeSample ? 3 : 2;
  const dataEnd = 202;
  for (let r = dataStart; r <= dataEnd; r += 1) {
    ws.getRow(r).height = 18;
  }

  const textKeys = new Set<ImportFieldKey>([
    "aadhaarNumber",
    "mobileNumber",
    "accountNumber",
    "childUid",
    "ifscCode",
    "dateOfBirth",
    "startDate",
    "completionDate",
    "currentPincode",
    "permanentPincode",
    "apaarId",
    "penNumber",
    "panNumber",
    "motherAadhaarNumber",
    "fatherAadhaarNumber",
  ]);

  fields.forEach((key, i) => {
    const col = ws.getColumn(i + 1);
    const label = CSV_HEADER_LABELS[key] || key;
    col.width = Math.min(36, Math.max(14, label.length + 4));
    if (textKeys.has(key)) col.numFmt = "@";
    const list = listRange[key];
    if (list) {
      for (let r = dataStart; r <= dataEnd; r += 1) {
        ws.getCell(r, i + 1).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [list],
          showErrorMessage: true,
          errorTitle: "Invalid value",
          error: `Pick a value from the list for ${label}`,
        };
      }
    }
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: fields.length },
  };

  const studentIdx = wb.worksheets.findIndex((s) => s.name === "Students");
  wb.views = [
    {
      x: 0,
      y: 0,
      width: 20000,
      height: 15000,
      firstSheet: 0,
      activeTab: Math.max(studentIdx, 0),
      visibility: "visible",
    },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function buildStudentImportCsv(fields: ImportFieldKey[], includeSample = true): string {
  const labels = fields.map((k) => CSV_HEADER_LABELS[k] || k);
  const lines = [labels.map((l) => `"${l.replace(/"/g, '""')}"`).join(",")];
  if (includeSample) {
    lines.push(
      fields
        .map((k) => `"${String(SAMPLE_IMPORT_ROW[k] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

