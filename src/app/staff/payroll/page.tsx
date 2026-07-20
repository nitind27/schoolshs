"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Select } from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/staff-hr";
import { useT } from "@/i18n/locale-provider";
import {
  IndianRupee, Loader2, RefreshCw, CheckCircle2, ClipboardList,
  Users, Wallet, Clock,
} from "lucide-react";

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
    totalStaff: 0, totalGross: 0, totalNet: 0, paidCount: 0, pendingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => { load(); }, [load]);

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
    await fetch("/api/staff-hr/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        action: "markPaid",
        staffId,
      }),
    });
    load();
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
        <div className="flex gap-2">
          <Link href="/staff/attendance" className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50">
            <ClipboardList className="h-4 w-4" /> {t("staffHr.attendanceTitle")}
          </Link>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("staffHr.generatePayroll")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <Users className="h-5 w-5 text-blue-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">{summary.totalStaff}</p>
            <p className="text-xs text-slate-600">{t("staffHr.totalStaff")}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <Wallet className="h-5 w-5 text-emerald-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">{fmt(summary.totalNet)}</p>
            <p className="text-xs text-slate-600">{t("staffHr.totalNet")}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">{summary.paidCount}</p>
            <p className="text-xs text-slate-600">{t("staffHr.paid")}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <Clock className="h-5 w-5 text-amber-600 mb-2" />
            <p className="text-2xl font-black text-slate-900">{summary.pendingCount}</p>
            <p className="text-xs text-slate-600">{t("staffHr.pending")}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap gap-3">
          <Select label={t("staffHr.month")} className="w-36"
            options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
            value={month} onChange={(e) => setMonth(e.target.value)} />
          <Select label={t("staffHr.year")} className="w-28"
            options={["2024", "2025", "2026"]} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>

        {message && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">{message}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-16 text-center">
            <IndianRupee className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">{t("staffHr.noPayroll")}</p>
            <p className="text-sm text-slate-500 mt-1">{t("staffHr.noPayrollHint")}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  {[t("staffHr.staffName"), t("staffPage.designation"), t("staffHr.present"), t("staffHr.absent"),
                    t("staffHr.gross"), t("staffHr.deductions"), t("staffHr.netSalary"), t("staffHr.bank"), t("common.status"), t("common.actions")].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.staffId} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.employeeId}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.designation}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700">{r.presentDays}</td>
                    <td className="px-3 py-3 text-center font-bold text-red-600">{r.absentDays}</td>
                    <td className="px-3 py-3 font-mono">{fmt(r.grossSalary)}</td>
                    <td className="px-3 py-3 font-mono text-red-600">{fmt(r.deductions)}</td>
                    <td className="px-3 py-3 font-mono font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                    <td className="px-3 py-3 text-xs font-mono text-slate-500">{r.bankAccount || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {r.paymentStatus === "paid" ? t("staffHr.paid") : t("staffHr.pending")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {r.paymentStatus !== "paid" && (
                        <button onClick={() => markPaid(r.staffId)}
                          className="text-xs font-semibold text-emerald-600 hover:underline">
                          {t("staffHr.markPaid")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={6} className="px-3 py-3 text-right">{t("staffHr.totalNet")}</td>
                  <td className="px-3 py-3 font-mono text-emerald-700">{fmt(summary.totalNet)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
