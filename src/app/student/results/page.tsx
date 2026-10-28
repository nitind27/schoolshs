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
import { Award, Printer, TrendingUp, Medal, BookOpen } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentResultsPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const reportCards = (student.reportCards as Record<string, unknown>[]) || [];
  const examResults = (student.examResults as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <StudentPageHeader
        icon={Award}
        title={t("studentPortal.myResults") || "My Academic Results"}
        subtitle={
          t("studentPortal.resultsSubtitle") ||
          "Official School Marksheets, Report Cards & Subject Scores"
        }
        backHref="/student"
        backLabel="Back to Dashboard"
      />

      {/* Aggregate Results Overview */}
      {reportCards.length > 0 && (
        <section className="student-subhero">
          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#f3d89a]">
                <Medal className="h-6 w-6" />
              </div>
              <div>
                <span className="student-subhero-kicker">Academic Record</span>
                <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
                  {reportCards.length} Published Report {reportCards.length === 1 ? "Card" : "Cards"}
                </h2>
                <p className="mt-0.5 text-xs text-teal-100/80">
                  Class {student.standard || "—"}-{student.section || "—"} • Roll: {student.rollNumber || "—"}
                </p>
              </div>
            </div>
            <span className="student-hero-chip w-fit">
              <span>Format</span>
              <strong>Official School</strong>
            </span>
          </div>
        </section>
      )}

      {/* Report Cards List */}
      {reportCards.length > 0 ? (
        <div className="space-y-4">
          {reportCards.map((rc) => {
            const pct = (rc.percentage as number)?.toFixed?.(1) ?? rc.percentage;
            const isFail = String(rc.result).includes("નાપાસ") || rc.result === "Fail";
            const rank = rc.rank != null && Number(rc.rank) > 0 ? Number(rc.rank) : null;

            return (
              <div
                key={rc.id as string}
                className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-teal-300"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 p-3">
                      <Award className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-teal-100/80 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                          {String(rc.academicYear || student.financialYear)}
                        </span>
                        <Badge status={isFail ? "rejected" : "approved"} />
                      </div>

                      <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
                        {t("results.reportCardClass", {
                          standard: rc.standard as string,
                          year: rc.academicYear as string,
                        })}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Total Marks:{" "}
                        <span className="font-bold text-slate-800">{String(rc.totalMarks || "—")}</span> • Grade:{" "}
                        <span className="font-bold text-emerald-700">{String(rc.grade || "A")}</span>
                        {rank && (
                          <>
                            {" "}• Class Rank: <span className="font-bold text-amber-600">#{rank}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Highlights & Print Action */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                    {rank && (
                      <div className="flex items-center gap-2 rounded-2xl bg-amber-50/80 border border-amber-200 px-3.5 py-2">
                        <Medal className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-amber-700">Rank</p>
                          <p className="text-base font-extrabold text-amber-800">#{rank}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-2">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-teal-700">Percentage</p>
                        <p className="text-lg font-black text-slate-900">{pct}%</p>
                      </div>
                    </div>

                    {rc.examId != null && (
                      <Link href={`/student/results/print?examId=${rc.examId as string}`}>
                        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm text-xs font-bold py-2.5">
                          <Printer className="h-4 w-4" />
                          <span>{t("results.print") || "Print Marksheet"}</span>
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
          title={t("results.notPublished") || "No Published Results"}
          description={
            t("studentPortal.resultsEmptyHint") ||
            "Report cards will appear here once term exams are evaluated and published by your class teacher."
          }
        />
      )}

      {/* Subject-Wise Marks Breakdown Table */}
      {examResults.length > 0 && (
        <StudentSection
          title={t("studentPortal.subjectWiseMarks") || "Subject-Wise Marks Breakdown"}
          description={t("studentPortal.subjectWiseDesc") || "Individual test marks across academic subjects"}
          icon={BookOpen}
        >
          <div className="student-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("results.exam") || "Exam"}</th>
                  <th>{t("results.subject") || "Subject"}</th>
                  <th className="text-right">{t("results.obtained") || "Obtained"}</th>
                  <th className="text-right">{t("results.achievement") || "Out Of / Max"}</th>
                  <th className="text-right">{t("results.grace") || "Grace"}</th>
                  <th>{t("results.grade") || "Grade"}</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((r) => (
                  <tr key={r.id as string}>
                    <td className="font-semibold text-slate-900">
                      {(r.exam as { name: string })?.name}
                    </td>
                    <td className="font-medium text-slate-700">
                      {(r.subject as { name: string })?.name}
                    </td>
                    <td className="text-right font-black text-teal-700">
                      {r.marksObtained as number}
                    </td>
                    <td className="text-right text-slate-600">
                      {(r.achievementMarks as number) || "—"}
                    </td>
                    <td className="text-right text-slate-600">
                      {(r.graceMarks as number) || "—"}
                    </td>
                    <td>
                      <span className="inline-flex rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-800">
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
