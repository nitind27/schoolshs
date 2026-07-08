"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, Users, Send, ClipboardCheck, Calculator, FileText, RefreshCw, ArrowRight, Clock3 } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function ClerkDashboard() {
  const t = useT();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load dashboard");
        setStats(data);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatCount = (value: unknown) => Number(value || 0).toLocaleString("en-IN");
  const byStatus = (stats?.byStatus as Record<string, number> | undefined) || {};
  const recentSubmissions =
    (stats?.recentSubmissions as { id: string; createdAt: string; totalCount: number; successCount: number; failedCount: number; status: string }[] | undefined) || [];

  const cards = [
    { href: "/clerk/scholarship", icon: FileCheck, label: t("clerkNav.scholarship"), desc: t("clerkPortal.scholarshipSubtitle"), color: "text-amber-600", border: "hover:border-amber-300 hover:bg-amber-50/60" },
    { href: "/admissions", icon: ClipboardCheck, label: t("clerkNav.admissionVerify"), desc: t("admissions.subtitle"), color: "text-blue-600", border: "hover:border-blue-300 hover:bg-blue-50/60" },
    { href: "/students", icon: Users, label: t("clerkNav.allStudents"), desc: `${formatCount(stats?.total)} ${t("students.totalCount", { count: Number(stats?.total || 0) }).replace(/^\d+\s*/, "")}`, color: "text-emerald-600", border: "hover:border-emerald-300 hover:bg-emerald-50/60" },
    { href: "/bulk-submit", icon: Send, label: t("clerkNav.bulkSubmit"), desc: t("bulkSubmitPage.subtitle"), color: "text-green-600", border: "hover:border-green-300 hover:bg-green-50/60" },
    { href: "/accounting", icon: Calculator, label: t("clerkNav.accounting"), desc: t("accounting.subtitle", { year: "2025-26" }), color: "text-indigo-600", border: "hover:border-indigo-300 hover:bg-indigo-50/60" },
    { href: "/certificates", icon: FileText, label: t("clerkNav.certificates"), desc: t("certificates.subtitle"), color: "text-rose-600", border: "hover:border-rose-300 hover:bg-rose-50/60" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-white via-amber-50/60 to-orange-50/70 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("clerkPortal.dashboardTitle")}</h1>
            <p className="text-slate-600 mt-1">{t("clerkPortal.dashboardSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              <RefreshCw className="h-3 w-3" /> Live
            </span>
            <span className="text-xs text-slate-500">Updated: {new Date().toLocaleTimeString("en-IN")}</span>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">{t("clerkPortal.totalStudents")}</p><p className="text-3xl font-bold">{formatCount(stats?.total)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">{t("clerkPortal.readyToSubmit")}</p><p className="text-3xl font-bold text-emerald-600">{formatCount(byStatus.ready)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">{t("clerkPortal.submitted")}</p><p className="text-3xl font-bold text-blue-600">{formatCount(byStatus.submitted)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">{t("status.pending")}</p><p className="text-3xl font-bold text-amber-600">{formatCount(byStatus.pending)}</p></CardContent></Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className={`transition-all h-full ${c.border}`}>
              <CardContent className="p-5">
                <c.icon className={`h-10 w-10 ${c.color} mb-3`} />
                <h3 className="font-semibold">{c.label}</h3>
                <p className="text-sm text-slate-500">{c.desc}</p>
                <ArrowRight className="h-4 w-4 text-slate-400 mt-3" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-600" />
            {t("dashboard.recentSubmissions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500">{t("dashboard.noSubmissions")}</p>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{t("dashboard.submissionStudentCount", { count: sub.totalCount })}</p>
                    <p className="text-xs text-slate-500">{new Date(sub.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-700">{t("dashboard.successCount", { count: sub.successCount })}</p>
                    {sub.failedCount > 0 && <p className="text-xs text-red-600">{t("dashboard.failedCount", { count: sub.failedCount })}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
