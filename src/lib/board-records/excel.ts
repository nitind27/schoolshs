import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

/** Fixed column headers — do not change (locked in Excel) */
export const BOARD_EXCEL_HEADERS = [
  "Student ID",
  "Standard",
  "Stream",
  "Division",
  "Roll No",
  "First Name",
  "Surname",
  "GR Number",
  "Seat Prefix (A/B/C/S/P)",
  "Seat Number (7 digit)",
  "Percentage %",
  "Exam Year",
  "Board",
  "Category",
] as const;

export interface BoardExcelRow {
  studentId: string;
  standard: string;
  stream: string;
  division: string;
  roll: string;
  firstName: string;
  surname: string;
  grNumber: string;
  seatPrefix: string;
  seatNumber: string;
  percentage: number | "";
  examYear: string;
  board: string;
  category: string;
}

const EDITABLE_COLS = new Set([9, 10, 11, 12]); // Seat Prefix, Seat No, %, Year (1-based)

export function studentsToExcelRows(
  students: Array<{
    id: string;
    rollNumber?: string | null;
    firstName: string;
    surname: string;
    grNumber?: string | null;
    sscSeatPrefix?: string | null;
    sscSeatNumber?: string | null;
    hscSeatPrefix?: string | null;
    hscSeatNumber?: string | null;
    percentage10th?: number;
    percentage12th?: number | null;
    year10th?: string;
    year12th?: string | null;
    board10th?: string;
    board12th?: string | null;
    category?: string;
  }>,
  standard: "10" | "12",
  meta: { section: string; stream: string }
): BoardExcelRow[] {
  return students.map((s) => {
    const prefix = standard === "10" ? (s.sscSeatPrefix || "A") : (s.hscSeatPrefix || "A");
    const seatNum = standard === "10" ? (s.sscSeatNumber || "") : (s.hscSeatNumber || "");
    const pct = standard === "10" ? s.percentage10th : s.percentage12th;
    const year = standard === "10" ? s.year10th : s.year12th;
    const board = standard === "10" ? s.board10th : s.board12th;
    return {
      studentId: s.id,
      standard,
      stream: meta.stream || "—",
      division: meta.section,
      roll: s.rollNumber || "",
      firstName: s.firstName,
      surname: s.surname,
      grNumber: s.grNumber || "",
      seatPrefix: prefix,
      seatNumber: seatNum || "",
      percentage: pct && pct > 0 ? pct : "",
      examYear: year || "2025",
      board: board || "GSEB",
      category: s.category || "",
    };
  });
}

function rowToArray(r: BoardExcelRow): (string | number)[] {
  return [
    r.studentId, r.standard, r.stream, r.division, r.roll,
    r.firstName, r.surname, r.grNumber, r.seatPrefix, r.seatNumber,
    r.percentage, r.examYear, r.board, r.category,
  ];
}

export async function buildBoardExcelBuffer(
  rows: BoardExcelRow[],
  meta: { className: string; standard: string; section: string; stream: string }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Scholarship Portal";
  const examLabel = meta.standard === "10" ? "SSC (Class 10)" : "HSC (Class 12)";
  const sheetName = `Std${meta.standard}-${meta.section}`.slice(0, 31);
  const ws = wb.addWorksheet(sheetName);

  ws.mergeCells(1, 1, 1, BOARD_EXCEL_HEADERS.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `GSEB ${examLabel} Board Records — ${meta.className}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, BOARD_EXCEL_HEADERS.length);
  const infoCell = ws.getCell(2, 1);
  const streamPart = meta.stream && meta.stream !== "General" ? ` · Stream: ${meta.stream}` : "";
  infoCell.value = `Division ${meta.section}${streamPart} · Fill only Seat Prefix, Seat Number (7 digit), Percentage & Exam Year. Do NOT change header row or student details.`;
  infoCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  infoCell.alignment = { horizontal: "center", wrapText: true };

  const headerRow = ws.getRow(3);
  BOARD_EXCEL_HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
    cell.protection = { locked: true };
  });
  headerRow.height = 28;

  rows.forEach((r, idx) => {
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);
    rowToArray(r).forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      const col = colIdx + 1;
      const editable = EDITABLE_COLS.has(col);
      cell.protection = { locked: !editable };
      cell.fill = editable
        ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }
        : { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (col === 10) cell.numFmt = "0";
      if (col === 11) cell.numFmt = "0.00";
    });
  });

  ws.columns = [
    { width: 30 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 14 },
    { width: 12 }, { width: 10 }, { width: 8 }, { width: 10 },
  ];

  ws.views = [{ state: "frozen", ySplit: 3, xSplit: 0 }];

  await ws.protect("gseb2025", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
  });

  const instructions = wb.addWorksheet("Instructions");
  instructions.addRows([
    ["GSEB Board Records Excel — Instructions"],
    [""],
    ["LOCKED (do not edit):"],
    ["- Row 3 header names"],
    ["- Student ID, Standard, Stream, Division, Roll, Name, GR, Board, Category"],
    [""],
    ["EDITABLE (fill these):"],
    ["- Seat Prefix: A, B, C, S, or P"],
    ["- Seat Number: exactly 7 digits"],
    ["- Percentage %: e.g. 72.5"],
    ["- Exam Year: e.g. 2025"],
    [""],
    ["Upload this file back using Upload Excel button in portal."],
  ]);
  instructions.getColumn(1).width = 60;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function parseBoardExcel(buffer: Buffer): BoardExcelRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const dataSheetName =
    wb.SheetNames.find((n) => n.startsWith("Std")) ||
    wb.SheetNames.find((n) => n !== "Instructions") ||
    wb.SheetNames[0];
  const sheet = wb.Sheets[dataSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", range: 2 });

  return rawRows
    .map((row) => {
      const studentId = String(row["Student ID"] || row.studentId || "").trim();
      if (!studentId || studentId === "Student ID") return null;

      const seatPrefix = String(row["Seat Prefix (A/B/C/S/P)"] || row.seatPrefix || "A").trim().toUpperCase();
      const seatNumber = String(row["Seat Number (7 digit)"] || row.seatNumber || "").replace(/\D/g, "").slice(0, 7);

      const pctRaw = row["Percentage %"] ?? row.percentage ?? "";
      const pct = pctRaw === "" ? "" : Number(pctRaw);

      return {
        studentId,
        standard: String(row["Standard"] || row.standard || ""),
        stream: String(row["Stream"] || row.stream || ""),
        division: String(row["Division"] || row.division || ""),
        roll: String(row["Roll No"] || row.roll || ""),
        firstName: String(row["First Name"] || row.firstName || ""),
        surname: String(row["Surname"] || row.surname || ""),
        grNumber: String(row["GR Number"] || row.grNumber || ""),
        seatPrefix,
        seatNumber,
        percentage: Number.isFinite(pct) ? pct : "",
        examYear: String(row["Exam Year"] || row.examYear || "2025"),
        board: String(row["Board"] || row.board || "GSEB"),
        category: String(row["Category"] || row.category || ""),
      } satisfies BoardExcelRow;
    })
    .filter((r): r is BoardExcelRow => r !== null);
}
