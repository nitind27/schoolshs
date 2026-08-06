"use client";

import { PageLoader, Spinner } from "@/components/ui/loader";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { StaffAttendanceGrid } from "@/components/staff-hr/staff-attendance-grid";
import { Select } from "@/components/ui/select";
import { STAFF_DESIGNATIONS } from "@/lib/constants";
import { MONTH_NAMES, type StaffAttendanceRow } from "@/lib/staff-hr";
import { useT } from "@/i18n/locale-provider";
import { ClipboardList, Save, CheckCircle2, IndianRupee, AlertCircle, Users } from "lucide-react";

export default function StaffAttendancePage() {
  const t = useT();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [designation, setDesignation] = useState("");
  const [rows, setRows] = useState<StaffAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    const params = new URLSearchParams({ month, year });
    if (designation) params.set("designation", designation);
    const res = await fetch(`/api/staff-hr/attendance?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    setRows(data.rows || []);
    setLoading(false);
  }, [month, year, designation]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/staff-hr/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        rows: rows.map((r) => ({ staffId: r.staffId, attendance: r.attendance, note: r.note })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setSaved(true);
    load();
  };

  return (
    <PageShell
      title={t("staffHr.attendanceTitle")}
      subtitle={t("staffHr.attendanceSubtitle")}
      icon={<ClipboardList className="h-6 w-6" />}
      accentColor="border-violet-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffHr.attendanceTitle") },
      ]}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/staff/payroll"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <IndianRupee className="h-4 w-4 shrink-0" />
            {t("staffHr.payrollTitle")}
          </Link>
          <button
            onClick={save}
            disabled={saving || !rows.length}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4 shrink-0" />}
            {t("common.save")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">

        {/* ── Filter card ──────────────────────────────────────── */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <ClipboardList className="h-4 w-4 text-violet-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {t("staffHr.filterPeriod")}
            </span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
            <Select
              label={t("staffHr.month")}
              className="w-full sm:w-40"
              options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <Select
              label={t("staffHr.year")}
              className="w-full sm:w-28"
              options={["2024", "2025", "2026"]}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <Select
              label={t("staffPage.designation")}
              className="col-span-2 w-full sm:w-52"
              options={[...STAFF_DESIGNATIONS]}
              emptyLabel={t("staffPage.allDesignations")}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
            {/* Staff count chip */}
            {rows.length > 0 && (
              <div className="col-span-2 sm:col-span-1 sm:ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700 self-end">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {rows.length} {t("staffHr.staffCount")}
              </div>
            )}
          </div>
        </div>

        {/* ── Status messages ──────────────────────────────────── */}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("staffHr.attendanceSaved")}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────── */}
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{t("staffHr.noStaff")}</p>
          </div>
        ) : (
          <StaffAttendanceGrid
            rows={rows}
            onChange={setRows}
            month={parseInt(month, 10)}
            year={parseInt(year, 10)}
          />
        )}
      </div>
    </PageShell>
  );
}
