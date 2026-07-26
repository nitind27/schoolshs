"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/staff-hr";
import { useT } from "@/i18n/locale-provider";
import { IndianRupee, RefreshCw, CheckCircle2, ClipboardList, Users, Wallet, Clock, Printer, Download } from "lucide-react";
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
  const [message, setMessage] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const monthLabel = MONTH_NAMES[parseInt(month, 10) - 1] || month;
  const periodLabel = `${monthLabel} ${year}`;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/staff-hr/payroll?month=${month}&year=${year}`);
    const data = await res.json();
    if (res.ok) {
      setRows(data.rows || []);
      setSummary(data.summary || summary);
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

  const generate = async () => {
    setGenerating(true);
    setMessage("");
    const res = await fetch("/api/staff-hr/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: parseInt(month, 10), year: parseInt(year, 10), action: "generate" }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      setMessage(t("staffHr.payrollGenerated", { count: data.generated }));
      load();
    } else {
      setMessage(data.error || "Failed");
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
        setMessage((data as { error?: string }).error || t("staffHr.markPaidFailed"));
        return;
      }
      setMessage(t("staffHr.markedPaidOk"));
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
      setMessage(t("staffHr.markedAllPaidOk", { count: pending.length }));
      await load();
    } finally {
      setStatusUpdating(null);
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/staff-hr/payroll/export?month=${month}&year=${year}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage((data as { error?: string }).error || t("staffHr.excelExportFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-payroll-${year}-${month.padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(t("staffHr.excelExported"));
    } catch {
      setMessage(t("staffHr.excelExportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

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
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
          >
            <ClipboardList className="h-4 w-4" /> {t("staffHr.attendanceTitle")}
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadExcel}
            disabled={loading || exporting || rows.length === 0}
          >
            {exporting ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
            {t("dashboard.exportExcel")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            disabled={loading || rows.length === 0}
          >
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
          {summary.pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllPaid}
              disabled={loading || statusUpdating !== null}
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
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
            onClick={generate}
            disabled={generating}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {generating ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            {t("staffHr.generatePayroll")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 print:hidden lg:grid-cols-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Users className="mb-2 h-5 w-5 text-blue-600" />
            <p className="text-2xl font-black text-slate-900">{summary.totalStaff}</p>
            <p className="text-xs text-slate-600">{t("staffHr.totalStaff")}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Wallet className="mb-2 h-5 w-5 text-emerald-600" />
            <p className="text-2xl font-black text-slate-900">{fmt(summary.totalNet)}</p>
            <p className="text-xs text-slate-600">{t("staffHr.totalNet")}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="mb-2 h-5 w-5 text-green-600" />
            <p className="text-2xl font-black text-slate-900">{summary.paidCount}</p>
            <p className="text-xs text-slate-600">{t("staffHr.paid")}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mb-2 h-5 w-5 text-amber-600" />
            <p className="text-2xl font-black text-slate-900">{summary.pendingCount}</p>
            <p className="text-xs text-slate-600">{t("staffHr.pending")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
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
            options={["2024", "2025", "2026"]}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <p className="pb-2 text-xs text-slate-500">{t("staffHr.statusHelp")}</p>
        </div>

        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 print:hidden">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20 print:hidden">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center print:hidden">
            <IndianRupee className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-600">{t("staffHr.noPayroll")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("staffHr.noPayrollHint")}</p>
          </div>
        ) : (
          <div className="payroll-print-area overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="pr-print-header">
              <h2 className="pr-school">{schoolName || t("staffHr.payrollTitle")}</h2>
              <p className="pr-title">{t("staffHr.payrollPrintTitle")}</p>
              <p className="pr-meta">
                {t("staffHr.payrollPrintPeriod", { period: periodLabel })}
              </p>
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
                {rows.map((r, idx) => (
                  <tr key={r.staffId}>
                    <td className="pr-center">{idx + 1}</td>
                    <td>
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{r.employeeId}</div>
                    </td>
                    <td className="text-slate-600">{r.designation}</td>
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
                        <span className="text-xs font-medium text-emerald-700">
                          {r.paidAt
                            ? new Date(r.paidAt).toLocaleDateString("en-IN")
                            : t("staffHr.paid")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-300 px-2.5 text-xs text-emerald-800 hover:bg-emerald-50"
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
                ))}
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

            <p className="mt-3 hidden px-1 text-[10px] text-slate-500 print:block">
              {t("staffHr.payrollPrintFooter")}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
