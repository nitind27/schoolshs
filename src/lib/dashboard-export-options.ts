export interface DashboardExportOptions {
  reportSummary: boolean;
  classIndex: boolean;
  allStudents: boolean;
  classSheets: boolean;
}

/** @deprecated use DashboardExportOptions */
export type DashboardExcelExportOptions = DashboardExportOptions;

export const DEFAULT_EXPORT_OPTIONS: DashboardExportOptions = {
  reportSummary: true,
  classIndex: true,
  allStudents: true,
  classSheets: true,
};

export const DEFAULT_EXCEL_EXPORT_OPTIONS = DEFAULT_EXPORT_OPTIONS;

export const EXPORT_OPTION_KEYS = [
  "reportSummary",
  "classIndex",
  "allStudents",
  "classSheets",
] as const satisfies readonly (keyof DashboardExportOptions)[];

export const EXCEL_EXPORT_OPTION_KEYS = EXPORT_OPTION_KEYS;

const QUERY_MAP: Record<keyof DashboardExportOptions, string> = {
  reportSummary: "report",
  classIndex: "classIndex",
  allStudents: "allStudents",
  classSheets: "classSheets",
};

export function hasAnyExportOption(options: DashboardExportOptions): boolean {
  return EXPORT_OPTION_KEYS.some((k) => options[k]);
}

export function exportOptionsToQueryParam(options: DashboardExportOptions): string {
  return EXPORT_OPTION_KEYS.filter((k) => options[k])
    .map((k) => QUERY_MAP[k])
    .join(",");
}

export function parseExportOptionsParam(value: string | null): DashboardExportOptions | null {
  if (!value) return null;
  const parts = new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
  if (parts.size === 0) return null;
  return {
    reportSummary: parts.has("report"),
    classIndex: parts.has("classIndex"),
    allStudents: parts.has("allStudents"),
    classSheets: parts.has("classSheets"),
  };
}

export function resolveExportOptions(value: string | null): DashboardExportOptions {
  return parseExportOptionsParam(value) ?? { ...DEFAULT_EXPORT_OPTIONS };
}

export type DashboardExportMode = "excel" | "pdf";
