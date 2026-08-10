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
import {
  SongadhPragatiPatrakCard,
  SongadhPragatiPatrakCards,
  type PragatiPatrakCardData,
} from "@/components/results/songadh-pragati-patrak";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import {
  isPragatiResultStandard,
  shouldUsePragatiPatrakResult,
} from "@/lib/results/pragati-patrak";
import { CERTIFICATE_PACK_BRANDS } from "@/lib/certificates/school-brand";

type PrintCard = ResultCardData & {
  hasMarks?: boolean;
  subjects: PragatiPatrakCardData["subjects"];
};

function PrintInner() {
  const t = useT();
  const params = useSearchParams();
  const { letterhead, ready: featuresReady } = useSchoolFeatures();
  const examId = params.get("examId") || "";
  const studentId = params.get("studentId") || "";
  const classId = params.get("classId") || "";
  const termKey = params.get("term") || "";
  const mode = params.get("mode") || (studentId ? "particular" : "all");
  const [cards, setCards] = useState<PrintCard[]>([]);
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [termPrintData, setTermPrintData] =
    useState<HigherSecondaryTermPrintData | null>(null);
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

  const printStandard =
    printCards[0]?.student.standard ||
    (printCards[0]?.exam as { standard?: string } | undefined)?.standard ||
    "";

  const usePragatiPatrak =
    shouldUsePragatiPatrakResult(
      effectiveSchoolCode,
      letterhead?.udiseCode,
      printStandard,
    ) &&
    printCards.length > 0 &&
    printCards.every((c) =>
      isPragatiResultStandard(c.student.standard || printStandard),
    );

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
    : usePragatiPatrak
      ? `પ્રગતિપત્રક · ધો. ${printStandard || "1-8"} (${printCards.length})`
      : isParticular
        ? t("results.printParticularTitle", { name: studentName })
        : t("results.printAllTitle", { count: printCards.length });

  const isStandard9Print =
    !usePragatiPatrak &&
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

  const packBrand =
    CERTIFICATE_PACK_BRANDS[effectiveSchoolCode] ||
    CERTIFICATE_PACK_BRANDS["24261004403"];

  const pragatiCards: PragatiPatrakCardData[] = printCards.map((c) => ({
    ...c,
    schoolCode: effectiveSchoolCode,
    brand: {
      nameGu: packBrand.nameGu,
      sectionGu: "પ્રાથમિક વિભાગ - સોનગઢ",
      diseCode: packBrand.diseCode || effectiveSchoolCode,
      logoPath: "/shs/logo.png",
    },
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

  return (
    <CertificatePrintShell
      title={pageTitle}
      canPrint={canPrint}
      landscape={isStandard9Print || isHigherSecondaryTermPrint}
      printMargin={
        usePragatiPatrak
          ? "0"
          : isStandard9Print || isHigherSecondaryTermPrint
            ? "5mm"
            : undefined
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
      ) : usePragatiPatrak ? (
        <>
          {printCards.some((c) => !c.hasMarks) && (
            <div className="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("results.someMarksMissing")}
            </div>
          )}
          {usePragatiPatrak && isPragatiResultStandard(printStandard) ? (
            <p className="no-print mb-3 text-xs text-slate-500">
              પરિણામ (પ્રગતિપત્રક) · ધોરણ 1–8 · A4 Portrait · Scale 100% · Fit to page OFF
              {" · "}
              <Link href={`/results/exam-report/print?examId=${examId}&classId=${classId}${studentId ? `&studentId=${studentId}&mode=particular` : "&mode=all"}`} className="text-blue-600 underline">
                પરીક્ષા અહેવાલ (અલગ)
              </Link>
            </p>
          ) : null}
          <div className="result-print-bundle result-print-bundle-pragati">
            {pragatiCards.length === 1 ? (
              <SongadhPragatiPatrakCard data={pragatiCards[0]} />
            ) : (
              <SongadhPragatiPatrakCards cards={pragatiCards} />
            )}
          </div>
        </>
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
          .result-print-bundle-pragati,
          .result-print-bundle-pragati .pp-sheet {
            width: 210mm !important;
            margin: 0 !important;
          }
          .result-print-bundle .annual-result-card,
          .result-print-bundle .pp-sheet {
            page-break-after: always;
            break-after: page;
          }
          .result-print-bundle .std9-result-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .result-print-bundle .std9-result-page:last-child,
          .result-print-bundle .pp-sheet:last-child {
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
