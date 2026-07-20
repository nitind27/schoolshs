"use client";

import { useCallback, useState } from "react";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { DailyAttendanceBookView } from "@/components/certificates/daily-attendance-book";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FINANCIAL_YEARS } from "@/lib/constants";
import {
  computeAvgPercent,
  sumGrandTotals,
  type DailyAttendanceBookMeta,
  type DailyAttendanceBookRow,
} from "@/lib/certificates/daily-attendance-book";
import { useT } from "@/i18n/locale-provider";
import { Loader2, Printer, RefreshCw, Save } from "lucide-react";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DailyAttendanceBookPage() {
  const t = useT();
  const [dateIso, setDateIso] = useState(todayIso());
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<DailyAttendanceBookMeta | null>(null);
  const [rows, setRows] = useState<DailyAttendanceBookRow[]>([]);
  const [error, setError] = useState("");

  const canPrint = !!meta && rows.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date: dateIso, academicYear });
      const res = await fetch(`/api/certificates/daily-attendance-book?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setMeta(data.meta);
      setRows(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setMeta(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateIso, academicYear]);

  const save = useCallback(async () => {
    if (!meta) return;
    setSaving(true);
    setError("");
    try {
      const grandTotals = sumGrandTotals(rows.filter((r) => !r.isEmpty));
      const avgPercent = computeAvgPercent(grandTotals);
      const res = await fetch("/api/certificates/daily-attendance-book", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateIso: meta.dateIso,
          academicYear: meta.academicYear,
          dayOfWeek: meta.dayOfWeek,
          workingDay: meta.workingDay,
          shift: meta.shift,
          principalSign: meta.principalSign,
          avgPercent,
          rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMeta(data.meta);
      setRows(data.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [meta, rows]);

  const handlePrint = () => {
    window.print();
  };

  const handleRowsChange = (next: DailyAttendanceBookRow[]) => {
    setRows(next);
    if (meta) {
      const grandTotals = sumGrandTotals(next.filter((r) => !r.isEmpty));
      setMeta({ ...meta, grandTotals, avgPercent: computeAvgPercent(grandTotals) });
    }
  };

  return (
    <CertificatePrintShell
      title={t("certificates.dailyAttendanceTitle")}
      canPrint={canPrint}
      hidePrint
      printMargin="5mm"
    >
      <div className="no-print mb-4 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">{t("certificates.dailyAttendanceHint")}</p>
          </div>
          <div className="p-4 flex flex-wrap items-end gap-3">
            <Input
              label={t("certificates.dailyAttendanceDate")}
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
            />
            <Select
              label={t("certificates.academicYear")}
              options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
            <Button onClick={load} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("certificates.loadData")}
            </Button>
            {meta && (
              <Button
                variant="outline"
                onClick={save}
                disabled={saving}
                className="gap-1.5 border-emerald-300 text-emerald-800"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("certificates.dailyAttendanceSave")}
              </Button>
            )}
            <Button
              onClick={handlePrint}
              disabled={!canPrint}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="h-4 w-4" />
              {t("certificates.dailyAttendancePrint")}
            </Button>
          </div>
          {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
          {meta?.saved && (
            <p className="px-4 pb-3 text-xs text-emerald-700">{t("certificates.dailyAttendanceSaved")}</p>
          )}
          {canPrint && (
            <p className="px-4 pb-3 text-xs text-slate-500">{t("certificates.dailyAttendancePrintTip")}</p>
          )}
        </div>
      </div>

      {meta && rows.length > 0 ? (
        <div className="dab-print-wrap">
          <DailyAttendanceBookView
            meta={meta}
            rows={rows}
            editable
            onChange={handleRowsChange}
            onMetaChange={setMeta}
          />
        </div>
      ) : (
        !loading && (
          <p className="no-print text-center text-slate-500 py-16">{t("certificates.dailyAttendanceEmpty")}</p>
        )
      )}

      <style jsx global>{`
        @page dab-a4 {
          size: A4 portrait;
          margin: 5mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          html,
          body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dab-print-wrap,
          .dab-print-wrap *,
          .dab-print,
          .dab-print * {
            visibility: visible !important;
          }
          .print-area:has(.dab-print-wrap),
          .dab-print-wrap {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 200mm !important;
            height: 284mm !important;
            max-height: 284mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            z-index: 99999 !important;
            overflow: hidden !important;
            page: dab-a4;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          aside,
          nav,
          header,
          .sidebar,
          [data-sidebar] {
            display: none !important;
            visibility: hidden !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .lg\\:pl-\\[260px\\] {
            padding-left: 0 !important;
          }
        }
      `}</style>
    </CertificatePrintShell>
  );
}
