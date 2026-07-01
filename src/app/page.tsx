"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Send,
  TrendingUp,
  ArrowRight,
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

export default function DashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statusCards = [
    { key: "total", label: t("dashboard.totalStudents"), value: stats?.total || 0, icon: Users, color: "bg-blue-500" },
    { key: "ready", label: t("dashboard.readyToSubmit"), value: stats?.byStatus?.ready || 0, icon: FileCheck, color: "bg-emerald-500" },
    { key: "submitted", label: t("dashboard.submitted"), value: stats?.byStatus?.submitted || 0, icon: CheckCircle, color: "bg-green-500" },
    { key: "draft", label: t("dashboard.incomplete"), value: stats?.byStatus?.draft || 0, icon: AlertCircle, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-slate-500 mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
        <CardContent className="p-6">
          <CategoryDashboardPanel />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/classes">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                  <Users className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("dashboard.classesWithCount", { count: stats?.totalClasses || 0 })}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.manageClassesRoster")}</p>
                </div>
              </Link>
              <Link href="/staff">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                  <Users className="h-8 w-8 text-indigo-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("dashboard.staffWithCount", { count: stats?.totalStaff || 0 })}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.manageStaff")}</p>
                </div>
              </Link>
              <Link href="/id-cards">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-pink-300 hover:bg-pink-50 transition-all cursor-pointer group">
                  <CheckCircle className="h-8 w-8 text-pink-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("nav.idCards")}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.idCardsDesc")}</p>
                </div>
              </Link>
              <Link href="/import">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                  <Upload className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("nav.bulkImport")}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.importDesc")}</p>
                  <ArrowRight className="h-4 w-4 text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <Link href="/bulk-submit">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:bg-emerald-50 transition-all cursor-pointer group">
                  <Send className="h-8 w-8 text-emerald-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("nav.bulkSubmit")}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.bulkSubmitDesc")}</p>
                  <ArrowRight className="h-4 w-4 text-emerald-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <Link href="/students/new">
                <div className="border border-slate-200 rounded-xl p-5 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer group">
                  <Users className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-slate-900">{t("nav.addStudent")}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t("dashboard.addStudentDesc")}</p>
                  <ArrowRight className="h-4 w-4 text-purple-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.completionRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <circle
                    cx="64" cy="64" r="56"
                    stroke="#2563eb" strokeWidth="12" fill="none"
                    strokeDasharray={`${(stats?.completionRate || 0) * 3.52} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-slate-900">
                  {stats?.completionRate || 0}%
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-4">
                {t("dashboard.studentsReady", { count: stats?.byStatus?.ready || 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("dashboard.recentSubmissions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t("dashboard.submissionStudentCount", { count: sub.totalCount })}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(sub.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 font-medium">{t("dashboard.successCount", { count: sub.successCount })}</span>
                      {sub.failedCount > 0 && (
                        <span className="text-xs text-red-600 font-medium">{t("dashboard.failedCount", { count: sub.failedCount })}</span>
                      )}
                      <Badge status={sub.status === "completed" ? "submitted" : "pending"} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">{t("dashboard.noSubmissions")}</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
