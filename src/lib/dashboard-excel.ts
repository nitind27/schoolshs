import type ExcelJS from "exceljs";
import type { DashboardReportData } from "./dashboard-export";
import type { Student } from "@/generated/prisma/client";
import {
  STUDENT_EXPORT_HEADERS,
  groupStudentsByClass,
  sortStudentsForExport,
  studentExportColumnWidth,
  studentToExportCells,
  STATUS_LABELS,
} from "./dashboard-student-export";
import { buildFilterSlug } from "./dashboard-export-filters";
import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import {
  DEFAULT_EXPORT_OPTIONS,
  hasAnyExportOption,
  type DashboardExportOptions,
} from "./dashboard-export-options";

const BORDER = "FFCBD5E1";
const HEADER_BG = "FF1D4ED8";
const SECTION_BG = "FFEFF6FF";
const TOTAL_BG = "FFF1F5F9";

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function thinBorder(cell: ExcelJS.Cell): void {
  const b = { style: "thin" as const, color: { argb: BORDER } };
  cell.border = { top: b, bottom: b, left: b, right: b };
}

function rightAlignCols(colCount: number): number[] {
  if (colCount < 2) return [];
  return [colCount - 2, colCount - 1];
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, labels: string[]): void {
  const row = ws.getRow(rowNum);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    thinBorder(cell);
  });
  row.height = 28;
}

function styleDataRow(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  values: (string | number)[],
  opts?: { bold?: boolean; alt?: boolean; wrap?: boolean }
): void {
  const alignRight = rightAlignCols(values.length);
  const row = ws.getRow(rowNum);
  values.forEach((val, i) => {
    const cell = row.getCell(i + 1);
    cell.value = val;
    cell.font = { size: 9, bold: opts?.bold };
    cell.alignment = {
      horizontal: alignRight.includes(i) ? "right" : "left",
      vertical: "middle",
      wrapText: opts?.wrap ?? false,
    };
    if (opts?.alt) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    }
    if (opts?.bold) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
      cell.font = { size: 9, bold: true };
    }
    thinBorder(cell);
  });
  row.height = opts?.wrap ? 20 : 16;
}

function writeSectionTitle(ws: ExcelJS.Worksheet, rowNum: number, title: string, colSpan: number): void {
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  const cell = ws.getCell(rowNum, 1);
  cell.value = title;
  cell.font = { bold: true, size: 11, color: { argb: "FF1E40AF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_BG } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  thinBorder(cell);
  ws.getRow(rowNum).height = 24;
}

function writeTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  headers: string[],
  rows: (string | number)[][],
  totalRow?: (string | number)[]
): number {
  const cols = headers.length;
  writeSectionTitle(ws, startRow, title, cols);
  styleHeaderRow(ws, startRow + 1, headers);

  let r = startRow + 2;
  rows.forEach((row, idx) => {
    styleDataRow(ws, r, row, { alt: idx % 2 === 1 });
    r++;
  });

  if (totalRow) {
    styleDataRow(ws, r, totalRow, { bold: true });
    r++;
  }

  return r + 1;
}

function applyStudentColumnWidths(ws: ExcelJS.Worksheet, headers: string[]): void {
  headers.forEach((h, i) => {
    ws.getColumn(i + 1).width = studentExportColumnWidth(h, i);
  });
}

function addStudentDetailSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  students: Student[],
  meta: { schoolName: string; filterSummary: string; sectionTitle: string }
): void {
  const sorted = sortStudentsForExport(students);
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: false,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const headers = ["Sr.", ...STUDENT_EXPORT_HEADERS];
  const colCount = headers.length;

  ws.mergeCells(1, 1, 1, colCount);
  const t = ws.getCell(1, 1);
  t.value = `${meta.schoolName} — ${meta.sectionTitle}`;
  t.font = { bold: true, size: 12, color: { argb: "FF1E3A8A" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, colCount);
  ws.getCell(2, 1).value =
    `Filters: ${meta.filterSummary}  |  Students: ${sorted.length}  |  Columns: ${STUDENT_EXPORT_HEADERS.length} (full student record)`;
  ws.getCell(2, 1).font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  ws.getCell(2, 1).alignment = { horizontal: "center", wrapText: true };
  ws.getRow(2).height = 18;

  styleHeaderRow(ws, 3, headers);
  applyStudentColumnWidths(ws, headers);

  sorted.forEach((s, idx) => {
    styleDataRow(ws, 4 + idx, [idx + 1, ...studentToExportCells(s)], {
      alt: idx % 2 === 1,
      wrap: true,
    });
  });

  if (sorted.length > 0) {
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + sorted.length, column: headers.length },
    };
  }
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];
}

