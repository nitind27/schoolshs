"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown, ChevronUp, Trophy, FileText, ExternalLink,
  CheckCircle, XCircle, Clock, Medal,
} from "lucide-react";
import type { DivisionAnalysis, StudentWithMeta } from "@/lib/board-records/gseb";
import { formatBoardNo } from "@/lib/board-records/gseb";
import { GradeLegend } from "@/components/board-records/grade-legend";
import { GsebBulkFetch, studentsToGsebBulk } from "@/components/board-records/gseb-bulk-fetch";
import { useT } from "@/i18n/locale-provider";

function ResultBadge({ status }: { status: StudentWithMeta["resultStatus"] }) {
  const t = useT();
  if (status === "pass") return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" />{t("boardRecords.passed")}</span>;
  if (status === "fail") return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full"><XCircle className="h-3 w-3" />{t("boardRecords.failed")}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"><Clock className="h-3 w-3" />{t("boardRecords.pending")}</span>;
}

function StudentRow({ s, standard, onFetched }: { s: StudentWithMeta; standard: "10" | "12"; onFetched?: () => void }) {
  const t = useT();
  const [fetching, setFetching] = useState(false);
  const marksheet = standard === "10" ? s.marksheet10Path : s.marksheet12Path;

  const fetchGseb = async () => {
    setFetching(true);
    const res = await fetch("/api/board-records/fetch-gseb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: s.id, standard }),
    });
    const data = await res.json();
    setFetching(false);
    if (res.ok) {
      onFetched?.();
    } else {
      alert(data.error || "GSEB fetch failed");
    }
  };

  return (
    <tr className="hover:bg-blue-50/40 transition-colors group">
      <td className="px-3 py-2.5 text-center">
        {s.rank <= 3 && s.displayPct != null ? (
          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-black ${s.rank === 1 ? "bg-amber-400 text-amber-900" : s.rank === 2 ? "bg-slate-300 text-slate-700" : "bg-orange-200 text-orange-800"}`}>
            {s.rank === 1 ? <Medal className="h-3.5 w-3.5" /> : s.rank}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-500">{s.rank}</span>
        )}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.rollNumber || "—"}</td>
      <td className="px-3 py-2.5">
        <p className="font-semibold text-slate-800 text-sm leading-tight">{s.firstName} {s.surname}</p>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-blue-700 font-semibold" title={s.boardSeatNo}>
        {formatBoardNo(s.boardSeatNo)}
      </td>
      <td className="px-3 py-2.5 text-center">
        {s.displayPct != null ? (
          <div>
            <span className={`text-base font-black ${s.gradeColor}`}>{s.displayPct}%</span>
            <span className={`block text-[10px] font-bold ${s.gradeColor}`}>{s.grade}</span>
          </div>
        ) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-2.5"><ResultBadge status={s.resultStatus} /></td>
      <td className="px-3 py-2.5">
        <button type="button" onClick={fetchGseb} disabled={fetching} className="text-[10px] font-bold text-violet-700 hover:underline disabled:opacity-50">
          {fetching ? "..." : "GSEB ↻"}
        </button>
        {marksheet ? (
          <a href={`/api/uploads/${marksheet}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium ml-1">
            <FileText className="h-3 w-3" />
          </a>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <Link href={`/students/${s.id}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}

function DivisionCard({ division, standard, defaultOpen, onFetchGseb }: { division: DivisionAnalysis; standard: "10" | "12"; defaultOpen?: boolean; onFetchGseb?: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const divisionBulk = studentsToGsebBulk(division.students);

  const sectionColors: Record<string, string> = {
    A: "from-blue-600 to-blue-700",
    B: "from-violet-600 to-violet-700",
    C: "from-emerald-600 to-teal-700",
    D: "from-amber-500 to-orange-600",
    E: "from-rose-500 to-pink-600",
    F: "from-indigo-600 to-indigo-700",
  };
  const gradient = sectionColors[division.section] || "from-slate-600 to-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-xl shadow-md shrink-0`}>
          {division.section || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold text-slate-900">{division.label}</p>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {division.total} {t("boardRecords.studentsShort")}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
            <span>{t("boardRecords.avg")}: <strong className="text-slate-800">{division.average != null ? `${division.average}%` : "—"}</strong></span>
            <span>{t("boardRecords.passRate")}: <strong className="text-emerald-700">{division.passRate}%</strong></span>
            {division.topper && (
              <span className="flex items-center gap-1 text-amber-700">
                <Trophy className="h-3 w-3" /> {division.topper.name} ({division.topper.pct}%)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex gap-1">
            {(["A1", "A2", "B1", "B2", "C", "F"] as const).map((g) =>
              division.gradeCounts[g] > 0 ? (
                <span key={g} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{g}:{division.gradeCounts[g]}</span>
              ) : null
            )}
          </div>
          {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-3 border-b border-slate-100 bg-violet-50/50">
            <GsebBulkFetch
              students={divisionBulk}
              standard={standard}
              onComplete={onFetchGseb}
              compact
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[t("boardRecords.colRank"), t("boardRecords.colRoll"), t("boardRecords.colStudent"), t("boardRecords.colBoardNo"), t("boardRecords.colPct10"), t("boardRecords.colResult"), "GSEB", ""].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {division.students.map((s) => (
                  <StudentRow key={s.id} s={s} standard={standard} onFetched={onFetchGseb} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function DivisionResultsView({
  divisions,
  standard,
  onFetchGseb,
}: {
  divisions: DivisionAnalysis[];
  standard: "10" | "12";
  onFetchGseb?: () => void;
}) {
  const t = useT();

  if (divisions.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center text-slate-400">
        <p>{t("boardRecords.noRecordsFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">{t("boardRecords.divisionWiseResults")}</p>
        <GradeLegend compact />
      </div>
      {divisions.map((d, i) => (
        <DivisionCard key={d.section || "_"} division={d} standard={standard} defaultOpen={i === 0} onFetchGseb={onFetchGseb} />
      ))}
    </div>
  );
}
