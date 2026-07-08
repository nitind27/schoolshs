"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileCheck, Clock, CheckCircle, AlertCircle, Upload, Send,
  TrendingUp, ArrowRight, BookOpen, Briefcase, CreditCard, Bot,
  GraduationCap, BarChart2, Activity, Star,
} from "lucide-react";
import Link from "next/link";
import { CategoryDashboardPanel } from "@/components/dashboard/category-dashboard";
import { useT } from "@/i18n/locale-provider";

interface Stats {
  total: number;
  totalClasses?: number;
  totalStaff?: number;
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

const QUICK_ACTIONS = [
  { href: "/classes",      label: "Classes",      icon: BookOpen,   color: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100",  iconColor: "text-blue-600",   statKey: "totalClasses"  },
  { href: "/staff",        label: "Staff",        icon: Briefcase,  color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100", iconColor: "text-indigo-600", statKey: "totalStaff" },
  { href: "/students/new", label: "Add Student",  icon: Users,      color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100", iconColor: "text-emerald-600" },
  { href: "/import",       label: "Bulk Import",  icon: Upload,     color: "bg-sky-50 border-sky-200 hover:border-sky-400 hover:bg-sky-100",      iconColor: "text-sky-600"  },
  { href: "/bulk-submit",  label: "Bulk Submit",  icon: Send,       color: "bg-violet-50 border-violet-200 hover:border-violet-400 hover:bg-violet-100", iconColor: "text-violet-600" },
  { href: "/auto-apply",   label: "Auto Apply",   icon: Bot,        color: "bg-orange-50 border-orange-200 hover:border-orange-400 hover:bg-orange-100", iconColor: "text-orange-600" },
  { href: "/id-cards",     label: "ID Cards",     icon: CreditCard, color: "bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100",   iconColor: "text-pink-600"  },
  { href: "/certificates", label: "Certificates", icon: Star,       color: "bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100", iconColor: "text-amber-600" },
];

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
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const standardList = (stats?.byStandard || []).slice().sort((a, b) => {
    const n = Number(a.standard) - Number(b.standard);
    return isNaN(n) ? 0 : n;
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
        }}>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute right-24 bottom-0 h-32 w-32 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                <span className="pulse-dot" /> Live Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-blue-200 mt-1">{t("dashboard.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-blue-300">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{stats?.completionRate || 0}%</p>
            </div>
            {/* Circular progress */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,.15)" strokeWidth="6" fill="none" />
                <circle
                  cx="32" cy="32" r="26"
                  stroke="white" strokeWidth="6" fill="none"
                  strokeDasharray={`${(stats?.completionRate || 0) * 1.634} 163.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {stats?.completionRate || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("dashboard.totalStudents")}
          value={(stats?.total || 0).toLocaleString("en-IN")}
          icon={<Users className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-blue-600 to-blue-700"
        />
        <StatCard
          label={t("dashboard.readyToSubmit")}
          value={(stats?.byStatus?.ready || 0).toLocaleString("en-IN")}
          icon={<FileCheck className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-600 to-emerald-700"
        />
        <StatCard
          label={t("dashboard.submitted")}
          value={(stats?.byStatus?.submitted || 0).toLocaleString("en-IN")}
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-violet-700"
        />
        <StatCard
          label={t("dashboard.incomplete")}
          value={(stats?.byStatus?.draft || 0).toLocaleString("en-IN")}
          icon={<AlertCircle className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      {/* ── Category panel ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle>Category-wise Scholarship Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CategoryDashboardPanel />
        </CardContent>
      </Card>

      {/* ── Quick Actions + Charts ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <CardTitle>{t("dashboard.quickActions")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const stat = action.statKey
                    ? (stats as unknown as Record<string, unknown>)?.[action.statKey] as number | undefined
                    : undefined;
                  return (
                    <Link key={action.href} href={action.href}>
                      <div className={`group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all cursor-pointer text-center ${action.color}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.iconColor} bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{action.label}</p>
                          {stat !== undefined && (
                            <p className={`text-base font-bold mt-0.5 ${action.iconColor}`}>{stat}</p>
                          )}
                        </div>
                        <ArrowRight className={`absolute bottom-2 right-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${action.iconColor}`} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Standard-wise */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle>Standard-wise Students</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {standardList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <GraduationCap className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No class data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {standardList.map((s) => {
                  const pct = stats?.total ? Math.round((s.count / stats.total) * 100) : 0;
                  return (
                    <div key={s.standard}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">Std {s.standard}</span>
                        <span className="font-semibold text-slate-900">{s.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Status breakdown + recent submissions ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-sky-600" />
              </div>
              <CardTitle>Scholarship Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: "draft",     label: "Draft",      color: "bg-slate-400"  },
                { key: "ready",     label: "Ready",      color: "bg-blue-500"   },
                { key: "pending",   label: "Pending",    color: "bg-amber-500"  },
                { key: "submitted", label: "Submitted",  color: "bg-emerald-500"},
                { key: "approved",  label: "Approved",   color: "bg-green-600"  },
                { key: "rejected",  label: "Rejected",   color: "bg-red-500"    },
              ].map(({ key, label, color }) => {
                const count = stats?.byStatus?.[key] || 0;
                const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-sm text-slate-600 w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 w-10 text-right">{count}</span>
                    <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link href="/students">
                <Button variant="outline" size="sm" className="w-full">
                  View All Students <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-violet-600" />
                </div>
                <CardTitle>{t("dashboard.recentSubmissions")}</CardTitle>
              </div>
              <Link href="/bulk-submit">
                <Button variant="ghost" size="sm" className="text-xs">
                  New Batch <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
              <div className="space-y-2">
                {stats.recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {t("dashboard.submissionStudentCount", { count: sub.totalCount })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(sub.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.successCount > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          ✓ {sub.successCount}
                        </span>
                      )}
                      {sub.failedCount > 0 && (
                        <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                          ✗ {sub.failedCount}
                        </span>
                      )}
                      <Badge status={sub.status === "completed" ? "submitted" : "pending"} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <Send className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">{t("dashboard.noSubmissions")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