function writeSummaryReportSheet(wb: ExcelJS.Workbook, report: DashboardReportData): void {
  const ws = wb.addWorksheet("Report Summary", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 28 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
  ];

  ws.mergeCells(1, 1, 1, 5);
  const title = ws.getCell(1, 1);
  title.value = "DIGITAL GUJARAT SCHOLARSHIP PORTAL — DASHBOARD REPORT";
  title.font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  thinBorder(title);
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, 5);
  ws.getCell(2, 1).value = report.schoolName;
  ws.getCell(2, 1).font = { bold: true, size: 13, color: { argb: "FF0F172A" } };
  ws.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };

  styleDataRow(ws, 3, ["Report Date", report.generatedAt, "Active Filters", report.filterSummary, ""]);
  ws.getCell(3, 1).font = { bold: true, size: 10 };
  ws.getCell(3, 3).font = { bold: true, size: 10 };
  ws.mergeCells(3, 4, 3, 5);
  ws.getCell(3, 4).alignment = { wrapText: true, vertical: "middle" };

  let row = 5;
  row = writeTable(ws, row, "KEY SUMMARY", ["Metric", "Value", "Metric", "Value"], [
    ["Total Students", report.total, "Total Classes", report.totalClasses],
    ["Total Staff", report.totalStaff, "Completion Rate (%)", report.completionRate],
  ]);

  const stdRows = report.byStandard.map((r) => [`Std ${r.standard}`, r.count, `${pct(r.count, report.total)}%`]);
  const stdTotal = report.byStandard.reduce((s, r) => s + r.count, 0);
  row = writeTable(
    ws,
    row,
    "STUDENTS BY STANDARD",
    ["Standard", "Students", "% of Total"],
    stdRows,
    ["TOTAL", stdTotal, `${pct(stdTotal, report.total)}%`]
  );

  const catRows = report.byCategory.map((r) => [r.category || "Unknown", r.count, `${pct(r.count, report.total)}%`]);
  const catTotal = report.byCategory.reduce((s, r) => s + r.count, 0);
  row = writeTable(
    ws,
    row,
    "STUDENTS BY CATEGORY",
    ["Category", "Students", "% of Total"],
    catRows,
    ["TOTAL", catTotal, `${pct(catTotal, report.total)}%`]
  );

  const statusRows = Object.entries(report.byStatus)
    .filter(([, c]) => c > 0)
    .map(([s, c]) => [STATUS_LABELS[s] || s, c, `${pct(c, report.total)}%`]);
  writeTable(
    ws,
    row,
    "APPLICATION STATUS",
    ["Status", "Count", "% of Total"],
    statusRows,
    ["TOTAL", report.total, "100%"]
  );

  ws.views = [{ state: "frozen", ySplit: 3 }];
}

function addClassSummarySheet(
  wb: ExcelJS.Workbook,
  report: DashboardReportData,
  classGroups: ReturnType<typeof groupStudentsByClass>
): void {
  const classTotal = report.byClass.reduce((s, r) => s + r.count, 0);
  const groupByLabel = new Map(classGroups.map((g) => [g.label, g]));

  const classRows = report.byClass.map((r, i) => {
    const group = groupByLabel.get(r.label);
    return [
      i + 1,
      r.label,
      r.standard,
      r.section,
      r.count,
      `${pct(r.count, report.total)}%`,
      group?.sheetName || `Std ${r.standard}-${r.section}`,
    ];
  });

  const classWs = wb.addWorksheet("Class Index", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
  });
  classWs.columns = [
    { width: 6 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 18 },
  ];

  writeTable(
    classWs,
    1,
    "CLASS INDEX — each class has a separate sheet with FULL student details",
    ["Sr.", "Class", "Standard", "Division", "Students", "% of Total", "Excel Sheet"],
    classRows,
    ["", "TOTAL", "", "", classTotal, `${pct(classTotal, report.total)}%`, ""]
  );
}

export async function buildAdvancedDashboardExcelBuffer(
  report: DashboardReportData,
  students: Student[],
  filters: DashboardFilterValues,
  options: DashboardExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<ArrayBuffer> {
  if (!hasAnyExportOption(options)) {
    throw new Error("Select at least one export section");
  }

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Scholarship Portal";
  wb.created = new Date();

  const classGroups = groupStudentsByClass(students);
  const meta = { schoolName: report.schoolName, filterSummary: report.filterSummary };
  const hasFilters = Boolean(
    filters.standard || filters.section || filters.status || filters.category ||
    (filters.gender && filters.gender !== "all")
  );
  const allStudentsTitle = hasFilters
    ? `Filtered Students — Full Details (${students.length})`
    : `All Students — Full Details (${students.length})`;

  if (options.reportSummary) {
    writeSummaryReportSheet(wb, report);
  }

  if (options.classIndex) {
    addClassSummarySheet(wb, report, classGroups);
  }

  if (options.allStudents) {
    addStudentDetailSheet(wb, "All Students", students, {
      ...meta,
      sectionTitle: allStudentsTitle,
    });
  }

  const singleClassLocked = Boolean(filters.standard && filters.section);

  if (options.classSheets && !singleClassLocked) {
    for (const group of classGroups) {
      if (group.students.length === 0) continue;
      addStudentDetailSheet(wb, group.sheetName, group.students, {
        ...meta,
        sectionTitle: `Class ${group.label} — ${group.students.length} students (full record)`,
      });
    }
  }

  if (wb.worksheets.length === 0) {
    throw new Error("No sheets generated for selected options");
  }

  return wb.xlsx.writeBuffer();
}

export async function buildDashboardExcelBuffer(
  report: DashboardReportData,
  students: Student[] = [],
  filters: DashboardFilterValues = {
    standard: "",
    section: "",
    status: "",
    category: "",
    gender: "all",
  }
): Promise<ArrayBuffer> {
  if (students.length > 0) {
    return buildAdvancedDashboardExcelBuffer(report, students, filters);
  }

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Scholarship Portal";
  wb.created = new Date();
  writeSummaryReportSheet(wb, report);
  addClassSummarySheet(wb, report, []);
  return wb.xlsx.writeBuffer();
}

export function dashboardExcelFilename(
  report: DashboardReportData,
  filters: DashboardFilterValues
): string {
  const dateSlug = new Date().toISOString().split("T")[0];
  const safeSchool = report.schoolName.replace(/[^\w\s-]/g, "").trim().slice(0, 24) || "school";
  const slug = buildFilterSlug(filters);
  return `Students_${safeSchool}_${slug}_${dateSlug}.xlsx`;
}
