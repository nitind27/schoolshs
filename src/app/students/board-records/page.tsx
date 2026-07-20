"use client";

import { useEffect, useState, useMemo } from "react";
import {
  GraduationCap, ExternalLink, Search, RefreshCw,
  LayoutGrid, Table2, BarChart3, BookOpen, TrendingUp, PenLine, ClipboardList,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BoardAnalysisPanel } from "@/components/board-records/board-analysis-panel";
import { DivisionResultsView } from "@/components/board-records/division-results";
import { GradeLegend } from "@/components/board-records/grade-legend";
import { BoardSeatEntry } from "@/components/board-records/board-seat-entry";
import { GsebBulkFetch, studentsToGsebBulk } from "@/components/board-records/gseb-bulk-fetch";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE, paginateSlice } from "@/lib/pagination";
import {
  analyzeBoardStudents,
  type BoardStudent,
  formatBoardNo,
  gsebGrade,
  resultStatus,
} from "@/lib/board-records/gseb";
type ViewMode = "entry" | "analysis" | "divisions" | "table";
type StandardFilter = "10" | "12";

export default function BoardRecordsPage() {
  const t = useT();
  const [students, setStudents] = useState<BoardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [standard, setStandard] = useState<StandardFilter>("10");
  const [view, setView] = useState<ViewMode>("entry");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [importCsv, setImportCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [overview, setOverview] = useState<{
    ssc: { totalStudents: number; totalClasses: number; seatsFilled: number };
    hsc: { totalStudents: number; totalClasses: number; seatsFilled: number };
  } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/board-records").then((r) => r.json()),
      fetch("/api/board-records/overview").then((r) => r.json()),
    ])
      .then(([board, ov]) => {
        setStudents(board.students || []);
        if (ov.ssc) setOverview(ov);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const runImport = async () => {
    if (!importCsv.trim()) return;
    setImporting(true);
    const res = await fetch("/api/board-records/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importCsv }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      alert(t("boardRecords.importDone", { created: data.created, updated: data.updated }));
      setImportCsv("");
      load();
    } else {
      alert(data.error || "Import failed");
    }
  };

  const analysis = useMemo(() => analyzeBoardStudents(students, standard), [students, standard]);

  const sections = useMemo(() => {
    const set = new Set(students.filter((s) => s.standard === standard).map((s) => s.section?.toUpperCase()).filter(Boolean));
    return ["", ...[...set].sort()];
  }, [students, standard]);

  const filteredDivisions = useMemo(() => {
    if (!sectionFilter) return analysis.divisions;
    return analysis.divisions.filter((d) => d.section === sectionFilter);
  }, [analysis.divisions, sectionFilter]);

  const tableRows = useMemo(() => {
    let rows = analysis.divisions.flatMap((d) => d.students);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) =>
        `${s.firstName} ${s.surname}`.toLowerCase().includes(q) ||
        (s.grNumber || "").toLowerCase().includes(q) ||
        (s.rollNumber || "").toLowerCase().includes(q) ||
        (s.childUid || "").includes(q) ||
        (s.boardSeatNo || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [analysis.divisions, search]);

  const pagedTableRows = useMemo(
    () => paginateSlice(tableRows, tablePage, PAGE_SIZE),
    [tableRows, tablePage],
  );

  const gsebBulkStudents = useMemo(
    () => studentsToGsebBulk(analysis.divisions.flatMap((d) => d.students)),
    [analysis.divisions],
  );

  const stdOverview = overview?.[standard === "10" ? "ssc" : "hsc"];

  return (
    <PageShell
      title={t("boardRecords.title")}
      subtitle={standard === "10" ? t("boardRecords.sscSubtitle") : t("boardRecords.hscSubtitle")}
      icon={<GraduationCap className="h-6 w-6" />}
      accentColor="border-blue-500"
      breadcrumbs={[{ label: t("nav.dashboard"), href: "/dashboard" }, { label: t("navExt.boardRecords") }]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/students/board-records/result-list"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-sm font-medium text-blue-800"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {t("boardRecords.viewResultList")}
          </Link>
          <Link
            href="/students/board-records/exam-result-sheet"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium text-emerald-800"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("boardRecords.viewExamSheet")}
          </Link>
          <Link
            href="/students/board-records/overall-analysis"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-sm font-medium text-amber-900"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {t("boardRecords.viewOverallAnalysis")}
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("boardRecords.refresh")}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Exam type selector — SSC first */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {([
              ["10", t("boardRecords.sscResults"), "from-blue-600 to-blue-700"],
              ["12", t("boardRecords.hscResults"), "from-violet-600 to-violet-700"],
            ] as const).map(([std, label, grad]) => (
              <button
                key={std}
                onClick={() => { setStandard(std); setSectionFilter(""); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  standard === std
                    ? `bg-gradient-to-r ${grad} text-white shadow-md`
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${standard === std ? "bg-white/20" : "bg-slate-200"}`}>
                  {std === "10"
                    ? (overview?.ssc.totalStudents ?? students.filter((s) => s.standard === "10").length)
                    : (overview?.hsc.totalStudents ?? students.filter((s) => s.standard === "12").length)}
                </span>
              </button>
            ))}
          </div>

          {stdOverview && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700">
                {stdOverview.totalClasses} {t("boardRecords.classesCreated")}
              </span>
              <span className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-semibold text-emerald-700">
                {stdOverview.seatsFilled}/{stdOverview.totalStudents} {t("boardRecords.seatsFilled")}
              </span>
            </div>
          )}
        </div>

        {(() => {
          const examYear = students.find((s) => s.standard === standard)?.[standard === "10" ? "year10th" : "year12th"];
          return examYear ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2 w-fit">
              <BookOpen className="h-4 w-4 text-blue-500" />
              {t("boardRecords.examYear")}: <strong>{examYear}</strong> · GSEB
            </div>
          ) : null;
        })()}

        {/* View mode tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {([
            ["entry", t("boardRecords.viewEntry"), PenLine],
            ["divisions", t("boardRecords.viewDivisions"), LayoutGrid],
            ["analysis", t("boardRecords.viewAnalysis"), BarChart3],
            ["table", t("boardRecords.viewTable"), Table2],
          ] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${view === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {view === "entry" && <BoardSeatEntry standard={standard} onSaved={load} />}

        {view !== "entry" && (
        <>
        {/* Real data import — CSV fallback */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{t("boardRecords.importTitle")}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t("boardRecords.importDesc")}</p>
            </div>
          </div>
          <textarea
            className="w-full h-32 rounded-xl border border-slate-300 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={`section,roll,firstName,surname,seat,percentage,year\nA,1,REHAN,PATEL,A1234567,72.5,2025\nA,2,KAVYA,SHAH,B2345678,68.3,2025`}
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={runImport}
              disabled={importing}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? t("boardRecords.importing") : t("boardRecords.importBtn")}
            </button>
            <p className="text-[11px] text-slate-500 self-center">{t("boardRecords.importHint")}</p>
          </div>
        </div>

        <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 flex flex-wrap items-center gap-3">
          <TrendingUp className="h-4 w-4 text-orange-600 shrink-0" />
          <p className="text-xs text-slate-600 flex-1">{t("boardRecords.gsebPortalDesc")}</p>
          <a href="https://result.gseb.org/" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1">
            result.gseb.org <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Filters for results views */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setTablePage(1); }}
              placeholder={t("boardRecords.searchPlaceholder")}
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {sections.map((sec) => (
              <button
                key={sec || "all"}
                onClick={() => { setSectionFilter(sec); setTablePage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  sectionFilter === sec ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                {sec ? `Div ${sec}` : t("boardRecords.filterAll")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">{t("boardRecords.loadingRecords")}</p>
          </div>
        ) : analysis.total === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t("boardRecords.noStdStudents", { std: standard })}</p>
            {stdOverview && stdOverview.totalClasses > 0 && (
              <p className="text-sm text-amber-600 mt-2">{t("boardRecords.noResultsYet", { count: stdOverview.totalStudents })}</p>
            )}
          </div>
        ) : (
          <>
            {view === "analysis" || view === "divisions" || view === "table" ? (
              <GsebBulkFetch
                students={gsebBulkStudents}
                standard={standard as "10" | "12"}
                onComplete={load}
              />
            ) : null}
            {view === "analysis" && <BoardAnalysisPanel analysis={analysis} />}
            {view === "divisions" && <DivisionResultsView divisions={filteredDivisions} standard={standard} onFetchGseb={load} />}
            {view === "table" && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{analysis.title} — {t("boardRecords.allResults")}</p>
                  <GradeLegend compact />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {[
                          t("boardRecords.colRank"), t("boardRecords.colStudent"), t("boardRecords.colClass"),
                          t("boardRecords.colBoardNo"), t("boardRecords.colPct10"), t("boardRecords.colGrade"),
                          t("boardRecords.colResult"), t("boardRecords.colMarksheet"),
                        ].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pagedTableRows.map((s) => {
                        const g = gsebGrade(s.displayPct);
                        const ms = standard === "10" ? s.marksheet10Path : s.marksheet12Path;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-500">{s.rank}</td>
                            <td className="px-4 py-3 font-medium">{s.firstName} {s.surname}</td>
                            <td className="px-4 py-3"><span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.section || "—"}</span></td>
                            <td className="px-4 py-3 font-mono text-xs text-blue-700">{formatBoardNo(s.boardSeatNo)}</td>
                            <td className="px-4 py-3 font-black text-slate-800">{s.displayPct != null ? `${s.displayPct}%` : "—"}</td>
                            <td className="px-4 py-3"><span className={`font-bold ${g.color}`}>{g.label}</span></td>
                            <td className={`px-4 py-3 capitalize text-xs font-semibold ${s.resultStatus === "pass" ? "text-emerald-700" : s.resultStatus === "fail" ? "text-red-600" : "text-amber-600"}`}>{resultStatus(s.displayPct)}</td>
                            <td className="px-4 py-3">{ms ? <a href={`/api/uploads/${ms}`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">{t("boardRecords.view")}</a> : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <TablePagination page={tablePage} total={tableRows.length} onPageChange={setTablePage} />
              </div>
            )}
          </>
        )}

        <GradeLegend />
        </>
        )}
      </div>
    </PageShell>
  );
}
