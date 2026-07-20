"use client";

import { useEffect, useState } from "react";
import { CheckSquare, FileSpreadsheet, FileText, Loader2, Square } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { DashboardFilterValues } from "@/components/dashboard/dashboard-filters";
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_OPTION_KEYS,
  hasAnyExportOption,
  type DashboardExportMode,
  type DashboardExportOptions,
} from "@/lib/dashboard-export-options";
import {
  downloadDashboardExcel,
  fetchDashboardExport,
  printDashboardReport,
  type DashboardReportData,
} from "@/lib/dashboard-export";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: DashboardExportMode;
  filters: DashboardFilterValues;
  report: DashboardReportData | null;
  onPrintReady?: (rows: import("@/lib/dashboard-student-export").ExportStudentRow[], options: DashboardExportOptions) => void;
}

type OptionKey = keyof DashboardExportOptions;

function optionMeta(mode: DashboardExportMode, key: OptionKey): { titleKey: string; descKey: string } {
  if (mode === "excel") {
    const excel: Record<OptionKey, { titleKey: string; descKey: string }> = {
      reportSummary: { titleKey: "dashboard.exportReportSummary", descKey: "dashboard.exportReportSummaryDesc" },
      classIndex: { titleKey: "dashboard.exportClassIndex", descKey: "dashboard.exportClassIndexDesc" },
      allStudents: { titleKey: "dashboard.exportAllStudents", descKey: "dashboard.exportAllStudentsDesc" },
      classSheets: { titleKey: "dashboard.exportClassSheets", descKey: "dashboard.exportClassSheetsDesc" },
    };
    return excel[key];
  }

  const pdf: Record<OptionKey, { titleKey: string; descKey: string }> = {
    reportSummary: { titleKey: "dashboard.exportReportSummary", descKey: "dashboard.exportPdfReportSummaryDesc" },
    classIndex: { titleKey: "dashboard.exportClassIndex", descKey: "dashboard.exportPdfClassIndexDesc" },
    allStudents: { titleKey: "dashboard.exportAllStudents", descKey: "dashboard.exportPdfAllStudentsDesc" },
    classSheets: { titleKey: "dashboard.exportClassSheets", descKey: "dashboard.exportPdfClassSheetsDesc" },
  };
  return pdf[key];
}

function modalTitle(mode: DashboardExportMode, t: (k: string) => string): string {
  return mode === "excel" ? t("dashboard.exportChooseTitleExcel") : t("dashboard.exportChooseTitlePdf");
}

function actionLabel(mode: DashboardExportMode, t: (k: string) => string): string {
  return mode === "excel" ? t("dashboard.exportDownloadExcel") : t("dashboard.exportDownloadPdf");
}

export function DashboardExportDialog({
  open,
  onClose,
  mode,
  filters,
  report,
  onPrintReady,
}: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [options, setOptions] = useState<DashboardExportOptions>({ ...DEFAULT_EXPORT_OPTIONS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setOptions({ ...DEFAULT_EXPORT_OPTIONS });
      setError(null);
    }
  }, [open]);

  const toggle = (key: OptionKey) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const selectAll = () => {
    setOptions({ ...DEFAULT_EXPORT_OPTIONS });
    setError(null);
  };

  const clearAll = () => {
    setOptions({
      reportSummary: false,
      classIndex: false,
      allStudents: false,
      classSheets: false,
    });
  };

  const canProceed = hasAnyExportOption(options) && Boolean(report);

  const handleAction = async () => {
    if (!report || !canProceed || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "excel") {
        await downloadDashboardExcel(filters, options);
        onClose();
        return;
      }

      const data = await fetchDashboardExport(filters);
      onPrintReady?.(data.studentRows, options);
      requestAnimationFrame(() => {
        setTimeout(() => {
          printDashboardReport();
          onClose();
        }, 100);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const classCount = report?.byClass?.length ?? 0;
  const studentCount = report?.total ?? 0;
  const ActionIcon = mode === "excel" ? FileSpreadsheet : FileText;

  return (
    <InfoModal isOpen={open} onClose={onClose} title={modalTitle(mode, t)}>
      <div className={cn("space-y-5", locale === "gu" && "font-gujarati")}>
        <p className="text-sm text-slate-600">{t("dashboard.exportChooseDesc")}</p>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{report?.filterSummary}</span>
          <span>·</span>
          <span>{t("dashboard.exportStudentCount", { count: studentCount })}</span>
          <span>·</span>
          <span>{t("dashboard.exportClassCount", { count: classCount })}</span>
        </div>

        <div className="space-y-2">
          {EXPORT_OPTION_KEYS.map((key) => {
            const meta = optionMeta(mode, key);
            const checked = options[key];
            const hint =
              key === "classSheets" && classCount > 0
                ? t(
                    mode === "excel" ? "dashboard.exportClassSheetsHint" : "dashboard.exportPdfClassSheetsHint",
                    { count: classCount }
                  )
                : key === "allStudents" && studentCount > 0
                  ? t("dashboard.exportAllStudentsHint", { count: studentCount })
                  : null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  checked
                    ? "border-emerald-300 bg-emerald-50/80 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="mt-0.5 shrink-0 text-emerald-700">
                  {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{t(meta.titleKey)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{t(meta.descKey)}</span>
                  {hint && (
                    <span className="mt-1 block text-[11px] font-medium text-emerald-700">{hint}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll} className="text-xs font-semibold">
            {t("dashboard.exportSelectAll")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll} className="text-xs font-semibold">
            {t("dashboard.exportClearAll")}
          </Button>
        </div>

        {!canProceed && (
          <p className="text-sm font-medium text-amber-700">{t("dashboard.exportNothingSelected")}</p>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("dashboard.exportCancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAction}
            disabled={!canProceed || busy}
            className={cn(
              "gap-2 font-semibold",
              mode === "excel" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActionIcon className="h-4 w-4" />}
            {actionLabel(mode, t)}
          </Button>
        </div>
      </div>
    </InfoModal>
  );
}
