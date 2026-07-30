"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import {
  AnnualResultCard,
  AnnualResultCards,
  type ResultCardData,
} from "@/components/results/annual-result-card";
import {
  HigherSecondaryMidResultCards,
  type HigherSecondaryTermPrintData,
} from "@/components/results/higher-secondary-mid-result-card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";

type PrintCard = ResultCardData & { hasMarks?: boolean };

function PrintInner() {
  const t = useT();
  const params = useSearchParams();
  const examId = params.get("examId") || "";
  const studentId = params.get("studentId") || "";
  const classId = params.get("classId") || "";
  const termKey = params.get("term") || "";
  const mode = params.get("mode") || (studentId ? "particular" : "all");
  const [cards, setCards] = useState<PrintCard[]>([]);
  const [termPrintData, setTermPrintData] =
    useState<HigherSecondaryTermPrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isParticular = mode === "particular" && !!studentId;
  const isAll = mode === "all" || (!studentId && mode !== "particular");

  useEffect(() => {
    if (!examId && !classId) return;

    const loadPrint = async (resolvedExamId: string) => {
      const q = new URLSearchParams({ examId: resolvedExamId });
      if (isParticular && studentId) q.set("studentId", studentId);
      if (classId) q.set("classId", classId);

      const r = await fetch(`/api/results/print?${q}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");

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
          if (termKey && classId) {
            const response = await fetch(
              `/api/results/term-marks?classId=${encodeURIComponent(classId)}&term=${encodeURIComponent(termKey)}`,
              { cache: "no-store" },
            );
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.error || "Failed to load term result");
            }
            setCards([]);
            setTermPrintData(payload as HigherSecondaryTermPrintData);
            return;
          }

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
          setTermPrintData(null);
          await loadPrint(resolvedExamId);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Failed to load");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [examId, studentId, classId, termKey, mode, isParticular, t]);

  const printCards = isParticular
    ? cards.filter((c) => (c.student as { id?: string }).id === studentId)
    : cards;
  const visibleTermData = termPrintData
    ? {
        ...termPrintData,
        students: isParticular
          ? termPrintData.students.filter(
              (student) => student.studentId === studentId,
            )
          : termPrintData.students,
      }
    : null;

  const studentName = visibleTermData?.students[0]
    ? studentFullNameGu(visibleTermData.students[0])
    : printCards[0]
      ? studentFullNameGu(printCards[0].student)
      : "";

  const pageTitle = visibleTermData
    ? `${visibleTermData.term.labelGu} — ધોરણ ${visibleTermData.class.standard} (${visibleTermData.students.length})`
    : isParticular
      ? t("results.printParticularTitle", { name: studentName })
      : t("results.printAllTitle", { count: printCards.length });

  const isStandard9Print =
    printCards.length > 0 &&
    printCards.every((card) => String(card.student.standard || "") === "9");
  const isHigherSecondaryTermPrint = Boolean(
    visibleTermData &&
      ["11", "12"].includes(String(visibleTermData.class.standard)) &&
      visibleTermData.term.role === "component",
  );
  const canPrint = visibleTermData
    ? isHigherSecondaryTermPrint && visibleTermData.students.length > 0
    : printCards.length > 0;

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

  if (loading) return <div className="p-8">{t("common.loading")}</div>;

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

  return (
    <CertificatePrintShell
      title={pageTitle}
      canPrint={canPrint}
      landscape={isStandard9Print || isHigherSecondaryTermPrint}
      printMargin={
        isStandard9Print || isHigherSecondaryTermPrint ? "5mm" : undefined
      }
    >
      {!visibleTermData && isAll && printCards.length > 1 && (
        <div className="no-print mb-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-pink-900">
          <strong>
            {t("results.printAllHint", { count: printCards.length })}
          </strong>
          <p className="text-xs mt-1 text-pink-700">
            {t("results.printAllHintDetail")}
          </p>
        </div>
      )}

      {!visibleTermData && isParticular && printCards.length === 1 && (
        <div className="no-print mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {t("results.printParticularHint", { name: studentName })}
        </div>
      )}

      {!canPrint ? (
        <div className="no-print p-8 text-center text-slate-500">
          <p>{t("results.noStudentsToPrint")}</p>
          <p className="text-sm mt-2">{t("results.noStudentsToPrintHint")}</p>
          {classId && (
            <Link
              href={`/results/class/${classId}`}
              className="inline-block mt-4"
            >
              <Button variant="outline">{t("results.backToClass")}</Button>
            </Link>
          )}
        </div>
      ) : visibleTermData && isHigherSecondaryTermPrint ? (
        <div className="result-print-bundle result-print-bundle-hs-mid">
          <HigherSecondaryMidResultCards data={visibleTermData} />
        </div>
      ) : (
        <>
          {printCards.some((c) => !c.hasMarks) && (
            <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("results.someMarksMissing")}
            </div>
          )}
          <div className="result-print-bundle">
            {printCards.length === 1 ? (
              <AnnualResultCard data={printCards[0]} />
            ) : (
              <AnnualResultCards cards={printCards} />
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          /* App shell padding/gaps otherwise push the sheet ~22mm down the page */
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
          .certificates-module > * {
            margin-top: 0 !important;
          }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .result-print-bundle .annual-result-card {
            page-break-after: always;
            break-after: page;
          }
          .result-print-bundle .std9-result-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .result-print-bundle .std9-result-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .result-print-bundle .std9-result-page > .annual-result-card {
            page-break-after: auto;
            break-after: auto;
          }
          .result-page {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .result-front {
            page-break-after: always;
          }
          .result-back {
            page-break-after: always;
          }
        }
      `}</style>
    </CertificatePrintShell>
  );
}

export default function ResultsPrintPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PrintInner />
    </Suspense>
  );
}
