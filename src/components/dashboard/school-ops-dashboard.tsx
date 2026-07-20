"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard, DashboardSection } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileCheck, Clock, CheckCircle, AlertCircle, Upload, Send,
  TrendingUp, ArrowRight, BookOpen, Briefcase, CreditCard, Bot,
  GraduationCap, BarChart2, Activity, Star, LayoutDashboard,
  PieChart, UserRound, ClipboardCheck, Calculator, CalendarDays,
  Award, FileSearch, MessageCircle, CalendarClock, UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
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
import { BarChart, DoughnutChart, VerticalBarChart } from "@/components/dashboard/charts";
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
  schoolName?: string;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  categoryChart?: { category: string; count: number; color: string }[];
  byStandard?: { standard: string; count: number }[];
  byClass?: { label: string; standard: string; section: string; count: number }[];
  byGender?: { male: number; female: number; other: number; total: number };
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

const QUICK_ACTIONS = [
  { href: "/students/new", labelKey: "nav.addStudent", descKey: "dashboard.addStudentDesc", icon: UserPlus, accent: "bg-emerald-600", clerkAccent: "bg-emerald-600", featured: true },
  { href: "/staff/new", labelKey: "nav.staffAdd", descKey: "dashboard.addStaffDesc", icon: UserPlus, accent: "bg-indigo-600", clerkAccent: "bg-slate-700", featured: true },
  { href: "/classes", labelKey: "nav.classes", descKey: "dashboard.manageClassesRoster", icon: BookOpen, accent: "bg-blue-600", clerkAccent: "bg-cyan-700", statKey: "totalClasses" },
  { href: "/students", labelKey: "nav.students", descKey: "dashboard.viewAllStudents", icon: Users, accent: "bg-sky-700", clerkAccent: "bg-cyan-600", statKey: "total" },
  { href: "/staff", labelKey: "nav.staff", descKey: "dashboard.manageStaff", icon: Briefcase, accent: "bg-indigo-500", clerkAccent: "bg-slate-600", statKey: "totalStaff" },
  { href: "/admissions", labelKey: "navExt.admissions", descKey: "clerkPortal.admissionsDesc", icon: ClipboardCheck, accent: "bg-cyan-600", clerkAccent: "bg-teal-600" },
  { href: "/attendance", labelKey: "navExt.studentAttendance", descKey: "clerkPortal.attendanceDesc", icon: CalendarDays, accent: "bg-teal-600", clerkAccent: "bg-cyan-800" },
  { href: "/timetable", labelKey: "navExt.timetable", descKey: "dashboard.timetableDesc", icon: CalendarClock, accent: "bg-cyan-700", clerkAccent: "bg-sky-700" },
  { href: "/results", labelKey: "navExt.results", descKey: "dashboard.resultsDesc", icon: Award, accent: "bg-fuchsia-600", clerkAccent: "bg-rose-600" },
  { href: "/import", labelKey: "nav.bulkImport", descKey: "dashboard.importDesc", icon: Upload, accent: "bg-sky-600", clerkAccent: "bg-cyan-600" },
  { href: "/bulk-submit", labelKey: "nav.bulkSubmit", descKey: "dashboard.bulkSubmitDesc", icon: Send, accent: "bg-violet-600", clerkAccent: "bg-cyan-700" },
  { href: "/auto-apply", labelKey: "nav.autoApply", descKey: "dashboard.autoApplyDesc", icon: Bot, accent: "bg-orange-600", clerkAccent: "bg-rose-500" },
  { href: "/export", labelKey: "nav.exportData", descKey: "clerkPortal.exportDesc", icon: FileCheck, accent: "bg-slate-700", clerkAccent: "bg-slate-700" },
  { href: "/accounting", labelKey: "navExt.accounting", descKey: "clerkPortal.accountingDesc", icon: Calculator, accent: "bg-indigo-700", clerkAccent: "bg-slate-800" },
  { href: "/id-cards", labelKey: "nav.idCards", descKey: "dashboard.idCardsDesc", icon: CreditCard, accent: "bg-pink-600", clerkAccent: "bg-rose-600" },
  { href: "/certificates", labelKey: "navExt.certificates", descKey: "dashboard.certificatesDesc", icon: Star, accent: "bg-amber-600", clerkAccent: "bg-teal-700" },
  { href: "/students/board-records", labelKey: "navExt.boardRecords", descKey: "dashboard.boardRecordsDesc", icon: FileSearch, accent: "bg-rose-600", clerkAccent: "bg-cyan-800" },
  { href: "/chat", labelKey: "nav.chat", descKey: "dashboard.chatDesc", icon: MessageCircle, accent: "bg-blue-500", clerkAccent: "bg-cyan-600", hideForClerk: true },
  { href: "/staff/attendance", labelKey: "nav.staffAttendance", descKey: "clerkPortal.staffAttendanceDesc", icon: ClipboardCheck, accent: "bg-emerald-700", clerkAccent: "bg-teal-700" },
] as const;

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d?.user?.role || null))
      .catch(() => setUserRole(null));
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
      label: t("dashboard.stdLabel", { standard: s.standard }),
      value: s.count,
      color: colors[i % colors.length],
      percent: stats?.total ? Math.round((s.count / stats.total) * 100) : 0,
    }));
  }, [stats, t]);

  const classSegments = useMemo(() => {
    return (stats?.byClass || []).map((c, i) => {
      const colors = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0891b2"];
      return {
        label: c.label,
        value: c.count,
        color: colors[i % colors.length],
        percent: stats?.total ? Math.round((c.count / stats.total) * 100) : 0,
      };
    });
  }, [stats]);

  const statusSegments = useMemo(() => {
    return STATUS_KEYS.map((key) => ({
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
      { label: t("gender.male"), value: g.male, color: GENDER_CHART_COLORS.male },
      { label: t("gender.female"), value: g.female, color: GENDER_CHART_COLORS.female },
      ...(g.other > 0 ? [{ label: t("gender.other"), value: g.other, color: GENDER_CHART_COLORS.other }] : []),
    ].filter((s) => s.value > 0);
  }, [stats, t]);

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

  if (loading && !stats) {
    return (
      <div className="dashboard-page flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
            <LayoutDashboard className="absolute inset-0 m-auto h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page space-y-5 animate-fade-in">
      <DashboardHero schoolName={stats?.schoolName} />

      {/* Featured add actions — school admin + clerk */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/students/new"
          className="group flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3.5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
            <UserPlus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{t("nav.addStudent")}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t("dashboard.featuredAddStudent")}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-emerald-500 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/staff/new"
          className="group flex items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-white px-4 py-3.5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
            <UserPlus className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{t("nav.staffAdd")}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t("dashboard.featuredAddStaff")}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-indigo-500 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Toolbar — export & refresh */}
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

      {/* Filters */}
      <DashboardFiltersBar
        filters={filters}
        meta={filterMeta}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={stats?.total}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Link href="/students" className="block h-full">
          <MetricCard label={t("dashboard.totalStudents")} value={(stats?.total || 0).toLocaleString("en-IN")} icon={<Users className="h-5 w-5 text-white" />} accent="blue" className="h-full cursor-pointer transition-shadow hover:shadow-md" />
        </Link>
        <Link href={scholarshipHref("ready")} className="block h-full">
          <MetricCard label={t("dashboard.readyToSubmit")} value={(stats?.byStatus?.ready || 0).toLocaleString("en-IN")} icon={<FileCheck className="h-5 w-5 text-white" />} accent="emerald" className="h-full cursor-pointer transition-shadow hover:shadow-md" />
        </Link>
        <Link href={scholarshipHref("submitted")} className="block h-full">
          <MetricCard label={t("dashboard.submitted")} value={(stats?.byStatus?.submitted || 0).toLocaleString("en-IN")} icon={<CheckCircle className="h-5 w-5 text-white" />} accent="violet" className="h-full cursor-pointer transition-shadow hover:shadow-md" />
        </Link>
        <Link href={scholarshipHref("draft")} className="block h-full">
          <MetricCard label={t("dashboard.incomplete")} value={(stats?.byStatus?.draft || 0).toLocaleString("en-IN")} icon={<AlertCircle className="h-5 w-5 text-white" />} accent="amber" className="h-full cursor-pointer transition-shadow hover:shadow-md" />
        </Link>
      </div>

      {/* Charts row 1: Doughnut + Vertical bars */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DashboardSection
          icon={<PieChart className="h-5 w-5" />}
          title={t("dashboard.categoryChart")}
          description={t("dashboard.categoryChartDesc")}
          iconClassName="bg-violet-600 shadow-violet-600/20"
        >
          <DoughnutChart
            segments={categorySegments}
            centerValue={stats?.total || 0}
            centerLabel={t("dashboard.totalLabel")}
            size={190}
          />
        </DashboardSection>

        <DashboardSection
          icon={<BarChart2 className="h-5 w-5" />}
          title={t("dashboard.standardBarChart")}
          description={t("dashboard.standardBarChartDesc")}
          iconClassName="bg-blue-600 shadow-blue-600/20"
        >
          {standardSegments.length > 0 ? (
            <VerticalBarChart segments={standardSegments} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <GraduationCap className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">{t("dashboard.noClassData")}</p>
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Charts row 2: Class bar + Status + Gender */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DashboardSection
          icon={<BookOpen className="h-5 w-5" />}
          title={t("dashboard.classBarChart")}
          description={t("dashboard.classBarChartDesc")}
          iconClassName="bg-indigo-600 shadow-indigo-600/20"
          className="lg:col-span-1"
        >
          <BarChart segments={classSegments.slice(0, 10)} />
        </DashboardSection>

        <DashboardSection
          icon={<Activity className="h-5 w-5" />}
          title={t("dashboard.statusChart")}
          description={t("dashboard.statusChartDesc")}
          iconClassName="bg-sky-600 shadow-sky-600/20"
        >
          <BarChart segments={statusSegments} />
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link href="/students">
              <Button variant="outline" size="sm" className="w-full gap-2 font-semibold">
                {t("dashboard.viewAllStudents")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </DashboardSection>

        <DashboardSection
          icon={<UserRound className="h-5 w-5" />}
          title={t("dashboard.genderChart")}
          description={t("dashboard.genderChartDesc")}
          iconClassName="bg-pink-600 shadow-pink-600/20"
        >
          <DoughnutChart
            segments={genderSegments}
            centerValue={stats?.byGender?.total || 0}
            centerLabel={t("dashboard.totalLabel")}
            size={170}
          />
        </DashboardSection>
      </div>

      {/* Detailed data table */}
      <DashboardSection
        icon={<BarChart2 className="h-5 w-5" />}
        title={t("dashboard.dataSummary")}
        description={t("dashboard.dataSummaryDesc")}
        iconClassName="bg-slate-700 shadow-slate-700/20"
      >
        <DashboardSummaryTable
          total={stats?.total || 0}
          byStandard={tableByStandard}
          byClass={tableByClass}
          byCategory={tableByCategory}
          byStatus={tableByStatus}
          byGender={tableByGender}
        />
      </DashboardSection>

      {/* Quick actions + recent */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardSection
            icon={<TrendingUp className="h-5 w-5" />}
            title={t("dashboard.quickActions")}
            iconClassName={userRole === "clerk" ? "bg-cyan-700 shadow-cyan-700/20" : "bg-indigo-600 shadow-indigo-600/20"}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_ACTIONS.filter((action) => !(userRole === "clerk" && "hideForClerk" in action && action.hideForClerk)).map((action) => {
                const Icon = action.icon;
                const statKey = "statKey" in action ? action.statKey : undefined;
                const stat = statKey ? (stats as unknown as Record<string, unknown>)?.[statKey] as number | undefined : undefined;
                const accentClass = userRole === "clerk" && "clerkAccent" in action ? action.clerkAccent : action.accent;
                return (
                  <Link key={action.href} href={action.href} className="group block h-full">
                    <div className="dashboard-action-tile h-full">
                      <div className="relative z-10 flex items-start justify-between">
                        <div className={cnIcon(accentClass)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {stat !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-800 tabular-nums">{stat}</span>
                        )}
                      </div>
                      <div className="relative z-10 min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 leading-tight">{t(action.labelKey)}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{t(action.descKey)}</p>
                      </div>
                      <ArrowRight className="relative z-10 h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection
          icon={<Clock className="h-5 w-5" />}
          title={t("dashboard.recentSubmissions")}
          iconClassName="bg-violet-600 shadow-violet-600/20"
          action={
            <Link href="/bulk-submit">
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-violet-700 hover:text-violet-800 hover:bg-violet-50">
                {t("dashboard.newBatch")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentSubmissions.map((sub) => (
                <div key={sub.id} className="dashboard-submission-item">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{t("dashboard.submissionStudentCount", { count: sub.totalCount })}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(sub.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sub.successCount > 0 && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        {t("dashboard.successCount", { count: sub.successCount })}
                      </span>
                    )}
                    {sub.failedCount > 0 && (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        {t("dashboard.failedCount", { count: sub.failedCount })}
                      </span>
                    )}
                    <Badge status={sub.status === "completed" ? "submitted" : "pending"} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Send className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">{t("dashboard.noSubmissions")}</p>
            </div>
          )}
        </DashboardSection>
      </div>

      {loading && stats && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-medium text-blue-700 shadow-lg print:hidden">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          {t("dashboard.loading")}
        </div>
      )}

      <DashboardPrintReport report={reportData} students={printStudents} options={printOptions} />
    </div>
  );
}

function cnIcon(accent: string) {
  return cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-lg", accent);
}
