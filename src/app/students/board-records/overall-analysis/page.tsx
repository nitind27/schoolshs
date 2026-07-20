"use client";

import { useCallback, useState } from "react";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { OverallResultAnalysisForm } from "@/components/board-records/overall-result-analysis-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FINANCIAL_YEARS } from "@/lib/constants";
import type { OverallResultAnalysisPayload } from "@/lib/board-records/overall-result-analysis";
import { useT } from "@/i18n/locale-provider";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import type { SchoolClass } from "@/generated/prisma/client";

export default function OverallResultAnalysisPage() {
  const t = useT();
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [boardResultDate, setBoardResultDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverallResultAnalysisPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/classes?academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.classes || []).filter(
          (c: SchoolClass) => c.standard === "10" || String(c.standard) === "10"
        );
        setClasses(list);
      });
  }, [academicYear]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ academicYear });
      if (classId) params.set("classId", classId);
      if (boardResultDate) params.set("boardResultDate", boardResultDate);
      const res = await fetch(`/api/board-records/overall-analysis?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Load failed");
      setData(json);
      if (json.meta?.boardResultDate && !boardResultDate) {
        setBoardResultDate(json.meta.boardResultDate);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, classId, boardResultDate]);

  return (
    <CertificatePrintShell
      title={t("boardRecords.overallAnalysisTitle")}
      canPrint={!!data}
      hidePrint={false}
      printMargin="5mm"
    >
      <div className="no-print mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">
            {t("boardRecords.overallAnalysisHint")}
          </p>
        </div>
        <div className="p-4 flex flex-wrap items-end gap-3">
          <Select
            label={t("certificates.academicYear")}
            options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
          <Select
            label={t("certificates.class")}
            options={[
              { value: "", label: t("certificates.allClasses") },
              ...classes.map((c) => ({
                value: c.id,
                label: c.name || `${c.standard}-${c.section}`,
              })),
            ]}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
          <Input
            label={t("boardRecords.boardResultDate")}
            value={boardResultDate}
            onChange={(e) => setBoardResultDate(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
          <Button onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t("certificates.loadData")}
          </Button>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
      </div>

      {data ? (
        <>
          <p className="no-print text-xs text-slate-500 mb-3">
            {t("boardRecords.overallAnalysisPrintTip")}
          </p>
          <div className="ora-print-wrap print-area">
            <OverallResultAnalysisForm
              data={data}
              boardResultDate={boardResultDate}
              onBoardResultDateChange={setBoardResultDate}
            />
          </div>
        </>
      ) : (
        !loading && (
          <p className="no-print text-center text-slate-500 py-16">
            {t("boardRecords.overallAnalysisEmpty")}
          </p>
        )
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 5mm !important;
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
          body * {
            visibility: hidden !important;
          }
          .ora-print-wrap,
          .ora-print-wrap *,
          .ora-print,
          .ora-print *,
          .print-area:has(.ora-print-wrap),
          .print-area:has(.ora-print-wrap) * {
            visibility: visible !important;
          }
          .print-area:has(.ora-print-wrap) {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 200mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            z-index: 99999 !important;
            page-break-inside: avoid !important;
          }
          .ora-print-wrap {
            display: block !important;
            position: relative !important;
            width: 200mm !important;
            height: 285mm !important;
            max-height: 285mm !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
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
