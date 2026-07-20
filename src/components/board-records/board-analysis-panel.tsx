"use client";

import { Trophy, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3 } from "lucide-react";
import type { SchoolBoardAnalysis } from "@/lib/board-records/gseb";
import { GSEB_GRADES } from "@/lib/board-records/gseb";
import { useT } from "@/i18n/locale-provider";

export function BoardAnalysisPanel({ analysis }: { analysis: SchoolBoardAnalysis }) {
  const t = useT();
  const maxGrade = Math.max(...Object.values(analysis.gradeCounts), 1);

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t("boardRecords.totalStudents"), value: analysis.total, icon: Users, color: "from-blue-600 to-blue-700" },
          { label: t("boardRecords.resultsEntered"), value: analysis.withResult, icon: CheckCircle, color: "from-emerald-600 to-teal-700" },
          { label: t("boardRecords.pendingResults"), value: analysis.pending, icon: Clock, color: "from-amber-500 to-orange-600" },
          { label: t("boardRecords.passRate"), value: `${analysis.passRate}%`, icon: TrendingUp, color: "from-violet-600 to-purple-700" },
          { label: t("boardRecords.schoolAverage"), value: analysis.average != null ? `${analysis.average}%` : "—", icon: BarChart3, color: "from-indigo-600 to-indigo-700" },
          { label: t("boardRecords.highestScore"), value: analysis.highest != null ? `${analysis.highest}%` : "—", icon: Trophy, color: "from-rose-500 to-pink-600" },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl p-4 text-white bg-gradient-to-br ${m.color} shadow-md`}>
            <m.icon className="h-4 w-4 text-white/70 mb-2" />
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-wide">{m.label}</p>
            <p className="text-2xl font-bold mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade distribution */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-800 mb-4">{t("boardRecords.gradeDistribution")}</p>
          <div className="space-y-2.5">
            {GSEB_GRADES.map((g) => {
              const count = analysis.gradeCounts[g.grade];
              const pct = analysis.withResult ? Math.round((count / analysis.withResult) * 100) : 0;
              return (
                <div key={g.grade} className="flex items-center gap-3">
                  <span className={`w-8 text-center text-xs font-black ${g.color}`}>{g.grade}</span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg ${g.bar} transition-all duration-500`}
                      style={{ width: `${(count / maxGrade) * 100}%`, minWidth: count > 0 ? "8px" : 0 }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold text-slate-700">
                      {count} {t("boardRecords.studentsShort")}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="flex items-center gap-1 text-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> {t("boardRecords.passed")}: {analysis.passCount}</span>
            <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> {t("boardRecords.failed")}: {analysis.failCount}</span>
          </div>
        </div>

        {/* Division comparison + toppers */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-800 mb-4">{t("boardRecords.divisionComparison")}</p>
            {analysis.divisions.length === 0 ? (
              <p className="text-sm text-slate-400">{t("boardRecords.noRecordsFound")}</p>
            ) : (
              <div className="space-y-3">
                {analysis.divisions.map((d) => (
                  <div key={d.section || "_"}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{d.label}</span>
                      <span className="text-slate-500">{d.total} {t("boardRecords.studentsShort")} · {d.passRate}% {t("boardRecords.passShort")}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                        style={{ width: `${d.average ?? 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t("boardRecords.avg")}: {d.average != null ? `${d.average}%` : "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {analysis.toppers.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
              <p className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" /> {t("boardRecords.schoolToppers")}
              </p>
              <div className="space-y-2">
                {analysis.toppers.map((top) => (
                  <div key={top.rank} className="flex items-center gap-3 rounded-xl bg-white/80 border border-amber-100 px-3 py-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${top.rank === 1 ? "bg-amber-400 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
                      {top.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{top.name}</p>
                      <p className="text-[11px] text-slate-500">Div {top.section}</p>
                    </div>
                    <span className="text-lg font-black text-emerald-700">{top.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
