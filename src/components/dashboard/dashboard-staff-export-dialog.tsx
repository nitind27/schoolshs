"use client";

import { useEffect, useState } from "react";
import { CheckSquare, FileSpreadsheet, FileText, Square } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { useLocale, useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type {
  StaffPrintOptions,
  StaffPrintPayload,
} from "@/components/dashboard/dashboard-staff-print-report";

export type StaffExportMode = "excel" | "pdf";

type OptionKey = keyof StaffPrintOptions;

const OPTION_KEYS: OptionKey[] = ["summary", "register", "payroll"];

const DEFAULT_OPTIONS: StaffPrintOptions = {
  summary: true,
  register: true,
  payroll: true,
};

async function downloadUrl(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const match = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = match?.[1] || fallbackName;
  a.click();
  URL.revokeObjectURL(a.href);
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: StaffExportMode;
  month: number;
  year: number;
  fy: string;
  designation: string;
  periodLabel: string;
  schoolName: string;
  kpis: { label: string; value: string }[];
  designations: { label: string; value: number }[];
  onPrintReady: (payload: StaffPrintPayload) => void;
}

export function DashboardStaffExportDialog({
  open,
  onClose,
  mode,
  month,
  year,
  fy,
  designation,
  periodLabel,
  schoolName,
  kpis,
  designations,
  onPrintReady,
}: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [options, setOptions] = useState<StaffPrintOptions>({ ...DEFAULT_OPTIONS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setOptions({ ...DEFAULT_OPTIONS });
      setError(null);
    }
  }, [open]);

  const excelCan =
    mode === "excel"
      ? options.register || options.payroll || options.summary
      : options.summary || options.register || options.payroll;

  const toggle = (key: OptionKey) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const title =
    mode === "excel" ? t("dashboard.exportChooseTitleExcel") : t("dashboard.exportChooseTitlePdf");
  const action =
    mode === "excel" ? t("dashboard.exportDownloadExcel") : t("dashboard.exportDownloadPdf");
  const ActionIcon = mode === "excel" ? FileSpreadsheet : FileText;

  const optionTitle = (key: OptionKey) => {
    if (mode === "excel" && key === "summary") return t("dashboard.reportsStatementExcel");
    if (key === "summary") return t("dashboard.reportsStaffExportSummary");
    if (key === "register") return t("dashboard.reportsStaffExcel");
    return t("dashboard.reportsPayrollExcel");
  };

  const optionDesc = (key: OptionKey) => {
    if (mode === "excel" && key === "summary") return t("dashboard.reportsStaffExportStatementDesc");
    if (key === "summary") return t("dashboard.reportsStaffExportSummaryDesc");
    if (key === "register") return t("dashboard.reportsStaffExportRegisterDesc");
    return t("dashboard.reportsStaffExportPayrollDesc");
  };

  const handleAction = async () => {
    if (!excelCan || busy) return;
    setBusy(true);
    setError(null);
    const desigQ = designation ? `&designation=${encodeURIComponent(designation)}` : "";
    try {
      if (mode === "excel") {
        if (options.register) {
          await downloadUrl(
            `/api/staff/register-export${designation ? `?designation=${encodeURIComponent(designation)}` : ""}`,
            "staff-register.xlsx",
          );
        }
        if (options.payroll) {
          await downloadUrl(
            `/api/staff-hr/payroll/export?month=${month}&year=${year}`,
            `payroll-${month}-${year}.xlsx`,
          );
        }
        if (options.summary) {
          await downloadUrl(
            `/api/staff/salary-statement/export?fy=${encodeURIComponent(fy)}`,
            `salary-statement-${fy}.xlsx`,
          );
        }
        onClose();
        return;
      }

      let staffRows: StaffPrintPayload["staffRows"] = [];
      let payrollRows: StaffPrintPayload["payrollRows"] = [];
      let payrollTotals: StaffPrintPayload["payrollTotals"];

      if (options.register) {
        const res = await fetch(`/api/staff?limit=500${desigQ}`);
        const data = await res.json();
        const list = Array.isArray(data?.staff) ? data.staff : [];
        staffRows = list
          .filter((s: { designation?: string }) =>
            designation ? s.designation === designation : true,
          )
          .map((s: { employeeId?: string; firstName?: string; lastName?: string; designation?: string; mobileNumber?: string }) => ({
            emp: s.employeeId || "",
            name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
            designation: s.designation || "",
            mobile: s.mobileNumber || "",
          }));
      }

      if (options.payroll) {
        const res = await fetch(`/api/staff-hr/payroll?month=${month}&year=${year}`);
        const data = await res.json();
        const list = Array.isArray(data?.rows) ? data.rows : [];
        payrollRows = list
          .filter((r: { designation?: string }) =>
            designation ? r.designation === designation : true,
          )
          .map((r: { name?: string; designation?: string; netSalary?: number; paymentStatus?: string }) => ({
            name: r.name || "",
            designation: r.designation || "",
            net: r.netSalary || 0,
            status:
              r.paymentStatus === "paid"
                ? t("dashboard.hrPaid")
                : t("dashboard.hrPayPending"),
          }));
        payrollTotals = {
          net: payrollRows.reduce((s, r) => s + r.net, 0),
          paid: payrollRows.filter((r) => r.status === t("dashboard.hrPaid")).length,
          pending: payrollRows.filter((r) => r.status === t("dashboard.hrPayPending")).length,
        };
      }

      onPrintReady({
        schoolName: schoolName || "School",
        generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }),
        period: periodLabel,
        fy,
        options: {
          summary: options.summary,
          register: options.register,
          payroll: options.payroll,
        },
        kpis,
        designations,
        staffRows,
        payrollRows,
        payrollTotals,
      });

      document.body.classList.add("printing-staff");
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          const done = () => {
            document.body.classList.remove("printing-staff");
            window.removeEventListener("afterprint", done);
          };
          window.addEventListener("afterprint", done);
          setTimeout(done, 1500);
          onClose();
        }, 120);
      });
    } catch {
      setError(t("dashboard.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <InfoModal isOpen={open} onClose={onClose} title={title} eyebrow={t("dashboard.exportEyebrow")}>
      <div className={cn("space-y-5", locale === "gu" && "font-gujarati")}>
        <p className="text-sm text-slate-600">{t("dashboard.exportChooseDesc")}</p>
        <div className="im-export-summary">
          <span className="font-semibold text-slate-800">{periodLabel}</span>
          <span>·</span>
          <span>{fy}</span>
          {designation ? (
            <>
              <span>·</span>
              <span>{designation}</span>
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          {(mode === "excel" ? (["register", "payroll", "summary"] as OptionKey[]) : OPTION_KEYS).map((key) => {
            const checked = options[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn("im-export-option", checked && "is-checked")}
              >
                <span className={cn("mt-0.5 shrink-0", checked ? "text-teal-700" : "text-slate-400")}>
                  {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{optionTitle(key)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {optionDesc(key)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOptions({ ...DEFAULT_OPTIONS })}
            className="text-xs font-semibold"
          >
            {t("dashboard.exportSelectAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOptions({ summary: false, register: false, payroll: false })}
            className="text-xs font-semibold"
          >
            {t("dashboard.exportClearAll")}
          </Button>
        </div>

        {!excelCan ? (
          <p className="text-sm font-medium text-amber-700">{t("dashboard.exportNothingSelected")}</p>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("dashboard.exportCancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleAction()}
            disabled={!excelCan || busy}
            className={cn(
              "gap-2 font-semibold",
              mode === "excel" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
            )}
          >
            {busy ? <Spinner size="sm" /> : <ActionIcon className="h-4 w-4" />}
            {action}
          </Button>
        </div>
      </div>
    </InfoModal>
  );
}
