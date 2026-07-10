"use client";

import { useEffect, useState } from "react";
import { MetricCard, DashboardSection } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileCheck, Clock, CheckCircle, AlertCircle, Upload, Send,
  TrendingUp, ArrowRight, BookOpen, Briefcase, CreditCard, Bot,
  GraduationCap, BarChart2, Activity, Star, Sparkles, LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { CategoryDashboardPanel } from "@/components/dashboard/category-dashboard";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import "@/components/dashboard/dashboard.css";

interface Stats {
  total: number;
  totalClasses?: number;
  totalStaff?: number;
  schoolName?: string;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  byStandard?: { standard: string; count: number }[];
  completionRate: number;
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
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-400",
  ready: "bg-blue-500",
  pending: "bg-amber-500",
  submitted: "bg-emerald-500",
  approved: "bg-green-600",
  rejected: "bg-red-500",
};

const QUICK_ACTIONS = [
  { href: "/classes",      labelKey: "nav.classes",      descKey: "dashboard.manageClassesRoster", icon: BookOpen,   accent: "bg-blue-600",    statKey: "totalClasses" },
  { href: "/staff",        labelKey: "nav.staff",        descKey: "dashboard.manageStaff",       icon: Briefcase,  accent: "bg-indigo-600",  statKey: "totalStaff"   },
  { href: "/students/new", labelKey: "nav.addStudent",   descKey: "dashboard.addStudentDesc",    icon: Users,      accent: "bg-emerald-600" },
  { href: "/import",       labelKey: "nav.bulkImport",   descKey: "dashboard.importDesc",        icon: Upload,     accent: "bg-sky-600"     },
  { href: "/bulk-submit",  labelKey: "nav.bulkSubmit",   descKey: "dashboard.bulkSubmitDesc",    icon: Send,       accent: "bg-violet-600"  },
  { href: "/auto-apply",   labelKey: "nav.autoApply",    descKey: "dashboard.autoApplyDesc",     icon: Bot,        accent: "bg-orange-600"  },
  { href: "/id-cards",     labelKey: "nav.idCards",      descKey: "dashboard.idCardsDesc",       icon: CreditCard, accent: "bg-pink-600"    },
  { href: "/certificates", labelKey: "navExt.certificates", descKey: "dashboard.certificatesDesc", icon: Star,    accent: "bg-amber-600"   },
] as const;

