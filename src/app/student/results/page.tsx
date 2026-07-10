"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentSection,
  StudentEmptyState,
} from "@/components/student-portal/student-portal-ui";
import { Award, Printer, TrendingUp, Medal } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentResultsPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const reportCards = (student.reportCards as Record<string, unknown>[]) || [];
  const examResults = (student.examResults as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6">
      <StudentPageHeader
        icon={Award}
        title={t("studentPortal.myResults")}
        subtitle={t("studentPortal.resultsSubtitle")}
      />

      {reportCards.length > 0 ? (
        <div className="grid gap-4">
          {reportCards.map((rc) => {
            const pct = (rc.percentage as number)?.toFixed?.(1) ?? rc.percentage;
            const isFail = String(rc.result).includes("નાપાસ") || rc.result === "Fail";
            return (
              <div key={rc.id as string} className="student-result-card">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
                      <Award className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {t("results.reportCardClass", {
                          standard: rc.standard as string,
                          year: rc.academicYear as string,
                        })}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {t("results.totalMarks", {
                          total: rc.totalMarks as number,
                          percent: pct,
                          grade: rc.grade as string,
                          rank: rc.rank as number,
                        })}
                      </p>
                      <div className="mt-2">
                        <Badge status={isFail ? "rejected" : "approved"} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {rc.rank != null && Number(rc.rank) > 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
                        <Medal className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-amber-700">{t("results.rank")}</p>
                          <p className="text-xl font-bold text-amber-700">#{rc.rank as number}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2">
                      <TrendingUp className="h-5 w-5 text-sky-600" />
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-sky-700">{t("studentPortal.percentage")}</p>
                        <p className="text-xl font-bold text-sky-700">{pct}%</p>
                      </div>
                    </div>
                    {rc.examId != null && (
                      <Link href={`/student/results/print?examId=${rc.examId as string}`}>
                        <Button className="bg-sky-600 hover:bg-sky-700">
                          <Printer className="h-4 w-4" />
                          {t("results.print")}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <StudentEmptyState
          icon={Award}
          title={t("results.notPublished")}
          description={t("studentPortal.resultsEmptyHint")}
        />
      )}

      {examResults.length > 0 && (
        <StudentSection title={t("studentPortal.subjectWiseMarks")} description={t("studentPortal.subjectWiseDesc")}>
          <div className="student-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("results.exam")}</th>
                  <th>{t("results.subject")}</th>
                  <th className="text-right">{t("results.obtained")}</th>
                  <th className="text-right">{t("results.achievement")}</th>
                  <th className="text-right">{t("results.grace")}</th>
                  <th>{t("results.grade")}</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((r) => (
                  <tr key={r.id as string}>
                    <td className="font-medium">{(r.exam as { name: string })?.name}</td>
                    <td>{(r.subject as { name: string })?.name}</td>
                    <td className="text-right font-bold text-sky-700">{r.marksObtained as number}</td>
                    <td className="text-right text-slate-600">{(r.achievementMarks as number) || "—"}</td>
                    <td className="text-right text-slate-600">{(r.graceMarks as number) || "—"}</td>
                    <td>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                        {r.grade as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StudentSection>
      )}
    </div>
  );
}
