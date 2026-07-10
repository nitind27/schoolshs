"use client";

import { useCallback, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { AttendanceEntryGrid } from "@/components/attendance/attendance-entry-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import type { AttendanceRow } from "@/lib/attendance";
import { countMonthPresent } from "@/lib/attendance";
import { ClipboardList, Loader2, Printer, Save, CheckCircle2 } from "lucide-react";

function AttendanceContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: searchParams.get("classId") || "",
    standard: "",
    section: "",
    academicYear: "2025-26",
    studentId: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState({ standard: "", section: "" });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    const params = new URLSearchParams({ month: filters.month, year: filters.year });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);

    const res = await fetch(`/api/attendance?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    setRows(data.rows || []);
    setMeta({ standard: data.standard || "", section: data.section || "" });
    setLoaded(true);
    setLoading(false);
  }, [filters]);

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: filters.classId || null,
        month: parseInt(filters.month, 10),
        year: parseInt(filters.year, 10),
        rows: rows.map((r) => ({
          studentId: r.studentId,
          attendance: r.attendance,
          schoolFee: r.schoolFee,
          termFee: r.termFee,
          admissionFee: r.admissionFee,
          otherFee: r.otherFee,
          note: r.note,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
    await load();
  };

  const markAllPresent = () => {
    setRows((prev) =>
      prev.map((row) => {
        const attendance = row.attendance.map(() => "P" as const);
        const mt = countMonthPresent(attendance);
        const prevT = parseInt(row.prevTotal || "0", 10) || 0;
        return {
          ...row,
          attendance,
          monthTotal: String(mt),
          cumulative: String(prevT + mt),
        };
      })
    );
  };

  const printRegisterUrl = () => {
    const p = new URLSearchParams({ month: filters.month, year: filters.year });
    if (filters.classId) p.set("classId", filters.classId);
    if (filters.standard) p.set("standard", filters.standard);
    if (filters.section) p.set("section", filters.section);
    return `/certificates/class-register?${p}&auto=1`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardList className="h-7 w-7 text-blue-600" />
            {t("attendance.pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("attendance.pageSubtitle")}</p>
        </div>
        {loaded && rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              {t("attendance.markAllStudentsPresent")}
            </Button>
            <Link href={printRegisterUrl()} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" />
                {t("attendance.printRegister")}
              </Button>
            </Link>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("attendance.save")}
            </Button>
          </div>
        )}
      </div>

      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showMonth />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {t("attendance.savedOk")}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !loaded ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>{t("attendance.selectClassHint")}</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">{t("attendance.noStudents")}</CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {t("attendance.classLabel")}: {meta.standard}-{meta.section}
            </span>
            <span>·</span>
            <span>{t("attendance.studentCount", { count: rows.length })}</span>
          </div>
          <AttendanceEntryGrid rows={rows} onChange={setRows} />
        </>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
