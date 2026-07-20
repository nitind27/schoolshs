"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
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
  const hasActiveFilters =
    Boolean(filters.standard || filters.section || filters.status || filters.category) ||
    (filters.gender && filters.gender !== "all");

  return (
    <>
      <div className={cn("dashboard-toolbar", className)}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{t("dashboard.reportTitle")}</p>
          <p className="text-xs text-slate-500">
            {lastUpdated
              ? t("dashboard.lastUpdated", {
                  time: lastUpdated.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
                })
              : t("dashboard.reportSubtitle")}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {hasActiveFilters ? t("dashboard.exportFilteredHint") : t("dashboard.exportAllHint")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {t("dashboard.exportExcel")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPdfDialogOpen(true)}
            disabled={!report || busy}
            className="gap-1.5 border-red-200 bg-red-50 font-semibold text-red-800 hover:bg-red-100"
          >
            <FileText className="h-3.5 w-3.5" />
            {t("dashboard.exportPdf")}
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
