"use client";

import { GSEB_GRADES, GSEB_PASS_PCT } from "@/lib/board-records/gseb";
import { useT } from "@/i18n/locale-provider";

export function GradeLegend({ compact }: { compact?: boolean }) {
  const t = useT();

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {GSEB_GRADES.map((g) => (
          <span key={g.grade} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${g.bg} border-slate-200`}>
            <span className={g.color}>{g.grade}</span>
            <span className="text-slate-500 font-normal">{g.grade === "A1" ? `≥${g.min}%` : g.grade === "F" ? `<${GSEB_PASS_PCT}%` : `${g.min}–${g.max}%`}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-800">{t("boardRecords.gradeLegend")}</p>
        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {t("boardRecords.passMark", { pct: GSEB_PASS_PCT })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {GSEB_GRADES.map((g) => (
          <div key={g.grade} className={`rounded-xl border border-slate-100 p-3 ${g.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${g.color}`}>{g.grade}</span>
              <div className={`h-2 flex-1 rounded-full ${g.bar} opacity-80`} />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              {g.grade === "A1" ? `≥ ${g.min}%` : g.grade === "F" ? `< ${GSEB_PASS_PCT}%` : `${g.min}% – ${g.max}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
