"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap, FileText, ExternalLink, Search,
  CheckCircle, XCircle, AlertCircle, TrendingUp,
  BookOpen, Eye, RefreshCw, Filter,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

/* ─────────────────────────────────────────────────── */
interface StudentRecord {
  id: string;
  firstName: string;
  surname: string;
  standard: string;
  section: string;
  rollNumber: string;
  grNumber: string;
  board10th: string;
  percentage10th: number;
  year10th: string;
  board12th: string | null;
  percentage12th: number | null;
  year12th: string | null;
  marksheet10Path: string | null;
  marksheet12Path: string | null;
  childUid: string | null;
  aadhaarNumber: string;
}

/* GSEB direct URLs */
function gsebResultUrl(standard: string): string {
  if (standard === "12") return "https://result.gseb.org/";   /* HSC */
  return "https://result.gseb.org/";                          /* SSC — same portal, different exam */
}

/* Grade from % */
function grade(pct: number | null | undefined): { label: string; color: string } {
  if (!pct) return { label: "—", color: "text-slate-400" };
  if (pct >= 80) return { label: "A1", color: "text-emerald-700" };
  if (pct >= 70) return { label: "A2", color: "text-emerald-600" };
  if (pct >= 60) return { label: "B1", color: "text-blue-600" };
  if (pct >= 50) return { label: "B2", color: "text-blue-500" };
  if (pct >= 35) return { label: "C",  color: "text-amber-600" };
  return { label: "F", color: "text-red-600" };
}

