"use client";

import { Spinner, PageLoader } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileCheck, CheckCircle, AlertCircle, Upload, Send, ArrowRight, BookOpen, Briefcase, CreditCard, GraduationCap, Star, Calculator, CalendarDays, Award, UserPlus, Wallet, FileSpreadsheet, ClipboardCheck, Clock, Ban } from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";
import {
  DashboardFiltersBar,
  EMPTY_FILTERS,
  type DashboardFilterMeta,
  type DashboardFilterValues,
} from "@/components/dashboard/dashboard-filters";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardPrintReport } from "@/components/dashboard/dashboard-print-report";
import { DashboardSummaryTable } from "@/components/dashboard/dashboard-summary-table";
import { DoughnutChart, VerticalBarChart, type ChartSegment } from "@/components/dashboard/charts";
import {
  DashboardDrillModal,
  type DrillDimension,
  type DrillTarget,
} from "@/components/dashboard/dashboard-drill-modal";
import {
  DashboardQuickListModal,
  type QuickListKind,
} from "@/components/dashboard/dashboard-quick-list-modal";
import {
  DashboardHrDataModal,
  type HrModalKind,
} from "@/components/dashboard/dashboard-hr-data-modal";
import {
  DashboardCommandCenter,
  type OpsOverview,
} from "@/components/dashboard/dashboard-command-center";
import { CATEGORY_CHART_COLORS, GENDER_CHART_COLORS, STATUS_CHART_COLORS } from "@/lib/dashboard-analytics";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import {
  DEFAULT_EXPORT_OPTIONS,
  type DashboardExportOptions,
} from "@/lib/dashboard-export-options";
import "@/components/dashboard/dashboard.css";

interface Stats {
  total: number;
  totalClasses?: number;
  totalStaff?: number;
  staffTotalAll?: number;
  schoolName?: string;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  categoryChart?: { category: string; count: number; color: string }[];
  byStandard?: { standard: string; count: number }[];
  byClass?: { label: string; standard: string; section: string; count: number }[];
  byGender?: { male: number; female: number; other: number; total: number };
  admissions?: { pending: number; verified: number; rejected: number; total: number };
  admissionRecent?: {
    id: string;
    name: string;
    classLabel: string;
    category?: string | null;
    verifiedAt: string | null;
    verifiedBy: string;
  }[];
  staffByDesignation?: { designation: string; count: number }[];
  completionRate: number;
  filterMeta?: DashboardFilterMeta;
  recentSubmissions: {
    id: string;
    createdAt: string;
    totalCount: number;
    successCount: number;
    failedCount: number;
    status: string;
  }[];
}

const STATUS_KEYS = ["draft", "ready", "pending", "submitted", "approved", "rejected"] as const;

type InsightTab = "students" | "admission" | "staff" | "details";

function buildQuery(filters: DashboardFilterValues): string {
  const p = new URLSearchParams();
  if (filters.standard) p.set("standard", filters.standard);
  if (filters.section) p.set("section", filters.section);
  if (filters.status) p.set("status", filters.status);
  if (filters.category) p.set("category", filters.category);
  if (filters.gender && filters.gender !== "all") p.set("gender", filters.gender);
  const q = p.toString();
  return q ? `?${q}` : "";
}

