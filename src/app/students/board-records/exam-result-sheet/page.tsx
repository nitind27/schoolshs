"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateFilters, type CertFilters } from "@/components/certificates/certificate-filters";
import { ExamResultSheetRegister } from "@/components/board-records/exam-result-sheet-register";
import { ResultListGsebFetch } from "@/components/board-records/gseb-bulk-fetch";
import type { ExamResultSheetMeta, ExamResultSheetRow, ExamResultSubjectCol } from "@/lib/board-records/exam-result-sheet";
import { useT } from "@/i18n/locale-provider";

type Loaded = {
  class: { id: string; name: string; standard: string; section: string; stream?: string | null; academicYear: string };
  subjects: ExamResultSubjectCol[];
  meta: ExamResultSheetMeta;
  rows: ExamResultSheetRow[];
};

export default function ExamResultSheetPage() {
  return (
    <Suspense>
      <ExamResultSheetContent />
    </Suspense>
  );
}

function ExamResultSheetContent() {
  const t = useT();
  const pathname = usePathname();
  const boardBackHref = pathname.startsWith("/teacher")
    ? "/teacher/board-records"
    : "/students/board-records";
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<CertFilters>({
    classId: searchParams.get("classId") || "",
    standard: "",
    section: "",
    academicYear: "2025-26",
    studentId: "",
    month: "1",
    year: String(new Date().getFullYear()),
  });
  const [session, setSession] = useState<"March" | "July">("March");
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!filters.classId) {
      setError(t("boardRecords.examSheetSelectClass"));
      return;
    }
    const cls = await fetch(`/api/classes?academicYear=${filters.academicYear}`)
      .then((r) => r.json())
      .then((d) => (d.classes || []).find((c: { id: string }) => c.id === filters.classId));
    if (cls && !["10", "12"].includes(cls.standard)) {
      setError(t("boardRecords.examSheetStdOnly"));
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/board-records/exam-result-sheet?classId=${filters.classId}&session=${session}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.classId, filters.academicYear, session, t]);

  useEffect(() => {
    if (filters.classId) load();
  }, [filters.classId, session, load]);

  const canPrint = Boolean(data?.rows.some((r) => !r.isEmpty));
  const studentCount = data?.rows.filter((r) => !r.isEmpty).length ?? 0;

  const handlePrint = () => {
    if (!canPrint) return;
    window.print();
  };

  const seatLen = data?.class.standard === "12" ? 6 : 7;
  const gsebEligible =
    data?.rows.filter(
      (r) => !r.isEmpty && r.seatNumber.replace(/\D/g, "").length >= seatLen,
    ).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={boardBackHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {t("boardRecords.title")}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("boardRecords.examSheetTitle")}</h1>
            <p className="text-sm text-slate-500">{t("boardRecords.examSheetSubtitle")}</p>
          </div>
        </div>
        <Button
          size="default"
          onClick={handlePrint}
          disabled={!canPrint || loading}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Printer className="h-4 w-4" />
          {t("boardRecords.examSheetPrint")}
        </Button>
      </div>

      {/* Filters */}
      <div className="no-print space-y-3">
        <CertificateFilters value={filters} onChange={setFilters} onLoad={load} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">{t("boardRecords.examSheetSession")}</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value as "March" | "July")}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="March">{t("boardRecords.examSheetMarch")}</option>
            <option value="July">{t("boardRecords.examSheetJuly")}</option>
          </select>
        </div>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("boardRecords.examSheetHint")}
        </p>
      </div>

      {error && (
        <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="no-print">
          <ResultListGsebFetch
            classId={data.class.id}
            standard={data.class.standard as "10" | "12"}
            eligibleCount={gsebEligible}
            onComplete={() => {
              void load();
            }}
          />
        </div>
      )}

      {/* Sticky print action bar when register is loaded */}
      {canPrint && (
        <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 shadow-sm backdrop-blur">
          <div>
            <p className="text-sm font-bold text-emerald-900">{t("boardRecords.examSheetPrintReady")}</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              {t("boardRecords.examSheetPrintTip", {
                count: studentCount,
                std: data?.class.standard || "",
                section: data?.class.section || "",
              })}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handlePrint}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0"
          >
            <Printer className="h-5 w-5" />
            {t("boardRecords.examSheetPrint")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data && data.rows.length > 0 ? (
        <div className="exam-result-sheet-print print-area bg-white p-2 md:p-4 rounded-xl border border-slate-200">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t("boardRecords.examSheetSpreadHint")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!canPrint}
              className="gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("boardRecords.examSheetPrint")}
            </Button>
          </div>
          <ExamResultSheetRegister rows={data.rows} subjects={data.subjects} meta={data.meta} />
        </div>
      ) : (
        !error && (
          <p className="no-print text-center text-slate-500 py-16">{t("boardRecords.examSheetEmpty")}</p>
        )
      )}

      <style jsx global>{`
        /* Override dashboard.css print lock (body * { visibility: hidden !important }) */
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm;
          }

          html,
          body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .exam-result-sheet-print,
          .exam-result-sheet-print * {
            visibility: visible !important;
          }

          .exam-result-sheet-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            opacity: 1 !important;
            overflow: visible !important;
            z-index: 99999 !important;
          }

          .exam-result-sheet-print .no-print {
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
    </div>
  );
}