export default function DashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) throw new Error(payload?.error || "Failed to load");
        setStats(payload);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

  const standardList = (stats?.byStandard || []).slice().sort((a, b) => {
    const n = Number(a.standard) - Number(b.standard);
    return isNaN(n) ? 0 : n;
  });

  const completion = stats?.completionRate || 0;
  const ringDash = `${completion * 1.634} 163.4`;

  return (
    <div className="dashboard-page space-y-6 animate-fade-in">

      {/* Hero */}
      <div className="dashboard-hero relative rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-900/20">
        <div className="dashboard-hero-glow -right-16 -top-16 h-56 w-56 bg-blue-400/20" />
        <div className="dashboard-hero-glow -left-8 bottom-0 h-40 w-40 bg-indigo-400/15" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="pulse-dot" />
                {t("dashboard.livePortal")}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-blue-100">
                {t("dashboard.overviewEyebrow")}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-blue-100/90">{t("dashboard.subtitle")}</p>
            {stats?.schoolName && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-200/80">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {stats.schoolName}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                {t("dashboard.completionRate")}
              </p>
              <p className="text-3xl font-bold tabular-nums text-white">{completion}%</p>
            </div>
            <div className="relative h-[4.5rem] w-[4.5rem]">
              <svg className="dashboard-ring h-full w-full" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,.15)" strokeWidth="6" fill="none" />
                <circle
                  cx="32" cy="32" r="26"
                  stroke="white" strokeWidth="6" fill="none"
                  strokeDasharray={ringDash}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {completion}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label={t("dashboard.totalStudents")}
          value={(stats?.total || 0).toLocaleString("en-IN")}
          icon={<Users className="h-5 w-5 text-white" />}
          accent="blue"
        />
        <MetricCard
          label={t("dashboard.readyToSubmit")}
          value={(stats?.byStatus?.ready || 0).toLocaleString("en-IN")}
          icon={<FileCheck className="h-5 w-5 text-white" />}
          accent="emerald"
        />
        <MetricCard
          label={t("dashboard.submitted")}
          value={(stats?.byStatus?.submitted || 0).toLocaleString("en-IN")}
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          accent="violet"
        />
        <MetricCard
          label={t("dashboard.incomplete")}
          value={(stats?.byStatus?.draft || 0).toLocaleString("en-IN")}
          icon={<AlertCircle className="h-5 w-5 text-white" />}
          accent="amber"
        />
      </div>

      {/* Category overview */}
      <DashboardSection
        icon={<BarChart2 className="h-5 w-5" />}
        title={t("dashboard.categoryOverview")}
        description={t("category.subtitle")}
        iconClassName="bg-blue-600 shadow-blue-600/20"
      >
        <CategoryDashboardPanel embedded />
      </DashboardSection>

      {/* Quick actions + standard chart */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardSection
            icon={<TrendingUp className="h-5 w-5" />}
            title={t("dashboard.quickActions")}
            iconClassName="bg-indigo-600 shadow-indigo-600/20"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                const statKey = "statKey" in action ? action.statKey : undefined;
                const stat = statKey
                  ? (stats as unknown as Record<string, unknown>)?.[statKey] as number | undefined
                  : undefined;
                return (
                  <Link key={action.href} href={action.href} className="group block h-full">
                    <div className="dashboard-action-tile h-full">
                      <div className="relative z-10 flex items-start justify-between">
                        <div className={cnIcon(action.accent)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {stat !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-800 tabular-nums">
                            {stat}
                          </span>
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
          icon={<GraduationCap className="h-5 w-5" />}
          title={t("dashboard.studentsByStandard")}
          iconClassName="bg-emerald-600 shadow-emerald-600/20"
          className="h-full"
        >
          {standardList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <GraduationCap className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-medium">{t("dashboard.noClassData")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {standardList.map((s) => {
                const pct = stats?.total ? Math.round((s.count / stats.total) * 100) : 0;
                return (
                  <div key={s.standard}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {t("dashboard.stdLabel", { standard: s.standard })}
                      </span>
                      <span className="font-bold tabular-nums text-slate-900">
                        {s.count}
                        <span className="ml-1 font-normal text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* Status + recent submissions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSection
          icon={<Activity className="h-5 w-5" />}
          title={t("dashboard.statusBreakdown")}
          iconClassName="bg-sky-600 shadow-sky-600/20"
        >
          <div className="space-y-1">
            {STATUS_KEYS.map((key) => {
              const count = stats?.byStatus?.[key] || 0;
              const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={key} className="dashboard-status-row">
                  <span className={cnDot(STATUS_COLORS[key])} />
                  <span className="text-sm font-medium text-slate-700">{t(`status.${key}`)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(`${STATUS_COLORS[key]} h-full rounded-full transition-all duration-700`)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums text-slate-900">{count}</span>
                    <span className="ml-1.5 text-xs text-slate-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link href="/students">
              <Button variant="outline" size="sm" className="w-full gap-2 font-semibold">
                {t("dashboard.viewAllStudents")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </DashboardSection>

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
                    <p className="text-sm font-semibold text-slate-800">
                      {t("dashboard.submissionStudentCount", { count: sub.totalCount })}
                    </p>
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
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Send className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-medium">{t("dashboard.noSubmissions")}</p>
            </div>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}

function cnIcon(accent: string) {
  return cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-lg", accent);
}

function cnDot(color: string) {
  return cn("h-2.5 w-2.5 shrink-0 rounded-full", color);
}
