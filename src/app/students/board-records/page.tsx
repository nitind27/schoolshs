"use client";

import { Spinner } from "@/components/ui/loader";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  ExternalLink,
  Search,
  RefreshCw,
  LayoutGrid,
  Table2,
  BarChart3,
  BookOpen,
  PenLine,
  ClipboardList,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { BoardAnalysisPanel } from "@/components/board-records/board-analysis-panel";
import { DivisionResultsView } from "@/components/board-records/division-results";
import { GradeLegend } from "@/components/board-records/grade-legend";
import { BoardSeatEntry } from "@/components/board-records/board-seat-entry";
import { SeatNumbersGuide } from "@/components/students/seat-numbers-guide";
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

type ViewMode = "home" | "entry" | "analysis" | "divisions" | "table";
type StandardFilter = "10" | "12";

const VIEW_MODES: ViewMode[] = ["home", "entry", "analysis", "divisions", "table"];

function parseView(raw: string | null): ViewMode {
  if (raw && VIEW_MODES.includes(raw as ViewMode)) return raw as ViewMode;
  return "home";
}

function BoardRecordsContent() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname.startsWith("/teacher") ? "/teacher/board-records" : "/students/board-records";

  const view = parseView(searchParams.get("view"));
  const standard: StandardFilter = searchParams.get("std") === "12" ? "12" : "10";

  const navigateBoard = useCallback(
    (next: { view?: ViewMode; std?: StandardFilter }, mode: "push" | "replace" = "push") => {
      const v = next.view ?? view;
      const s = next.std ?? standard;
      const params = new URLSearchParams();
      params.set("std", s);
      if (v !== "home") params.set("view", v);
      const href = `${pathname}?${params.toString()}`;
      if (mode === "replace") router.replace(href);
      else router.push(href);
    },
    [pathname, router, standard, view],
  );

  const goView = useCallback((v: ViewMode) => navigateBoard({ view: v }), [navigateBoard]);
  const goHome = useCallback(() => navigateBoard({ view: "home" }), [navigateBoard]);

  const [students, setStudents] = useState<BoardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [importCsv, setImportCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
    const set = new Set(
      students.filter((s) => s.standard === standard).map((s) => s.section?.toUpperCase()).filter(Boolean),
    );
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
      rows = rows.filter(
        (s) =>
          `${s.firstName} ${s.surname}`.toLowerCase().includes(q) ||
          (s.grNumber || "").toLowerCase().includes(q) ||
          (s.rollNumber || "").toLowerCase().includes(q) ||
          (s.boardSeatNo || "").toLowerCase().includes(q),
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
  const seatsReady = gsebBulkStudents.filter(
    (s) => s.seatNo && s.seatNo !== "—" && s.seatNo.replace(/\D/g, "").length === (standard === "12" ? 6 : 7),
  ).length;

  const featureCards = [
    {
      key: "entry",
      title: t("boardRecords.hubPrimaryEntry"),
      desc: t("boardRecords.hubStep1Desc"),
      icon: PenLine,
      tone: "bg-emerald-50 border-emerald-200 text-emerald-800",
      iconTone: "bg-emerald-600 text-white",
      action: () => goView("entry"),
    },
    {
      key: "fetch",
      title: t("boardRecords.hubFeatureFetch"),
      desc: t("boardRecords.hubFeatureFetchDesc"),
      icon: Download,
      tone: "bg-violet-50 border-violet-200 text-violet-900",
      iconTone: "bg-violet-600 text-white",
      action: () => goView("divisions"),
    },
    {
      key: "divisions",
      title: t("boardRecords.hubFeatureDivisions"),
      desc: t("boardRecords.hubFeatureDivisionsDesc"),
      icon: LayoutGrid,
      tone: "bg-blue-50 border-blue-200 text-blue-900",
      iconTone: "bg-blue-600 text-white",
      action: () => goView("divisions"),
    },
    {
      key: "analysis",
      title: t("boardRecords.hubFeatureAnalysis"),
      desc: t("boardRecords.hubFeatureAnalysisDesc"),
      icon: BarChart3,
      tone: "bg-amber-50 border-amber-200 text-amber-950",
      iconTone: "bg-amber-600 text-white",
      action: () => goView("analysis"),
    },
    {
      key: "table",
      title: t("boardRecords.hubFeatureTable"),
      desc: t("boardRecords.hubFeatureTableDesc"),
      icon: Table2,
      tone: "bg-slate-50 border-slate-200 text-slate-800",
      iconTone: "bg-slate-700 text-white",
      action: () => goView("table"),
    },
  ] as const;

  const printLinks = [
    {
      href: `${basePath}/result-list`,
      title: t("boardRecords.hubFeatureResultList"),
      desc: t("boardRecords.hubFeatureResultListDesc"),
      icon: ClipboardList,
    },
    {
      href: `${basePath}/exam-result-sheet`,
      title: t("boardRecords.hubFeatureExamSheet"),
      desc: t("boardRecords.hubFeatureExamSheetDesc"),
      icon: BookOpen,
    },
    {
      href: `${basePath}/overall-analysis`,
      title: t("boardRecords.hubFeatureOverall"),
      desc: t("boardRecords.hubFeatureOverallDesc"),
      icon: BarChart3,
    },
  ];

  const viewLabel =
    view === "entry"
      ? t("boardRecords.viewEntry")
      : view === "divisions"
        ? t("boardRecords.viewDivisions")
        : view === "analysis"
          ? t("boardRecords.viewAnalysis")
          : view === "table"
            ? t("boardRecords.viewTable")
            : t("boardRecords.hubHome");

  const crumbs =
    view === "home"
      ? [{ label: t("nav.dashboard"), href: "/dashboard" }, { label: t("navExt.boardRecords") }]
      : [
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("navExt.boardRecords"), href: `${pathname}?std=${standard}` },
          { label: viewLabel },
        ];

  return (
    <PageShell
      title={t("boardRecords.title")}
      subtitle={standard === "10" ? t("boardRecords.sscSubtitle") : t("boardRecords.hscSubtitle")}
      icon={<GraduationCap className="h-6 w-6" />}
      accentColor="border-emerald-500"
      breadcrumbs={crumbs}
      actions={
        <div className="flex items-center gap-2">
          {view !== "home" && (
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium text-emerald-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.back")}
            </button>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("boardRecords.refresh")}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {(
              [
                ["10", t("boardRecords.sscResults")],
                ["12", t("boardRecords.hscResults")],
              ] as const
            ).map(([std, label]) => (
              <button
                key={std}
                onClick={() => {
                  setSectionFilter("");
                  navigateBoard({ std, view: "home" });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  standard === std
                    ? "bg-emerald-700 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    standard === std ? "bg-white/20" : "bg-slate-200"
                  }`}
                >
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
              <span className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 font-semibold text-violet-800">
                {seatsReady} GSEB ready
              </span>
            </div>
          )}
        </div>

        {view === "home" && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-bold text-emerald-900">{t("boardRecords.hubHowTitle")}</p>
                <p className="text-xs text-slate-600 mt-1">{t("boardRecords.hubGsebNote")}</p>
              </div>
              <a
                href="https://result.gseb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline"
              >
                {t("boardRecords.hubOfficialLink")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { title: t("boardRecords.hubStep1Title"), desc: t("boardRecords.hubStep1Desc"), n: "1" },
                { title: t("boardRecords.hubStep2Title"), desc: t("boardRecords.hubStep2Desc"), n: "2" },
                { title: t("boardRecords.hubStep3Title"), desc: t("boardRecords.hubStep3Desc"), n: "3" },
              ].map((step) => (
                <div key={step.n} className="rounded-xl bg-white border border-emerald-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold grid place-items-center">
                      {step.n}
                    </span>
                    <p className="text-sm font-bold text-slate-900">{step.title}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto">
          {(
            [
              ["home", t("boardRecords.hubHome"), LayoutGrid],
              ["entry", t("boardRecords.viewEntry"), PenLine],
              ["divisions", t("boardRecords.viewDivisions"), LayoutGrid],
              ["analysis", t("boardRecords.viewAnalysis"), BarChart3],
              ["table", t("boardRecords.viewTable"), Table2],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => goView(v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                view === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {view === "home" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.action}
                  className={`text-left rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${f.tone}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${f.iconTone}`}>
                      <f.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm">{f.title}</p>
                      <p className="text-xs mt-1 opacity-80 leading-relaxed">{f.desc}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold mt-3">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900 mb-3">{t("boardRecords.hubStep3Title")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                {printLinks.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-emerald-300 p-4 transition"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <p.icon className="h-4 w-4 text-emerald-700" />
                      <p className="text-sm font-bold text-slate-900">{p.title}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                  </Link>
                ))}
              </div>
            </div>

            {seatsReady > 0 && (
              <GsebBulkFetch students={gsebBulkStudents} standard={standard} onComplete={load} />
            )}

            {!loading && analysis.total > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {analysis.passCount} {t("boardRecords.passed")}
                </span>
                <span>
                  {analysis.failCount} {t("boardRecords.failed")}
                </span>
                <span>
                  {analysis.pending} {t("boardRecords.pending")}
                </span>
                {analysis.average != null && (
                  <span>
                    {t("boardRecords.avg")}: {analysis.average}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {view === "entry" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")} — {t("boardRecords.hubHome")}
            </button>
            <SeatNumbersGuide
              teacher={pathname.startsWith("/teacher")}
              highlight="board"
            />
            <BoardSeatEntry standard={standard} onSaved={load} />
          </div>
        )}

        {view !== "home" && view !== "entry" && (
          <>
            <button
              type="button"
              onClick={goHome}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")} — {t("boardRecords.hubHome")}
            </button>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-950">
              {t("boardRecords.hubGsebNote")}
            </div>

            <GsebBulkFetch students={gsebBulkStudents} standard={standard} onComplete={load} />

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setTablePage(1);
                  }}
                  placeholder={t("boardRecords.searchPlaceholder")}
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {sections.map((sec) => (
                  <button
                    key={sec || "all"}
                    onClick={() => {
                      setSectionFilter(sec);
                      setTablePage(1);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      sectionFilter === sec
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    {sec ? `Div ${sec}` : t("boardRecords.filterAll")}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-56 gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-slate-500">{t("boardRecords.loadingRecords")}</p>
              </div>
            ) : analysis.total === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-16 text-center">
                <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{t("boardRecords.noStdStudents", { std: standard })}</p>
                <button
                  type="button"
                  onClick={() => goView("entry")}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
                >
                  <PenLine className="h-4 w-4" />
                  {t("boardRecords.hubPrimaryEntry")}
                </button>
              </div>
            ) : (
              <>
                {view === "analysis" && <BoardAnalysisPanel analysis={analysis} />}
                {view === "divisions" && (
                  <DivisionResultsView divisions={filteredDivisions} standard={standard} onFetchGseb={load} />
                )}
                {view === "table" && (
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">
                        {analysis.title} — {t("boardRecords.allResults")}
                      </p>
                      <GradeLegend compact />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            {[
                              t("boardRecords.colRank"),
                              t("boardRecords.colStudent"),
                              t("boardRecords.colClass"),
                              t("boardRecords.colBoardNo"),
                              t("boardRecords.colPct10"),
                              t("boardRecords.colGrade"),
                              t("boardRecords.colResult"),
                              t("boardRecords.colMarksheet"),
                            ].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">
                                {h}
                              </th>
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
                                <td className="px-4 py-3 font-medium">
                                  {s.firstName} {s.surname}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {s.section || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-blue-700">{formatBoardNo(s.boardSeatNo)}</td>
                                <td className="px-4 py-3 font-black text-slate-800">
                                  {s.displayPct != null ? `${s.displayPct}%` : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`font-bold ${g.color}`}>{g.label}</span>
                                </td>
                                <td
                                  className={`px-4 py-3 capitalize text-xs font-semibold ${
                                    s.resultStatus === "pass"
                                      ? "text-emerald-700"
                                      : s.resultStatus === "fail"
                                        ? "text-red-600"
                                        : "text-amber-600"
                                  }`}
                                >
                                  {resultStatus(s.displayPct)}
                                </td>
                                <td className="px-4 py-3">
                                  {ms ? (
                                    <a href={`/api/uploads/${ms}`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">
                                      {t("boardRecords.view")}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
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

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowImport((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span>{t("boardRecords.hubMoreImport")}</span>
                {showImport ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {showImport && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">{t("boardRecords.importDesc")}</p>
                  <textarea
                    className="w-full h-28 rounded-xl border border-slate-300 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder={`section,roll,firstName,surname,seat,percentage,year\nA,1,REHAN,PATEL,A1234567,72.5,2025`}
                    value={importCsv}
                    onChange={(e) => setImportCsv(e.target.value)}
                  />
                  <button
                    onClick={runImport}
                    disabled={importing}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60"
                  >
                    {importing ? t("boardRecords.importing") : t("boardRecords.importBtn")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

export default function BoardRecordsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <BoardRecordsContent />
    </Suspense>
  );
}
