import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import { filtersToQuery, buildFilterSlug } from "./dashboard-export-filters";
import type { ExportStudentRow } from "./dashboard-student-export";
import {
  DEFAULT_EXPORT_OPTIONS,
  exportOptionsToQueryParam,
  type DashboardExportOptions,
} from "./dashboard-export-options";

export interface DashboardReportData {
  schoolName: string;
  generatedAt: string;
  filterSummary: string;
  total: number;
  totalClasses: number;
  totalStaff: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byCategory: { category: string | null; count: number }[];
  byStandard: { standard: string; count: number }[];
  byClass: { label: string; standard: string; section: string; count: number }[];
  byGender: { male: number; female: number; other: number; total: number };
  categoryChart?: { category: string; count: number; color: string }[];
}

export interface DashboardExportJson {
  report: DashboardReportData;
  studentRows: ExportStudentRow[];
  total: number;
}

export async function fetchDashboardExport(
  filters: DashboardFilterValues
): Promise<DashboardExportJson> {
  const q = filtersToQuery(filters);
  const sep = q ? "&" : "?";
  const res = await fetch(`/api/stats/export${q}${sep}format=json`);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.error || "Export failed");
  return payload;
}

export async function downloadDashboardExcel(
  filters: DashboardFilterValues,
  options: DashboardExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<void> {
  const q = filtersToQuery(filters);
  const sheets = exportOptionsToQueryParam(options);
  const params = new URLSearchParams(q ? q.slice(1) : "");
  params.set("format", "xlsx");
  params.set("sheets", sheets);
  const res = await fetch(`/api/stats/export?${params.toString()}`);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || "Excel export failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const dateSlug = new Date().toISOString().split("T")[0];
  const filename = match?.[1] || `Dashboard_${buildFilterSlug(filters)}_${dateSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printDashboardReport(): void {
  window.print();
}
