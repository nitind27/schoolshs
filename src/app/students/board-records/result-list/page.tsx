"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateFilters, type CertFilters } from "@/components/certificates/certificate-filters";
import { BoardResultListTable } from "@/components/board-records/board-result-list";
import { ResultListGsebFetch } from "@/components/board-records/gseb-bulk-fetch";
import type { BoardResultListConfig } from "@/lib/board-records/result-list-config";
import type { BoardResultListRow } from "@/lib/board-records/result-list-data";
import { useT } from "@/i18n/locale-provider";

type Loaded = {
  class: { id: string; name: string; standard: string; section: string; stream?: string | null };
  config: BoardResultListConfig;
  rows: BoardResultListRow[];
};

export default function BoardResultListPage() {
  return (
    <Suspense>
      <BoardResultListContent />
    </Suspense>
  );
}

function BoardResultListContent() {
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
  const [data, setData] = useState<Loaded | null>(null);
  const [rows, setRows] = useState<BoardResultListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async () => {
    if (!filters.classId) {
      setError(t("boardRecords.resultListSelectClass"));
      return;
    }
    const cls = await fetch(`/api/classes?academicYear=${filters.academicYear}`)
      .then((r) => r.json())
      .then((d) => (d.classes || []).find((c: { id: string }) => c.id === filters.classId));
    if (cls && !["10", "12"].includes(cls.standard)) {
      setError(t("boardRecords.resultListStdOnly"));
      setData(null);
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/board-records/result-list?classId=${filters.classId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json);
      setRows(json.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters.classId, filters.academicYear, t]);

  useEffect(() => {
    if (filters.classId) load();
  }, [filters.classId, load]);

  const save = async () => {
    if (!data?.class.id) return;
    setSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const payload = {
        classId: data.class.id,
        rows: rows
          .filter((r) => !r.isEmpty)
          .map((r) => ({
            studentId: r.id,
            seatPrefix: r.seatPrefix,
            seatNumber: r.seatNumber,
            subjects: r.subjects,
            totalMarks: r.totalMarks,
            rankScore: r.rankScore,
            grade: r.grade,
            percentage: r.percentage,
            result: r.result,
          })),
      };
      const res = await fetch("/api/board-records/result-list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaveOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const seatLen = data?.class.standard === "12" ? 6 : 7;
  const gsebEligible = rows.filter(
    (r) => !r.isEmpty && r.seatNumber.replace(/\D/g, "").length >= seatLen,
  ).length;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={boardBackHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {t("boardRecords.title")}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("boardRecords.resultListTitle")}</h1>
            <p className="text-sm text-slate-500">{t("boardRecords.resultListSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!rows.length}>
            <Printer className="h-4 w-4" />
            {t("boardRecords.print")}
          </Button>
          <Button size="sm" onClick={save} disabled={!rows.length || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("boardRecords.save")}
          </Button>
        </div>
      </div>

      <div className="no-print">
        <CertificateFilters value={filters} onChange={setFilters} onLoad={load} />
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
          {t("boardRecords.resultListHint")}
        </p>
      </div>

      {error && (
        <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {saveOk && (
        <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("boardRecords.resultListSaved")}
        </div>
      )}

      {data && rows.length > 0 && (
        <div className="no-print">
          <ResultListGsebFetch
            classId={data.class.id}
            standard={data.class.standard as "10" | "12"}
            eligibleCount={gsebEligible}
            onComplete={({ rows: nextRows }) => {
              setRows(nextRows);
              setSaveOk(true);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : data && rows.length > 0 ? (
        <div className="print-area board-result-print bg-white p-2 md:p-4 overflow-x-auto">
          <BoardResultListTable
            rows={rows}
            config={data.config}
            classInfo={data.class}
            editable
            onRowsChange={setRows}
          />
        </div>
      ) : (
        !loading && (
          <p className="no-print text-center text-slate-500 py-16">{t("boardRecords.resultListEmpty")}</p>
        )
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-\\[260px\\] { padding-left: 0 !important; }
        }
        @page {
          size: A4 landscape;
          margin: 6mm;
        }
      `}</style>
    </div>
  );
}