function buildFilterSummary(filters: DashboardFilterValues, t: (k: string, p?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (filters.standard) parts.push(t("dashboard.stdLabel", { standard: filters.standard }));
  if (filters.section) parts.push(t("dashboard.divLabel", { section: filters.section }));
  if (filters.status) parts.push(t(`status.${filters.status}`));
  if (filters.category) parts.push(filters.category);
  if (filters.gender && filters.gender !== "all") {
    const gl = t(`gender.${filters.gender}`);
    parts.push(gl !== `gender.${filters.gender}` ? gl : filters.gender);
  }
  return parts.length ? parts.join(" · ") : t("dashboard.filterAll");
}

export default function SchoolOpsDashboard() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilterValues>(EMPTY_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [printStudents, setPrintStudents] = useState<ExportStudentRow[]>([]);
  const [printOptions, setPrintOptions] = useState<DashboardExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filterMeta, setFilterMeta] = useState<DashboardFilterMeta>({
    standards: [],
    sections: [],
    statuses: [],
    categories: [],
    genders: [],
  });
  const [insightTab, setInsightTab] = useState<InsightTab>("students");
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [quickList, setQuickList] = useState<{
    kind: QuickListKind;
    value: string;
    label: string;
  } | null>(null);
  const [hrSummary, setHrSummary] = useState<{
    month: number;
    year: number;
    totalStaff: number;
    withSalary: number;
    attendanceMarked: number;
    attendanceUnmarked?: number;
    payrollPending: number;
    payrollPaid: number;
    totalGross: number;
    totalNet: number;
  } | null>(null);
  const [hrModal, setHrModal] = useState<HrModalKind | null>(null);
  const [opsOverview, setOpsOverview] = useState<OpsOverview | null>(null);

  const openDrill = useCallback((dimension: DrillDimension, segment: ChartSegment) => {
    const value = segment.id ?? segment.label;
    setDrillTarget({ dimension, value: value || "", label: segment.label });
    setDrillOpen(true);
  }, []);

  const openAllStudents = useCallback(() => {
    setDrillTarget({ dimension: "category", value: "", label: t("dashboard.totalStudents") });
    setDrillOpen(true);
  }, [t]);

  const openQuickList = useCallback((kind: QuickListKind, value: string, label: string) => {
    setQuickList({ kind, value, label });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role || null))
      .catch(() => setUserRole(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff-hr/summary")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d?.error) setHrSummary(d);
      })
      .catch(() => {
        if (!cancelled) setHrSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clerk/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d?.error) setOpsOverview(d);
      })
      .catch(() => {
        if (!cancelled) setOpsOverview(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scholarshipHref = (status: string) =>
    userRole === "clerk" ? `/clerk/scholarship?status=${status}` : `/students?status=${status}`;

  const loadStats = useCallback(async (f: DashboardFilterValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats${buildQuery(f)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load");
      setStats(payload);
      if (payload.filterMeta) setFilterMeta(payload.filterMeta);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(filters);
  }, [filters, loadStats]);

  const categorySegments = useMemo(() => {
    const rows = stats?.categoryChart?.length
      ? stats.categoryChart
      : (stats?.byCategory || []).map((c) => ({
          category: c.category || "Unknown",
          count: c.count,
          color: CATEGORY_CHART_COLORS[c.category || "Unknown"] || CATEGORY_CHART_COLORS.Unknown,
        }));
    return rows
      .filter((c) => c.count > 0)
      .map((c) => ({
        id: c.category,
        label: c.category,
        value: c.count,
        color: c.color,
        percent: stats?.total ? Math.round((c.count / stats.total) * 100) : 0,
      }));
  }, [stats]);

  const standardSegments = useMemo(() => {
    const list = (stats?.byStandard || []).slice().sort((a, b) => Number(a.standard) - Number(b.standard));
    const colors = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#0ea5e9", "#14b8a6", "#10b981"];
    return list.map((s, i) => ({
      id: s.standard,
      label: t("dashboard.stdLabel", { standard: s.standard }),
      value: s.count,
      color: colors[i % colors.length],
      percent: stats?.total ? Math.round((s.count / stats.total) * 100) : 0,
    }));
  }, [stats, t]);

  const statusSegments = useMemo(() => {
    return STATUS_KEYS.map((key) => ({
      id: key,
      label: t(`status.${key}`),
      value: stats?.byStatus?.[key] || 0,
      color: STATUS_CHART_COLORS[key],
      percent: stats?.total ? Math.round(((stats?.byStatus?.[key] || 0) / stats.total) * 100) : 0,
    })).filter((s) => s.value > 0);
  }, [stats, t]);

  const genderSegments = useMemo(() => {
    const g = stats?.byGender;
    if (!g) return [];
    return [
      { id: "male", label: t("gender.male"), value: g.male, color: GENDER_CHART_COLORS.male },
      { id: "female", label: t("gender.female"), value: g.female, color: GENDER_CHART_COLORS.female },
      ...(g.other > 0
        ? [{ id: "other", label: t("gender.other"), value: g.other, color: GENDER_CHART_COLORS.other }]
        : []),
    ].filter((s) => s.value > 0);
  }, [stats, t]);

  const admissionSegments = useMemo(() => {
    const a = stats?.admissions;
    if (!a) return [];
    return [
      { id: "pending", label: t("admissionStatus.pending"), value: a.pending, color: "#f59e0b" },
      { id: "verified", label: t("admissionStatus.verified"), value: a.verified, color: "#059669" },
      { id: "rejected", label: t("admissionStatus.rejected"), value: a.rejected, color: "#e11d48" },
    ].filter((s) => s.value > 0);
  }, [stats, t]);

  const staffSegments = useMemo(() => {
    const colors = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#0891b2"];
    return (stats?.staffByDesignation || []).map((row, i) => ({
      id: row.designation,
      label: row.designation,
      value: row.count,
      color: colors[i % colors.length],
    }));
  }, [stats]);

  const classSegments = useMemo(() => {
    const colors = ["#3b82f6", "#6366f1", "#0ea5e9", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899"];
    return (stats?.byClass || []).map((c, i) => ({
      id: `${c.standard}|${c.section}`,
      label: c.label,
      value: c.count,
      color: colors[i % colors.length],
      percent: stats?.total ? Math.round((c.count / stats.total) * 100) : 0,
    }));
  }, [stats]);

  const payrollSegments = useMemo(() => {
    if (!hrSummary) return [];
    return [
      { id: "paid", label: t("dashboard.hrPaid"), value: hrSummary.payrollPaid, color: "#059669" },
      { id: "pending", label: t("dashboard.hrPayPending"), value: hrSummary.payrollPending, color: "#d97706" },
    ].filter((s) => s.value > 0);
  }, [hrSummary, t]);

  const staffAttnSegments = useMemo(() => {
    if (!hrSummary) return [];
    const marked = hrSummary.attendanceMarked || 0;
    const unmarked =
      hrSummary.attendanceUnmarked ??
      Math.max(0, (hrSummary.totalStaff || 0) - marked);
    return [
      { id: "marked", label: t("dashboard.hrMarked"), value: marked, color: "#0d9488" },
      { id: "unmarked", label: t("dashboard.hrUnmarked"), value: unmarked, color: "#f59e0b" },
    ].filter((s) => s.value > 0);
  }, [hrSummary, t]);

  const reportData = useMemo((): DashboardReportData | null => {
    if (!stats) return null;
    return {
      schoolName: stats.schoolName || "School",
      generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }),
      filterSummary: buildFilterSummary(filters, t),
      total: stats.total,
      totalClasses: stats.totalClasses || 0,
      totalStaff: stats.totalStaff || 0,
      completionRate: stats.completionRate,
      byStatus: stats.byStatus,
      byCategory: stats.byCategory,
      byStandard: stats.byStandard || [],
      byClass: stats.byClass || [],
      byGender: stats.byGender || { male: 0, female: 0, other: 0, total: 0 },
    };
  }, [stats, filters, t]);

  const tableByStandard = useMemo(
    () =>
      (stats?.byStandard || []).map((s) => ({
        label: t("dashboard.stdLabel", { standard: s.standard }),
        value: s.count,
        percent: stats?.total ? Math.round((s.count / stats.total) * 100) : 0,
      })),
    [stats, t]
  );

  const tableByClass = useMemo(
    () =>
      (stats?.byClass || []).map((c) => ({
        label: c.label,
        value: c.count,
        percent: stats?.total ? Math.round((c.count / stats.total) * 100) : 0,
      })),
    [stats]
  );

  const tableByCategory = useMemo(
    () =>
      categorySegments.map((c) => ({ label: c.label, value: c.value, percent: c.percent })),
    [categorySegments]
  );

  const tableByStatus = useMemo(
    () => statusSegments.map((s) => ({ label: s.label, value: s.value, percent: s.percent })),
    [statusSegments]
  );

  const tableByGender = useMemo(
    () => genderSegments.map((s) => ({
      label: s.label,
      value: s.value,
      percent: stats?.byGender?.total ? Math.round((s.value / stats.byGender.total) * 100) : 0,
    })),
    [genderSegments, stats]
  );

  const setupFlow = useMemo(
    () => [
      { n: 1, href: "/classes", title: t("dashboard.flow1Title"), desc: t("dashboard.flow1Desc"), who: t("dashboard.flow1Who"), icon: BookOpen, phase: "setup" as const },
      { n: 2, href: "/staff", title: t("dashboard.flow2Title"), desc: t("dashboard.flow2Desc"), who: t("dashboard.flow2Who"), icon: Briefcase, phase: "setup" as const },
      { n: 3, href: "/students", title: t("dashboard.flow3Title"), desc: t("dashboard.flow3Desc"), who: t("dashboard.flow3Who"), icon: Users, phase: "setup" as const },
      { n: 4, href: "/attendance", title: t("dashboard.flow4Title"), desc: t("dashboard.flow4Desc"), who: t("dashboard.flow4Who"), icon: CalendarDays, phase: "daily" as const },
      { n: 5, href: "/results", title: t("dashboard.flow5Title"), desc: t("dashboard.flow5Desc"), who: t("dashboard.flow5Who"), icon: Award, phase: "daily" as const },
      { n: 6, href: "/certificates", title: t("dashboard.flow6Title"), desc: t("dashboard.flow6Desc"), who: t("dashboard.flow6Who"), icon: Star, phase: "docs" as const },
    ],
    [t],
  );

  if (loading && !stats) {
    return <PageLoader label={t("dashboard.loading")} minHeight="60vh" />;
  }

  return (
    <div className="dashboard-page ops-dash animate-fade-in">
      <DashboardHero schoolName={stats?.schoolName} />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="ops-desk">
        <DashboardCommandCenter
          parts={["attention"]}
          ops={opsOverview}
          hr={hrSummary}
          onOpenAdmissionPending={() =>
            openQuickList("admission", "pending", t("admissionStatus.pending"))
          }
          onOpenStaffAttendance={() => setHrModal("attendanceUnmarked")}
          onOpenPayrollPending={() => setHrModal("payrollPending")}
          onOpenDraftStudents={() =>
            openDrill("status", {
              id: "draft",
              label: t("status.draft"),
              value: stats?.byStatus?.draft || 0,
              color: "#d97706",
            })
          }
        />

        <section className="ops-pulse" aria-label={t("dashboard.pulseTitle")}>
          <header className="ops-pulse-head">
            <div>
              <p className="ops-eyebrow">{t("dashboard.pulseEyebrow")}</p>
              <h2>{t("dashboard.pulseTitle")}</h2>
              <p>{t("dashboard.pulseDesc")}</p>
            </div>
          </header>
          <div className="ops-pulse-grid">
            <button
              type="button"
              className="ops-pulse-tile is-blue"
              onClick={openAllStudents}
            >
              <span className="ops-pulse-ico"><Users className="h-4 w-4" /></span>
              <strong>{(stats?.total || 0).toLocaleString("en-IN")}</strong>
              <span>{t("dashboard.totalStudents")}</span>
            </button>
            <button
              type="button"
              className="ops-pulse-tile is-emerald"
              onClick={() =>
                openDrill("status", {
                  id: "ready",
                  label: t("status.ready"),
                  value: stats?.byStatus?.ready || 0,
                  color: "#059669",
                })
              }
            >
              <span className="ops-pulse-ico"><FileCheck className="h-4 w-4" /></span>
              <strong>{(stats?.byStatus?.ready || 0).toLocaleString("en-IN")}</strong>
              <span>{t("dashboard.readyToSubmit")}</span>
            </button>
            <button
              type="button"
              className="ops-pulse-tile is-amber"
              onClick={() =>
                openDrill("status", {
                  id: "draft",
                  label: t("status.draft"),
                  value: stats?.byStatus?.draft || 0,
                  color: "#d97706",
                })
              }
            >
              <span className="ops-pulse-ico"><AlertCircle className="h-4 w-4" /></span>
              <strong>{(stats?.byStatus?.draft || 0).toLocaleString("en-IN")}</strong>
              <span>{t("dashboard.incomplete")}</span>
            </button>
            <button
              type="button"
              className="ops-pulse-tile is-violet"
              onClick={() =>
                openDrill("status", {
                  id: "submitted",
                  label: t("status.submitted"),
                  value: stats?.byStatus?.submitted || 0,
                  color: "#7c3aed",
                })
              }
            >
              <span className="ops-pulse-ico"><CheckCircle className="h-4 w-4" /></span>
              <strong>{(stats?.byStatus?.submitted || 0).toLocaleString("en-IN")}</strong>
              <span>{t("dashboard.submitted")}</span>
            </button>
            <div className="ops-pulse-tile is-slate is-static">
              <span className="ops-pulse-rate">{stats?.completionRate || 0}%</span>
              <span>{t("dashboard.completionRate")}</span>
              <span
                className="ops-pulse-bar"
                aria-hidden
              >
                <i style={{ width: `${Math.min(100, Math.max(0, stats?.completionRate || 0))}%` }} />
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="ops-top ops-top-tools">
        <DashboardFiltersBar
          filters={filters}
          meta={filterMeta}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
          resultCount={stats?.total}
        />
        <DashboardToolbar
          report={reportData}
          filters={filters}
          loading={loading}
          onRefresh={() => loadStats(filters)}
          onPrintReady={(rows, options) => {
            setPrintStudents(rows);
            setPrintOptions(options);
          }}
          lastUpdated={lastUpdated}
        />
      </section>

      <section className="ops-insights">
        <header className="ops-insights-head">
          <div>
            <p className="ops-eyebrow">{t("dashboard.insightsEyebrow")}</p>
            <h2>{t("dashboard.insightsTitle")}</h2>
            <p>{t("dashboard.insightsDesc")}</p>
          </div>
          <div className="ops-insights-tabs" role="tablist" aria-label={t("dashboard.insightsTitle")}>
            {(
              [
                ["students", t("dashboard.tabStudents")],
                ["admission", t("dashboard.tabAdmission")],
                ["staff", t("dashboard.tabStaff")],
                ["details", t("dashboard.tabDetails")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={insightTab === id}
                className={insightTab === id ? "is-active" : undefined}
                onClick={() => setInsightTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="ops-insights-body" role="tabpanel">
          {insightTab === "students" && (
            <div className="ops-students-panel">
              <div className="ops-flow-more ops-staff-shortcuts">
                <span className="ops-flow-more-label">{t("dashboard.studentShortcuts")}</span>
                <div className="ops-flow-actions">
                  {(
                    [
                      { href: "/import", label: t("dashboard.shortcutImport"), icon: Upload, tone: "teal" as const },
                      { href: "/id-cards", label: t("dashboard.shortcutIdCards"), icon: CreditCard, tone: "violet" as const },
                      { href: "/attendance", label: t("dashboard.shortcutStudentAttn"), icon: CalendarDays, tone: "amber" as const },
                      { href: "/students", label: t("dashboard.shortcutAllStudents"), icon: Users, tone: "indigo" as const },
                      { href: scholarshipHref("ready"), label: t("dashboard.readyToSubmit"), icon: Send, tone: "sky" as const },
                    ]
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href + item.label} href={item.href} className="ops-flow-action" data-tone={item.tone}>
                        <span className="ops-flow-action-ico"><Icon className="h-4 w-4" /></span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="ops-charts-grid">
                <article className="ops-chart-card" data-tone="violet">
                  <header>
                    <h3>{t("dashboard.categoryChart")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  <DoughnutChart
                    segments={categorySegments}
                    centerValue={stats?.total || 0}
                    centerLabel={t("dashboard.totalLabel")}
                    size={148}
                    onSegmentClick={(seg) => openDrill("category", seg)}
                  />
                </article>

                <article className="ops-chart-card" data-tone="blue">
                  <header>
                    <h3>{t("dashboard.standardBarChart")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  {standardSegments.length > 0 ? (
                    <VerticalBarChart
                      segments={standardSegments}
                      onSegmentClick={(seg) => openDrill("standard", seg)}
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <GraduationCap className="h-7 w-7 opacity-40" />
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="teal">
                  <header>
                    <h3>{t("dashboard.statusChart")}</h3>
                    <p>{t("dashboard.statusChartDesc")}</p>
                  </header>
                  {statusSegments.length > 0 ? (
                    <VerticalBarChart
                      segments={statusSegments}
                      onSegmentClick={(seg) => openDrill("status", seg)}
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="pink">
                  <header>
                    <h3>{t("dashboard.genderChart")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  <DoughnutChart
                    segments={genderSegments}
                    centerValue={stats?.byGender?.total || 0}
                    centerLabel={t("dashboard.totalLabel")}
                    size={148}
                    onSegmentClick={(seg) => openDrill("gender", seg)}
                  />
                </article>

                <article className="ops-chart-card ops-chart-wide" data-tone="blue">
                  <header>
                    <h3>{t("dashboard.classBarChart")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  {classSegments.length > 0 ? (
                    <VerticalBarChart
                      segments={classSegments}
                      onSegmentClick={(seg) => openDrill("class", seg)}
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}

          {insightTab === "admission" && (
            <div className="ops-admit">
              {(() => {
                const a = stats?.admissions;
                const total = a?.total || 0;
                const pending = a?.pending || 0;
                const verified = a?.verified || 0;
                const rejected = a?.rejected || 0;
                const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
                const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
                const rejectedPct = total > 0 ? Math.round((rejected / total) * 100) : 0;
                return (
                  <>
                    <div className="ops-admit-hero">
                      <div className="ops-admit-hero-text">
                        <h3>{t("dashboard.admissionHeroTitle")}</h3>
                        <p>{t("dashboard.admissionHeroDesc")}</p>
                      </div>
                      <div className="ops-admit-hero-stat">
                        <strong>{verifiedPct}%</strong>
                        <span>{t("dashboard.admissionVerifiedPct")}</span>
                      </div>
                      <div className="ops-admit-progress" aria-hidden>
                        <span className="is-verified" style={{ width: `${verifiedPct}%` }} />
                        <span className="is-pending" style={{ width: `${pendingPct}%` }} />
                        <span className="is-rejected" style={{ width: `${rejectedPct}%` }} />
                      </div>
                    </div>

                    <div className="ops-admit-kpis ops-admit-kpis-rich">
                      <button
                        type="button"
                        className="ops-admit-kpi is-amber"
                        onClick={() => openQuickList("admission", "pending", t("admissionStatus.pending"))}
                      >
                        <span className="ops-admit-kpi-ico"><Clock className="h-4 w-4" /></span>
                        <span>{t("admissionStatus.pending")}</span>
                        <strong>{pending.toLocaleString("en-IN")}</strong>
                        <em>{pendingPct}%</em>
                        <small>{t("dashboard.tapToOpenList")}</small>
                      </button>
                      <button
                        type="button"
                        className="ops-admit-kpi is-green"
                        onClick={() => openQuickList("admission", "verified", t("admissionStatus.verified"))}
                      >
                        <span className="ops-admit-kpi-ico"><CheckCircle className="h-4 w-4" /></span>
                        <span>{t("admissionStatus.verified")}</span>
                        <strong>{verified.toLocaleString("en-IN")}</strong>
                        <em>{verifiedPct}%</em>
                        <small>{t("dashboard.tapToOpenList")}</small>
                      </button>
                      <button
                        type="button"
                        className="ops-admit-kpi is-rose"
                        onClick={() => openQuickList("admission", "rejected", t("admissionStatus.rejected"))}
                      >
                        <span className="ops-admit-kpi-ico"><Ban className="h-4 w-4" /></span>
                        <span>{t("admissionStatus.rejected")}</span>
                        <strong>{rejected.toLocaleString("en-IN")}</strong>
                        <em>{rejectedPct}%</em>
                        <small>{t("dashboard.tapToOpenList")}</small>
                      </button>
                      <div className="ops-admit-kpi is-blue is-total">
                        <span className="ops-admit-kpi-ico"><Users className="h-4 w-4" /></span>
                        <span>{t("dashboard.admissionTotal")}</span>
                        <strong>{total.toLocaleString("en-IN")}</strong>
                        <small>{t("dashboard.admissionTotalHint")}</small>
                      </div>
                    </div>

                    <div className="ops-flow-more ops-staff-shortcuts">
                      <span className="ops-flow-more-label">{t("dashboard.admissionShortcuts")}</span>
                      <div className="ops-flow-actions">
                        <Link href="/admissions" className="ops-flow-action" data-tone="teal">
                          <span className="ops-flow-action-ico"><ClipboardCheck className="h-4 w-4" /></span>
                          <span>{t("dashboard.shortcutVerifyDesk")}</span>
                        </Link>
                        <button
                          type="button"
                          className="ops-flow-action"
                          data-tone="amber"
                          onClick={() => openQuickList("admission", "pending", t("admissionStatus.pending"))}
                        >
                          <span className="ops-flow-action-ico"><Clock className="h-4 w-4" /></span>
                          <span>{t("dashboard.shortcutPendingList")}</span>
                        </button>
                        <button
                          type="button"
                          className="ops-flow-action"
                          data-tone="sky"
                          onClick={() => openQuickList("admission", "verified", t("admissionStatus.verified"))}
                        >
                          <span className="ops-flow-action-ico"><CheckCircle className="h-4 w-4" /></span>
                          <span>{t("dashboard.shortcutVerifiedList")}</span>
                        </button>
                        <Link href="/students/new" className="ops-flow-action" data-tone="violet">
                          <span className="ops-flow-action-ico"><UserPlus className="h-4 w-4" /></span>
                          <span>{t("dashboard.shortcutAddStudent")}</span>
                        </Link>
                      </div>
                    </div>

                    <div className="ops-admit-main">
                      <article className="ops-chart-card ops-admit-chart" data-tone="teal">
                        <header>
                          <h3>{t("dashboard.admissionChartTitle")}</h3>
                          <p>{t("dashboard.admissionChartDesc")}</p>
                        </header>
                        {admissionSegments.length > 0 ? (
                          <DoughnutChart
                            segments={admissionSegments}
                            centerValue={total}
                            centerLabel={t("dashboard.totalLabel")}
                            size={152}
                            onSegmentClick={(seg) =>
                              openQuickList("admission", seg.id || "pending", seg.label)
                            }
                          />
                        ) : (
                          <div className="ops-insights-empty-box">
                            <p>{t("dashboard.noClassData")}</p>
                          </div>
                        )}
                      </article>

                      <article className="ops-chart-card ops-admit-feed" data-tone="blue">
                        <header className="ops-admit-feed-head">
                          <div>
                            <h3>{t("dashboard.admissionRecentTitle")}</h3>
                            <p>{t("dashboard.admissionRecentDesc")}</p>
                          </div>
                          <button
                            type="button"
                            className="ops-admit-feed-all"
                            onClick={() => openQuickList("admission", "verified", t("admissionStatus.verified"))}
                          >
                            {t("dashboard.viewAll")}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </header>
                        {(stats?.admissionRecent || []).length > 0 ? (
                          <div className="ops-admit-recent">
                            {(stats?.admissionRecent || []).map((row) => {
                              const initial = (row.name || "?").trim().charAt(0).toUpperCase();
                              return (
                                <Link key={row.id} href={`/students/${row.id}`} className="ops-admit-row">
                                  <span className="ops-admit-avatar" aria-hidden>{initial}</span>
                                  <div className="ops-admit-row-main">
                                    <strong>{row.name || "—"}</strong>
                                    <small>
                                      {row.classLabel}
                                      {row.category ? ` · ${row.category}` : ""}
                                    </small>
                                  </div>
                                  <div className="ops-admit-meta">
                                    <span>{row.verifiedBy}</span>
                                    <em>
                                      {row.verifiedAt
                                        ? new Date(row.verifiedAt).toLocaleString("en-IN", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })
                                        : "—"}
                                    </em>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="ops-insights-empty-box">
                            <ClipboardCheck className="h-7 w-7 opacity-40" />
                            <p>{t("dashboard.admissionRecentEmpty")}</p>
                            <Link href="/admissions" className="text-sm font-bold text-blue-700 hover:underline">
                              {t("dashboard.shortcutVerifyDesk")}
                            </Link>
                          </div>
                        )}
                      </article>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {insightTab === "staff" && (
            <div className="ops-staff-panel">
              <div className="ops-hr-month">
                {t("dashboard.hrMonthLabel", {
                  month: hrSummary?.month || new Date().getMonth() + 1,
                  year: hrSummary?.year || new Date().getFullYear(),
                })}
              </div>

              <div className="ops-admit-kpis ops-kpis-6">
                <button
                  type="button"
                  className="ops-admit-kpi is-blue"
                  onClick={() => openQuickList("staff", "", t("dashboard.staffActive"))}
                >
                  <span>{t("dashboard.staffActive")}</span>
                  <strong>{(hrSummary?.totalStaff ?? stats?.totalStaff ?? 0).toLocaleString("en-IN")}</strong>
                  <small>{t("dashboard.tapToOpenList")}</small>
                </button>
                <button type="button" className="ops-admit-kpi is-teal" onClick={() => setHrModal("attendance")}>
                  <span>{t("dashboard.hrAttendanceMarked")}</span>
                  <strong>
                    {(hrSummary?.attendanceMarked || 0).toLocaleString("en-IN")}
                    <em>/{(hrSummary?.totalStaff || stats?.totalStaff || 0).toLocaleString("en-IN")}</em>
                  </strong>
                  <small>{t("dashboard.tapToOpenList")}</small>
                </button>
                <button type="button" className="ops-admit-kpi is-amber" onClick={() => setHrModal("attendanceUnmarked")}>
                  <span>{t("dashboard.hrAttendanceUnmarked")}</span>
                  <strong>
                    {(
                      hrSummary?.attendanceUnmarked ??
                      Math.max(
                        0,
                        (hrSummary?.totalStaff || stats?.totalStaff || 0) - (hrSummary?.attendanceMarked || 0),
                      )
                    ).toLocaleString("en-IN")}
                  </strong>
                  <small>{t("dashboard.tapToOpenList")}</small>
                </button>
                <div className="ops-admit-kpi is-slate">
                  <span>{t("dashboard.hrWithSalary")}</span>
                  <strong>{(hrSummary?.withSalary || 0).toLocaleString("en-IN")}</strong>
                </div>
                <button type="button" className="ops-admit-kpi is-green" onClick={() => setHrModal("payrollPaid")}>
                  <span>{t("dashboard.hrPaid")}</span>
                  <strong>{(hrSummary?.payrollPaid || 0).toLocaleString("en-IN")}</strong>
                  <small>₹{(hrSummary?.totalNet || 0).toLocaleString("en-IN")}</small>
                </button>
                <button type="button" className="ops-admit-kpi is-rose" onClick={() => setHrModal("payrollPending")}>
                  <span>{t("dashboard.hrPayPending")}</span>
                  <strong>{(hrSummary?.payrollPending || 0).toLocaleString("en-IN")}</strong>
                  <small>{t("dashboard.tapToOpenList")}</small>
                </button>
              </div>

              <div className="ops-flow-more ops-staff-shortcuts">
                <span className="ops-flow-more-label">{t("dashboard.staffShortcuts")}</span>
                <div className="ops-flow-actions">
                  {(
                    [
                      { href: "/staff/attendance", label: t("dashboard.shortcutAttendance"), icon: CalendarDays, tone: "teal" as const },
                      { href: "/staff/payroll", label: t("dashboard.shortcutPayroll"), icon: Wallet, tone: "amber" as const },
                      { href: "/staff/salary-slip", label: t("dashboard.shortcutSalarySlip"), icon: FileSpreadsheet, tone: "violet" as const },
                      { href: "/staff/salary-statement", label: t("dashboard.shortcutStatement"), icon: Calculator, tone: "sky" as const },
                      { href: "/staff/new", label: t("nav.staffAdd"), icon: UserPlus, tone: "indigo" as const },
                      { href: "/staff", label: t("dashboard.shortcutAllStaff"), icon: Briefcase, tone: "sky" as const },
                    ]
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} className="ops-flow-action" data-tone={item.tone}>
                        <span className="ops-flow-action-ico"><Icon className="h-4 w-4" /></span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="ops-admit-grid ops-staff-charts">
                <article className="ops-chart-card" data-tone="violet">
                  <header>
                    <h3>{t("dashboard.staffByDesignation")}</h3>
                    <p>{t("dashboard.staffByDesignationDesc")}</p>
                  </header>
                  {staffSegments.length > 0 ? (
                    <VerticalBarChart
                      segments={staffSegments}
                      onSegmentClick={(seg) =>
                        openQuickList("staff", seg.id || seg.label, seg.label)
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="teal">
                  <header>
                    <h3>{t("dashboard.hrModalAttendance")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  {staffAttnSegments.length > 0 ? (
                    <DoughnutChart
                      segments={staffAttnSegments}
                      centerValue={hrSummary?.totalStaff || 0}
                      centerLabel={t("dashboard.totalLabel")}
                      size={140}
                      onSegmentClick={(seg) =>
                        setHrModal(seg.id === "unmarked" ? "attendanceUnmarked" : "attendance")
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="blue">
                  <header>
                    <h3>{t("dashboard.hrPayrollChart")}</h3>
                    <p>{t("dashboard.hrPayrollChartDesc")}</p>
                  </header>
                  {payrollSegments.length > 0 ? (
                    <DoughnutChart
                      segments={payrollSegments}
                      centerValue={(hrSummary?.payrollPaid || 0) + (hrSummary?.payrollPending || 0)}
                      centerLabel={t("dashboard.totalLabel")}
                      size={140}
                      onSegmentClick={(seg) =>
                        setHrModal(seg.id === "paid" ? "payrollPaid" : "payrollPending")
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.hrPayrollEmpty")}</p>
                      <Link href="/staff/payroll" className="text-sm font-bold text-blue-700 hover:underline">
                        {t("dashboard.shortcutPayroll")}
                      </Link>
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}

          {insightTab === "details" && (
            <div className="ops-details-stack">
              <DashboardSummaryTable
                total={stats?.total || 0}
                byStandard={tableByStandard}
                byClass={tableByClass}
                byCategory={tableByCategory}
                byStatus={tableByStatus}
                byGender={tableByGender}
              />
              <div className="ops-recent-panel">
                <div className="ops-recent-actions">
                  <h3 className="ops-details-subhead">{t("dashboard.recentSubmissions")}</h3>
                  <Link href="/bulk-submit">
                    <Button variant="ghost" size="sm" className="text-xs font-semibold text-violet-700 hover:bg-violet-50 hover:text-violet-800">
                      {t("dashboard.newBatch")}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
                  <div className="ops-recent-list">
                    {stats.recentSubmissions.slice(0, 6).map((sub) => (
                      <div key={sub.id} className="dashboard-submission-item">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {t("dashboard.submissionStudentCount", { count: sub.totalCount })}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(sub.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                        <Badge status={sub.status === "completed" ? "submitted" : "pending"} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ops-insights-empty-box">
                    <Send className="h-7 w-7 opacity-40" />
                    <p>{t("dashboard.noSubmissions")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <DashboardCommandCenter
        parts={["hubs"]}
        ops={opsOverview}
        hr={hrSummary}
      />

      <section className="ops-flow ops-flow-compact">
        <div className="ops-flow-top">
          <div>
            <p className="ops-eyebrow">{t("dashboard.flowEyebrow")}</p>
            <h2>{t("dashboard.flowTitle")}</h2>
            <p>{t("dashboard.flowDesc")}</p>
          </div>
        </div>
        <div className="ops-flow-steps">
          {setupFlow.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.n} className="ops-flow-cell" data-phase={step.phase}>
                {i > 0 ? <span className="ops-flow-line" aria-hidden /> : null}
                <Link href={step.href} className="ops-flow-step">
                  <span className="ops-flow-num">{step.n}</span>
                  <span className="ops-flow-ico"><Icon className="h-4 w-4" /></span>
                  <span className="ops-flow-txt">
                    <strong>{step.title}</strong>
                    <small>{step.desc}</small>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {loading && stats && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-medium text-blue-700 shadow-lg print:hidden">
          <Spinner size="sm" />
          {t("dashboard.loading")}
        </div>
      )}

      <DashboardPrintReport report={reportData} students={printStudents} options={printOptions} />

      <DashboardDrillModal
        key={drillTarget ? `${drillTarget.dimension}:${drillTarget.value}` : "drill"}
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        target={drillTarget}
        baseFilters={filters}
        filterMeta={filterMeta}
        report={reportData}
        onPrintReady={(rows, options) => {
          setPrintStudents(rows);
          setPrintOptions(options);
        }}
      />

      <DashboardQuickListModal
        key={quickList ? `${quickList.kind}:${quickList.value}` : "quick"}
        open={Boolean(quickList)}
        onClose={() => setQuickList(null)}
        kind={quickList?.kind || "admission"}
        value={quickList?.value || ""}
        label={quickList?.label || ""}
      />

      <DashboardHrDataModal
        key={hrModal || "hr"}
        open={Boolean(hrModal)}
        onClose={() => setHrModal(null)}
        kind={hrModal || "attendance"}
        month={hrSummary?.month || new Date().getMonth() + 1}
        year={hrSummary?.year || new Date().getFullYear()}
      />
    </div>
  );
}
