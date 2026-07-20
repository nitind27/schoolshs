"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { StaffAttendanceGrid } from "@/components/staff-hr/staff-attendance-grid";
import { Select } from "@/components/ui/select";
import { STAFF_DESIGNATIONS } from "@/lib/constants";
import { MONTH_NAMES, type StaffAttendanceRow } from "@/lib/staff-hr";
import { useT } from "@/i18n/locale-provider";
import { ClipboardList, Loader2, Save, CheckCircle2, IndianRupee } from "lucide-react";

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
        <div className="flex gap-2">
          <Link href="/staff/payroll" className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50">
            <IndianRupee className="h-4 w-4" /> {t("staffHr.payrollTitle")}
          </Link>
          <button onClick={save} disabled={saving || !rows.length}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap gap-3">
          <Select label={t("staffHr.month")} className="w-36"
            options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))}
            value={month} onChange={(e) => setMonth(e.target.value)} />
          <Select label={t("staffHr.year")} className="w-28"
            options={["2024", "2025", "2026"]} value={year} onChange={(e) => setYear(e.target.value)} />
          <Select label={t("staffPage.designation")} className="w-44"
            options={["", ...STAFF_DESIGNATIONS]} value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {t("staffHr.attendanceSaved")}
          </div>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500">{t("staffHr.noStaff")}</div>
        ) : (
          <StaffAttendanceGrid rows={rows} onChange={setRows} />
        )}
      </div>
    </PageShell>
  );
}
