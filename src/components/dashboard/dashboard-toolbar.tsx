"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import type { DashboardExportOptions } from "@/lib/dashboard-export-options";
import { DashboardExportDialog } from "@/components/dashboard/dashboard-export-dialog";

interface Props {
  report: DashboardReportData | null;
  filters: DashboardFilterValues;
  loading?: boolean;
  onRefresh: () => void;
  onPrintReady?: (rows: ExportStudentRow[], options: DashboardExportOptions) => void;
  lastUpdated?: Date | null;
  className?: string;
}

function filterSummary(filters: DashboardFilterValues, t: (k: string, p?: Record<string, string | number>) => string) {
  const parts: string[] = [];
  if (filters.academicYear) parts.push(t("dashboard.yearChip", { year: filters.academicYear }));
  if (filters.standard) parts.push(t("dashboard.stdLabel", { standard: filters.standard }));
  if (filters.section) parts.push(t("dashboard.divLabel", { section: filters.section }));
  if (filters.status) parts.push(t(`status.${filters.status}`));
  if (filters.category) parts.push(filters.category);
  if (filters.gender && filters.gender !== "all") {
    const gl = t(`gender.${filters.gender}`);
    parts.push(gl !== `gender.${filters.gender}` ? gl : filters.gender);
  }
  return parts;
}

export function DashboardToolbar({
  report,
  filters,
  loading,
  onRefresh,
  onPrintReady,
  lastUpdated,
  className,
}: Props) {
  const t = useT();
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const busy = loading;
  const summary = filterSummary(filters, t);
  const hasActiveFilters = summary.length > 0;

  return (
    <>
      <div className={cn("dashboard-toolbar", className)}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{t("dashboard.reportTitle")}</p>
          <p className="text-xs text-slate-500">
            {lastUpdated
              ? t("dashboard.lastUpdated", {
                  time: lastUpdated.toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("dashboard.reportSubtitle")}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
            <span>
              {hasActiveFilters
                ? t("dashboard.exportActiveSummary", { summary: summary.join(" · ") })
                : t("dashboard.exportAllHint")}
            </span>
          </p>
        </div>

        <div className="dashboard-toolbar-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={busy}
            className="gap-1.5 border-slate-200 bg-white font-semibold shadow-sm"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {t("dashboard.refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExcelDialogOpen(true)}
            disabled={!report || busy}
            className="gap-1.5 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
            title={t("dashboard.exportExcelHint")}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="flex flex-col items-start leading-tight">
              <span>{t("dashboard.exportExcel")}</span>
              <span className="text-[10px] font-medium text-emerald-700/80">
                {t("dashboard.exportExcelSub")}
              </span>
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPdfDialogOpen(true)}
            disabled={!report || busy}
            className="gap-1.5 border-red-200 bg-red-50 font-semibold text-red-800 hover:bg-red-100"
            title={t("dashboard.exportPdfHint")}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="flex flex-col items-start leading-tight">
              <span>{t("dashboard.exportPdf")}</span>
              <span className="text-[10px] font-medium text-red-700/80">
                {t("dashboard.exportPdfSub")}
              </span>
            </span>
          </Button>
        </div>
      </div>

      <DashboardExportDialog
        open={excelDialogOpen}
        onClose={() => setExcelDialogOpen(false)}
        mode="excel"
        filters={filters}
        report={report}
      />
      <DashboardExportDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        mode="pdf"
        filters={filters}
        report={report}
        onPrintReady={onPrintReady}
      />
    </>
  );
}
