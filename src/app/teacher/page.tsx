"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Award, FileText, ArrowRight, ClipboardList } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function TeacherDashboard() {
  const t = useT();
  const [data, setData] = useState<{ classes: { id: string; name: string; standard: string; section: string; students: unknown[] }[]; stats: { totalStudents: number; totalClasses: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher")
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) throw new Error(payload?.error || "Failed to load dashboard");
        setData(payload);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load dashboard"));
  }, []);

  if (!data && !error) {
    return (
      <div className="flex justify-center h-64 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-white via-emerald-50/60 to-blue-50/60 p-5">
        <h1 className="text-2xl font-bold text-slate-900">{t("teacherPortal.dashboardTitle")}</h1>
        <p className="text-slate-600">{t("teacherPortal.dashboardSubtitle")}</p>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><BookOpen className="h-8 w-8 text-emerald-600 mb-2" /><p className="text-sm text-slate-500">{t("teacherPortal.myClasses")}</p><p className="text-3xl font-bold">{(data?.stats.totalClasses || 0).toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-6"><Users className="h-8 w-8 text-blue-600 mb-2" /><p className="text-sm text-slate-500">{t("teacherPortal.totalStudents")}</p><p className="text-3xl font-bold">{(data?.stats.totalStudents || 0).toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-6"><ClipboardList className="h-8 w-8 text-purple-600 mb-2" /><p className="text-sm text-slate-500">{t("teacherPortal.studentsEnrolled", { count: 0 }).replace(/^0\s*/, "")}</p><p className="text-3xl font-bold text-purple-700">{Math.round(((data?.stats.totalStudents || 0) / Math.max(data?.stats.totalClasses || 1, 1))).toLocaleString("en-IN")}</p><p className="text-xs text-slate-500 mt-1">Avg / class</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("teacherPortal.myClasses")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.classes?.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.classes.map((cls) => (
                <Link key={cls.id} href={`/classes/${cls.id}`}>
                  <div className="rounded-xl border border-slate-200 p-5 transition-all hover:border-emerald-300 hover:bg-emerald-50/60">
                    <h3 className="font-semibold text-lg text-slate-900">{cls.name}</h3>
                    <p className="text-slate-600">{t("results.classLabel", { standard: cls.standard })}-{cls.section}</p>
                    <p className="text-sm text-slate-500 mt-2">{t("teacherPortal.studentsEnrolled", { count: cls.students.length })}</p>
                    <ArrowRight className="h-4 w-4 text-emerald-600 mt-3" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No classes assigned yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/results"><Card className="hover:border-blue-300"><CardContent className="p-6 flex items-center gap-4"><Award className="h-10 w-10 text-blue-600" /><div><h3 className="font-semibold">{t("teacherNav.results")}</h3><p className="text-sm text-slate-500">{t("teacherPortal.enterPublishMarks")}</p></div></CardContent></Card></Link>
        <Link href="/teacher/board-records"><Card className="hover:border-purple-300"><CardContent className="p-6 flex items-center gap-4"><FileText className="h-10 w-10 text-purple-600" /><div><h3 className="font-semibold">{t("teacherNav.boardRecords")}</h3><p className="text-sm text-slate-500">{t("teacherPortal.boardRecordsDesc")}</p></div></CardContent></Card></Link>
      </div>
    </div>
  );
}