function pctBadge(pct: number | null | undefined) {
  if (!pct) return null;
  const g = grade(pct);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${g.color}`}>
      {pct}% <span className="text-[10px] opacity-70">({g.label})</span>
    </span>
  );
}

/* ─────────────────────────────────────────────────── */
export default function BoardRecordsPage() {
  const t = useT();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | "10" | "12">("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/board-records")
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /* filter + search */
  const visible = students.filter((s) => {
    if (filter && s.standard !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        `${s.firstName} ${s.surname}`.toLowerCase().includes(q) ||
        (s.grNumber || "").toLowerCase().includes(q) ||
        (s.rollNumber || "").toLowerCase().includes(q) ||
        (s.aadhaarNumber || "").includes(q)
      );
    }
    return true;
  });

  const class10 = students.filter((s) => s.standard === "10");
  const class12 = students.filter((s) => s.standard === "12");
  const avg10 = class10.length
    ? (class10.reduce((a, s) => a + (s.percentage10th || 0), 0) / class10.length).toFixed(1)
    : null;
  const avg12 = class12.length
    ? (class12.filter((s) => s.percentage12th).reduce((a, s) => a + (s.percentage12th || 0), 0) /
        class12.filter((s) => s.percentage12th).length).toFixed(1)
    : null;

  return (
    <PageShell
      title={t("boardRecords.title")}
      subtitle={t("boardRecords.subtitle")}
      icon={<GraduationCap className="h-6 w-6" />}
      accentColor="border-blue-500"
      breadcrumbs={[{ label: t("nav.dashboard"), href: "/dashboard" }, { label: t("navExt.boardRecords") }]}
      actions={
        <button
          onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("boardRecords.refresh")}
        </button>
      }
    >
      <div className="space-y-5">

        {/* ── Stat cards ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="rounded-2xl p-5 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" }}
            onClick={() => setFilter(filter === "10" ? "" : "10")}
          >
            <p className="text-xs font-medium text-white/70 mb-1">{t("boardRecords.class10Ssc")}</p>
            <p className="text-3xl font-bold">{class10.length}</p>
            {avg10 && <p className="text-xs text-white/60 mt-1">{t("boardRecords.avgPercent", { pct: avg10 })}</p>}
          </div>
          <div
            className="rounded-2xl p-5 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)" }}
            onClick={() => setFilter(filter === "12" ? "" : "12")}
          >
            <p className="text-xs font-medium text-white/70 mb-1">{t("boardRecords.class12Hsc")}</p>
            <p className="text-3xl font-bold">{class12.length}</p>
            {avg12 && <p className="text-xs text-white/60 mt-1">{t("boardRecords.avgPercent", { pct: avg12 })}</p>}
          </div>
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">{t("boardRecords.totalBoardStudents")}</p>
            <p className="text-3xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">{t("boardRecords.marksheetsUploaded")}</p>
            <p className="text-3xl font-bold text-emerald-700">
              {students.filter((s) => s.marksheet10Path || s.marksheet12Path).length}
            </p>
          </div>
        </div>

        {/* ── GSEB quick links ─────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{t("boardRecords.gsebPortalTitle")}</p>
              <p className="text-xs text-slate-500">{t("boardRecords.gsebPortalDesc")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://result.gseb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {t("boardRecords.sscResults")}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a
              href="https://result.gseb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2.5 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {t("boardRecords.hscResults")}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <a
              href="https://gseb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t("boardRecords.gsebOfficial")}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* ── Filter + Search ──────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("boardRecords.searchPlaceholder")}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {([["", t("boardRecords.filterAll")], ["10", t("boardRecords.filterStd10")], ["12", t("boardRecords.filterStd12")]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === v
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Table ──────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{t("boardRecords.boardAcademicRecords")}</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              {t("boardRecords.studentsCount", { count: visible.length })}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">{t("boardRecords.loadingRecords")}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <GraduationCap className="h-8 w-8 opacity-40" />
              <p className="text-sm">{t("boardRecords.noRecordsFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      t("boardRecords.colStudent"),
                      t("boardRecords.colClass"),
                      t("boardRecords.colGrNo"),
                      t("boardRecords.colBoard10"),
                      t("boardRecords.colPct10"),
                      t("boardRecords.colBoard12"),
                      t("boardRecords.colPct12"),
                      t("boardRecords.colMarksheet"),
                      t("boardRecords.colGsebCheck"),
                      t("boardRecords.colProfile"),
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visible.map((s) => {
                    const g10 = grade(s.percentage10th);
                    const g12 = grade(s.percentage12th);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors group">

                        {/* Name + roll */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: s.standard === "10" ? "#2563eb" : "#7c3aed" }}
                            >
                              {s.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">
                                {s.firstName} {s.surname}
                              </p>
                              {s.rollNumber && (
                                <p className="text-xs text-slate-400">{t("boardRecords.rollLabel", { no: s.rollNumber })}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.standard === "10" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>
                            {t("boardRecords.stdLabel", { std: s.standard, section: s.section ? `-${s.section}` : "" })}
                          </span>
                        </td>

                        {/* GR No */}
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">
                          {s.grNumber || "—"}
                        </td>

                        {/* 10th Board */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 text-xs">{s.board10th}</p>
                            {s.year10th && <p className="text-[11px] text-slate-400">{s.year10th}</p>}
                          </div>
                        </td>

                        {/* 10th % */}
                        <td className="px-4 py-3">
                          {s.percentage10th > 0 ? (
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm ${g10.color}`}>{s.percentage10th}%</span>
                              <span className="text-[10px] text-slate-400">{g10.label}</span>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>

                        {/* 12th Board */}
                        <td className="px-4 py-3">
                          {s.board12th ? (
                            <div>
                              <p className="font-medium text-slate-800 text-xs">{s.board12th}</p>
                              {s.year12th && <p className="text-[11px] text-slate-400">{s.year12th}</p>}
                            </div>
                          ) : <span className="text-slate-300 text-xs">{t("boardRecords.notAvailable")}</span>}
                        </td>

                        {/* 12th % */}
                        <td className="px-4 py-3">
                          {s.percentage12th ? (
                            <div className="flex flex-col">
                              <span className={`font-bold text-sm ${g12.color}`}>{s.percentage12th}%</span>
                              <span className="text-[10px] text-slate-400">{g12.label}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Marksheet */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {s.marksheet10Path && (
                              <a
                                href={`/api/uploads/${s.marksheet10Path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <FileText className="h-3 w-3" /> {t("boardRecords.marksheet10")}
                              </a>
                            )}
                            {s.marksheet12Path && (
                              <a
                                href={`/api/uploads/${s.marksheet12Path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                              >
                                <FileText className="h-3 w-3" /> {t("boardRecords.marksheet12")}
                              </a>
                            )}
                            {!s.marksheet10Path && !s.marksheet12Path && (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* GSEB Check — opens result portal in new tab */}
                        <td className="px-4 py-3">
                          <a
                            href={gsebResultUrl(s.standard)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t("boardRecords.gsebCheckTitle", { name: s.firstName })}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 ${s.standard === "10" ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-600 hover:bg-violet-700"}`}
                          >
                            <Eye className="h-3 w-3" />
                            GSEB
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </a>
                        </td>

                        {/* Profile */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/students/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("boardRecords.profile")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Result status legend ─────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-600 mb-2.5">{t("boardRecords.gradeLegend")}</p>
          <div className="flex flex-wrap gap-3">
            {[
              { grade: "A1", range: "≥80%", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
              { grade: "A2", range: "70–79%", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
              { grade: "B1", range: "60–69%", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
              { grade: "B2", range: "50–59%", color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
              { grade: "C",  range: "35–49%", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
              { grade: "F",  range: "<35%",   color: "text-red-600",   bg: "bg-red-50 border-red-200" },
            ].map((g) => (
              <div key={g.grade} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${g.bg}`}>
                <span className={`font-bold ${g.color}`}>{g.grade}</span>
                <span className="text-slate-500">{g.range}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
