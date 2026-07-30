"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MONTH_NAMES } from "@/lib/staff-hr";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  IndianRupee,
  RefreshCw,
  CheckCircle2,
  ClipboardList,
  Users,
  Wallet,
  Clock,
  Printer,
  Download,
  Search,
  Banknote,
  AlertCircle,
} from "lucide-react";
import "./payroll.css";

interface PayrollRow {
  staffId: string;
  employeeId: string;
  name: string;
  designation: string;
  presentDays: number;
  absentDays: number;
  workingDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  paidAt: string | null;
  bankAccount: string;
  ifscCode: string;
}

type StatusFilter = "all" | "paid" | "pending";

const YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  return [String(y - 1), String(y), String(y + 1)];
})();

export default function StaffPayrollPage() {
  const t = useT();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    totalGross: 0,
    totalNet: 0,
    paidCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const monthLabel = MONTH_NAMES[parseInt(month, 10) - 1] || month;
  const periodLabel = `${monthLabel} ${year}`;

  const showMsg = (text: string, tone: "ok" | "err" = "ok") => {
    setMessage({ text, tone });
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/staff-hr/payroll?month=${month}&year=${year}`);
    const data = await res.json();
    if (res.ok) {
      setRows(data.rows || []);
      if (data.summary) setSummary(data.summary);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSchoolName(d?.user?.schoolName || ""))
      .catch(() => {});
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "paid" && r.paymentStatus !== "paid") return false;
      if (statusFilter === "pending" && r.paymentStatus === "paid") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        (r.designation || "").toLowerCase().includes(q) ||
        (r.bankAccount || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const filteredIds = useMemo(() => new Set(filteredRows.map((r) => r.staffId)), [filteredRows]);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    const res = await fetch("/api/staff-hr/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: parseInt(month, 10), year: parseInt(year, 10), action: "generate" }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      showMsg(t("staffHr.payrollGenerated", { count: data.generated }));
      load();
    } else {
      showMsg(data.error || "Failed", "err");
    }
  };

  const markPaid = async (staffId: string) => {
    setStatusUpdating(staffId);
    try {
      const res = await fetch("/api/staff-hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          action: "markPaid",
          staffId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showMsg((data as { error?: string }).error || t("staffHr.markPaidFailed"), "err");
        return;
      }
      showMsg(t("staffHr.markedPaidOk"));
      await load();
    } finally {
      setStatusUpdating(null);
    }
  };

  const markAllPaid = async () => {
    const pending = rows.filter((r) => r.paymentStatus !== "paid");
    if (pending.length === 0) return;
    if (!window.confirm(t("staffHr.markAllPaidConfirm", { count: pending.length }))) return;
    setStatusUpdating("all");
    try {
      for (const r of pending) {
        await fetch("/api/staff-hr/payroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: parseInt(month, 10),
            year: parseInt(year, 10),
            action: "markPaid",
            staffId: r.staffId,
          }),
        });
      }
      showMsg(t("staffHr.markedAllPaidOk", { count: pending.length }));
      await load();
    } finally {
      setStatusUpdating(null);
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/staff-hr/payroll/export?month=${month}&year=${year}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showMsg((data as { error?: string }).error || t("staffHr.excelExportFailed"), "err");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-payroll-${year}-${month.padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg(t("staffHr.excelExported"));
    } catch {
      showMsg(t("staffHr.excelExportFailed"), "err");
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  const paidPct =
    summary.totalStaff > 0 ? Math.round((summary.paidCount / summary.totalStaff) * 100) : 0;

  return (
    <PageShell
      title={t("staffHr.payrollTitle")}
      subtitle={t("staffHr.payrollSubtitle")}
      icon={<IndianRupee className="h-6 w-6" />}
      accentColor="border-emerald-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffHr.payrollTitle") },
      ]}
      actions={
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/staff/attendance"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
          >
            <ClipboardList className="h-4 w-4" /> {t("staffHr.attendanceTitle")}
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={downloadExcel}
            disabled={loading || exporting || rows.length === 0}
          >
            {exporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
            {t("dashboard.exportExcel")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => window.print()}
            disabled={loading || rows.length === 0}
          >
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
        </div>
      }
    >
      <div className="payroll-page space-y-4">
        {/* Period + generate */}
        <div className="payroll-toolbar print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label={t("staffHr.month")}
              className="w-36"
              options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Select
              label={t("staffHr.year")}
              className="w-28"
              options={YEAR_OPTIONS}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <div className="payroll-period-chip">
              <Banknote className="h-4 w-4" />
              <span>{periodLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {summary.pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllPaid}
                disabled={loading || statusUpdating !== null}
                className="cursor-pointer border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              >
                {statusUpdating === "all" ? (
                  <Spinner size="sm" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t("staffHr.markAllPaid")}
              </Button>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="payroll-generate-btn"
            >
              {generating ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              {t("staffHr.generatePayroll")}
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="payroll-stats print:hidden">
          <div className="payroll-stat payroll-stat--staff">
            <div className="payroll-stat__icon">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="payroll-stat__value">{summary.totalStaff}</p>
              <p className="payroll-stat__label">{t("staffHr.totalStaff")}</p>
            </div>
          </div>
          <div className="payroll-stat payroll-stat--net">
            <div className="payroll-stat__icon">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="payroll-stat__value">{fmt(summary.totalNet)}</p>
              <p className="payroll-stat__label">{t("staffHr.totalNet")}</p>
            </div>
          </div>
          <div className="payroll-stat payroll-stat--gross">
            <div className="payroll-stat__icon">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="payroll-stat__value">{fmt(summary.totalGross)}</p>
              <p className="payroll-stat__label">{t("staffHr.gross")}</p>
            </div>
          </div>
          <div className="payroll-stat payroll-stat--paid">
            <div className="payroll-stat__icon">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="payroll-stat__value">{summary.paidCount}</p>
              <p className="payroll-stat__label">{t("staffHr.paid")}</p>
              <div className="payroll-progress mt-1.5">
                <div className="payroll-progress__bar" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
          </div>
          <div className="payroll-stat payroll-stat--pending">
            <div className="payroll-stat__icon">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="payroll-stat__value">{summary.pendingCount}</p>
              <p className="payroll-stat__label">{t("staffHr.pending")}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        {rows.length > 0 && (
          <div className="payroll-filters print:hidden">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("staffHr.payrollSearch")}
                className="h-10 cursor-text pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", t("common.all")],
                  ["pending", t("staffHr.pending")],
                  ["paid", t("staffHr.paid")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "payroll-chip",
                    statusFilter === key && "payroll-chip--active",
                    key === "pending" && statusFilter === key && "payroll-chip--pending",
                    key === "paid" && statusFilter === key && "payroll-chip--paid"
                  )}
                >
                  {label}
                  {key === "pending" ? ` (${summary.pendingCount})` : null}
                  {key === "paid" ? ` (${summary.paidCount})` : null}
                </button>
              ))}
            </div>
            <p className="hidden text-xs text-slate-500 lg:block lg:ml-auto lg:max-w-xs lg:text-right">
              {t("staffHr.statusHelp")}
            </p>
          </div>
        )}

        {message && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm print:hidden",
              message.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {message.tone === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 print:hidden">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <div className="payroll-empty print:hidden">
            <div className="payroll-empty__icon">
              <IndianRupee className="h-8 w-8" />
            </div>
            <p className="text-base font-semibold text-slate-800">{t("staffHr.noPayroll")}</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">{t("staffHr.noPayrollHint")}</p>
            <button type="button" onClick={generate} disabled={generating} className="payroll-generate-btn mt-5">
              {generating ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              {t("staffHr.generatePayroll")}
            </button>
          </div>
        ) : (
          <div className="payroll-print-area overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="pr-print-header">
              <h2 className="pr-school">{schoolName || t("staffHr.payrollTitle")}</h2>
              <p className="pr-title">{t("staffHr.payrollPrintTitle")}</p>
              <p className="pr-meta">{t("staffHr.payrollPrintPeriod", { period: periodLabel })}</p>
              <div className="pr-summary-print" style={{ display: "none" }}>
                <span>
                  {t("staffHr.totalStaff")}: <strong>{summary.totalStaff}</strong>
                </span>
                <span>
                  {t("staffHr.gross")}: <strong>{fmt(summary.totalGross)}</strong>
                </span>
                <span>
                  {t("staffHr.totalNet")}: <strong>{fmt(summary.totalNet)}</strong>
                </span>
                <span>
                  {t("staffHr.paid")}: <strong>{summary.paidCount}</strong>
                </span>
                <span>
                  {t("staffHr.pending")}: <strong>{summary.pendingCount}</strong>
                </span>
              </div>
            </div>

            <div className="payroll-sheet-head print:hidden">
              <div>
                <p className="text-sm font-bold text-slate-900">{t("staffHr.payrollSheet")}</p>
                <p className="text-xs text-slate-500">
                  {filteredRows.length === rows.length
                    ? t("staffHr.payrollShowingAll", { count: rows.length })
                    : t("staffHr.payrollShowingFiltered", {
                        shown: filteredRows.length,
                        total: rows.length,
                      })}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="pr-tbl w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("staffHr.staffName")}</th>
                    <th>{t("staffPage.designation")}</th>
                    <th className="pr-center">{t("staffHr.present")}</th>
                    <th className="pr-center">{t("staffHr.absent")}</th>
                    <th>{t("staffHr.gross")}</th>
                    <th>{t("staffHr.deductions")}</th>
                    <th>{t("staffHr.netSalary")}</th>
                    <th>{t("staffHr.bank")}</th>
                    <th>{t("common.status")}</th>
                    <th className="pr-actions-col">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const visible = filteredIds.has(r.staffId);
                    return (
                      <tr
                        key={r.staffId}
                        className={cn(
                          r.paymentStatus === "paid" && "pr-row-paid",
                          !visible && "hidden print:table-row"
                        )}
                      >
                        <td className="pr-center">
                          <span className="pr-sr">{idx + 1}</span>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{r.employeeId}</div>
                        </td>
                        <td>
                          <span className="pr-desig">{r.designation || "—"}</span>
                        </td>
                        <td className="pr-center text-emerald-700">{r.presentDays}</td>
                        <td className="pr-center text-red-600">{r.absentDays}</td>
                        <td className="pr-num">{fmt(r.grossSalary)}</td>
                        <td className="pr-num text-red-600">{fmt(r.deductions)}</td>
                        <td className="pr-num font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                        <td className="font-mono text-xs text-slate-500">
                          {r.bankAccount || "—"}
                          {r.ifscCode ? (
                            <>
                              <br />
                              {r.ifscCode}
                            </>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={`pr-badge ${
                              r.paymentStatus === "paid" ? "pr-badge-paid" : "pr-badge-pending"
                            }`}
                          >
                            {r.paymentStatus === "paid" ? t("staffHr.paid") : t("staffHr.pending")}
                          </span>
                        </td>
                        <td className="pr-actions-col">
                          {r.paymentStatus === "paid" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {r.paidAt
                                ? new Date(r.paidAt).toLocaleDateString("en-IN")
                                : t("staffHr.paid")}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 cursor-pointer border-emerald-300 px-2.5 text-xs text-emerald-800 hover:bg-emerald-50"
                              disabled={statusUpdating !== null}
                              onClick={() => markPaid(r.staffId)}
                            >
                              {statusUpdating === r.staffId ? (
                                <Spinner size="sm" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {t("staffHr.markPaid")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 ? (
                    <tr className="print:hidden">
                      <td colSpan={11} className="py-10 text-center text-slate-500">
                        {t("common.noData")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                <tfoot>
                  <tr className="pr-foot">
                    <td colSpan={5} className="text-right">
                      {t("staffHr.totalNet")}
                    </td>
                    <td className="pr-num">{fmt(summary.totalGross)}</td>
                    <td />
                    <td className="pr-num text-emerald-700">{fmt(summary.totalNet)}</td>
                    <td colSpan={2} />
                    <td className="pr-actions-col" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-3 hidden px-1 text-[10px] text-slate-500 print:block">
              {t("staffHr.payrollPrintFooter")}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
