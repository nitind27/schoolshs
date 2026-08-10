"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import type { ResultCardData } from "@/components/results/annual-result-card";
import {
  SongadhExamReportCards,
  type ExamReportCardData,
} from "@/components/results/songadh-exam-report";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import {
  isPrimaryExamReportStandard,
  shouldUsePrimaryExamReport,
} from "@/lib/results/songadh-exam-report";

type PrintCard = ResultCardData & {
  hasMarks?: boolean;
  subjects: ExamReportCardData["subjects"];
};

function PrintInner() {
  const t = useT();
  const params = useSearchParams();
  const { letterhead, ready: featuresReady } = useSchoolFeatures();
  const examId = params.get("examId") || "";
  const studentId = params.get("studentId") || "";
  const classId = params.get("classId") || "";
  const mode = params.get("mode") || (studentId ? "particular" : "all");
  const [cards, setCards] = useState<PrintCard[]>([]);
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isParticular = mode === "particular" && !!studentId;
  const isAll = mode === "all" || (!studentId && mode !== "particular");

  const featureCode = (letterhead?.code || letterhead?.udiseCode || "").trim();
  const effectiveSchoolCode = schoolCode || featureCode;

  useEffect(() => {
    if (!examId && !classId) return;

    const loadPrint = async (resolvedExamId: string) => {
      const q = new URLSearchParams({ examId: resolvedExamId });
      if (isParticular && studentId) q.set("studentId", studentId);
      if (classId) q.set("classId", classId);

      const r = await fetch(`/api/results/print?${q}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");

      const code = String(d.school?.code || d.school?.udiseCode || "").trim();
      if (code) setSchoolCode(code);

      const mapped: PrintCard[] = (d.cards || []).map((c: PrintCard) => ({
        student: c.student,
        exam: d.exam,
        reportCard: c.reportCard,
        subjects: c.subjects,
        totals: c.totals,
        hasMarks: c.hasMarks,
      }));
      setCards(mapped);
    };

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void (async () => {
        try {
          let resolvedExamId = examId;
          if (!resolvedExamId && classId) {
            const sess = await fetch("/api/results/class-overview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "ensure_session", classId }),
            }).then((r) => r.json());
            resolvedExamId = sess.exam?.id;
          }
          if (!resolvedExamId) throw new Error(t("results.noExamSession"));
          await loadPrint(resolvedExamId);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Failed to load");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [examId, studentId, classId, mode, isParticular, t]);

  const printCards = isParticular
    ? cards.filter((c) => (c.student as { id?: string }).id === studentId)
    : cards;

  const printStandard =
    printCards[0]?.student.standard ||
    (printCards[0]?.exam as { standard?: string } | undefined)?.standard ||
    "";

  const useExamReport =
    shouldUsePrimaryExamReport(
      effectiveSchoolCode,
      letterhead?.udiseCode,
      printStandard,
    ) &&
    printCards.length > 0 &&
    printCards.every((c) =>
      isPrimaryExamReportStandard(c.student.standard || printStandard),
    );

  const studentName = printCards[0]
    ? studentFullNameGu(printCards[0].student)
    : "";

  const pageTitle = useExamReport
    ? isParticular
      ? `પરીક્ષા અહેવાલ · ${studentName}`
      : `પરીક્ષા અહેવાલ · ધો. ${printStandard || "1-8"} (${printCards.length})`
    : t("results.printAllTitle", { count: printCards.length });

  const canPrint = useExamReport && printCards.length > 0;

  const examReportCards: ExamReportCardData[] = printCards.map((c, i) => ({
    ...c,
    index: i + 1,
  }));

  if (!examId && !classId) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t("results.selectSessionToPrint")}
        <div className="mt-4">
          <Link href="/results">
            <Button variant="outline">{t("results.backToResults")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !featuresReady) {
    return <div className="p-8">{t("common.loading")}</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/results">
          <Button variant="outline">{t("results.backToResults")}</Button>
        </Link>
      </div>
    );
  }

  if (!useExamReport) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <p className="text-slate-700 mb-2 font-medium">
          પરીક્ષા અહેવાલ માત્ર પ્રાથમિક ધોરણ 1–8 (સોનગઢ) માટે છે.
        </p>
        <p className="text-sm text-slate-500 mb-4">
          પરિણામ (પ્રગતિપત્રક) માટે Results → Print Results વાપરો.
        </p>
        {classId && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href={`/results/class/${classId}`}>
              <Button variant="outline">{t("results.backToClass")}</Button>
            </Link>
            {examId && (
              <Link
                href={`/results/print?examId=${examId}&classId=${classId}${studentId ? `&studentId=${studentId}&mode=particular` : "&mode=all"}`}
              >
                <Button>પ્રગતિપત્રક (પરિણામ)</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <CertificatePrintShell
      title={pageTitle}
      canPrint={canPrint}
      printMargin="0"
    >
      {isAll && printCards.length > 0 && (
        <div className="no-print mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>પરીક્ષા અહેવાલ · {printCards.length} વિદ્યાર્થી · એકસાથે register print</strong>
          <p className="text-xs mt-1 text-emerald-700">
            Register order: પહેલા subject grids (3 tables), પછી student blocks (3) — દર 3 વિદ્યાર્થી માટે 2 પેજ.
          </p>
        </div>
      )}

      {isParticular && printCards.length === 1 && (
        <div className="no-print mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          એક વિદ્યાર્થી માટે — class સાથે એકસાથે print કરવા{" "}
          <Link
            href={`/results/exam-report/print?examId=${examId}&classId=${classId}&mode=all`}
            className="font-semibold underline"
          >
            બધા વિદ્યાર્થી print
          </Link>
          {" · "}
          <Link
            href={`/results/print?examId=${examId}&classId=${classId}&studentId=${studentId}&mode=particular`}
            className="text-blue-700 underline"
          >
            પ્રગતિપત્રક
          </Link>
        </div>
      )}

      {printCards.some((c) => !c.hasMarks) && (
        <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("results.someMarksMissing")}
        </div>
      )}

      <div className="result-print-bundle result-print-bundle-exam-report">
        <SongadhExamReportCards cards={examReportCards} />
      </div>

      <style jsx global>{`
        @media print {
          main.shell-main,
          main.shell-main > div,
          main > div {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .certificates-module {
            margin: 0 !important;
            padding: 0 !important;
          }
          .result-print-bundle-exam-report .ser-sheet--break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </CertificatePrintShell>
  );
}

export default function ExamReportPrintPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PrintInner />
    </Suspense>
  );
}
