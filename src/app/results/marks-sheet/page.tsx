"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateFilters, type CertFilters } from "@/components/certificates/certificate-filters";
import {
  ClassMarksSheetView,
  type MarksSheetStudent,
} from "@/components/results/class-marks-sheet";
import type { MarksSheetConfig } from "@/lib/results/marks-sheet-config";
import { useT } from "@/i18n/locale-provider";

type LoadedData = {
  class: {
    id: string;
    name: string;
    standard: string;
    section: string;
    stream?: string | null;
    academicYear: string;
  };
  exam: { id: string; isPublished: boolean };
  config: MarksSheetConfig;
  students: MarksSheetStudent[];
};

export default function MarksSheetPage() {
  return (
    <Suspense>
      <MarksSheetContent />
    </Suspense>
  );
}

function MarksSheetContent() {
  const searchParams = useSearchParams();
  const t = useT();
  const [filters, setFilters] = useState<CertFilters>({
    classId: searchParams.get("classId") || "",
    standard: "",
    section: "",
    academicYear: "2025-26",
    studentId: "",
    month: "1",
    year: String(new Date().getFullYear()),
  });
  const [data, setData] = useState<LoadedData | null>(null);
  const [students, setStudents] = useState<MarksSheetStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!filters.classId) {
      setError(t("results.marksSheetSelectClass"));
      return;
    }
    setLoading(true);
    setError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/results/marks-sheet?classId=${filters.classId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      setStudents(json.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [filters.classId, t]);

  useEffect(() => {
    if (filters.classId) load();
  }, [filters.classId, load]);

  const save = async () => {
    if (!data?.exam?.id || !data.class.id) return;
    setSaving(true);
    setError(null);
    setSaveOk(false);
    try {
      const payload = {
        examId: data.exam.id,
        classId: data.class.id,
        students: students.map((st) => ({
          studentId: st.id,
          passNumber: st.passNumber,
          attendancePresent: st.attendancePresent,
          attendanceTotal: st.attendanceTotal,
          finalTotal: st.finalTotal,
          percentage: st.percentage,
          result: st.computed.footer.result || "પાસ",
          subjectInputs: st.subjectInputs.map((s) => ({
            subjectCode: s.subject.code,
            first: s.first,
            second: s.second,
            internal: s.internal,
            annual: s.annual,
            achievement: s.achievement,
            special: s.special,
            grace: s.grace,
            letterGrade: s.letterGrade,
          })),
        })),
      };
      const res = await fetch("/api/results/marks-sheet", {
        method: "POST",
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

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/results">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {t("results.backToResults")}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("results.marksSheetTitle")}</h1>
            <p className="text-sm text-slate-500">{t("results.marksSheetSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!students.length}>
            <Printer className="h-4 w-4" />
            {t("results.print")}
          </Button>
          <Button size="sm" onClick={save} disabled={!students.length || saving || data?.exam?.isPublished}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("results.save")}
          </Button>
        </div>
      </div>

      <div className="no-print">
        <CertificateFilters value={filters} onChange={setFilters} onLoad={load} />
      </div>

      {error && (
        <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {saveOk && (
        <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("results.marksSaved")}
        </div>
      )}
      {data?.exam?.isPublished && (
        <div className="no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("results.marksSheetPublishedHint")}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : students.length > 0 && data ? (
        <div className="print-area marks-sheet-print bg-white p-2 md:p-4">
          <ClassMarksSheetView
            students={students}
            config={data.config}
            standard={data.class.standard}
            section={data.class.section}
            editable={!data.exam.isPublished}
            onStudentsChange={setStudents}
          />
        </div>
      ) : (
        !loading && (
          <p className="no-print text-center text-slate-500 py-16">{t("results.marksSheetEmpty")}</p>
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
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-\\[260px\\] { padding-left: 0 !important; }
        }
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
      `}</style>
    </div>
  );
}
