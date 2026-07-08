"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Award, GraduationCap, FileCheck, FileText, CalendarDays, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentDashboard() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student-portal")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load student dashboard");
        setStudent(data.student);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load student dashboard"));
  }, []);

  if (!student && !error) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>;
  if (!student) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Unable to load student data."}</div>;

  const reportCards = (student.reportCards as unknown[]) || [];
  const examResults = (student.examResults as unknown[]) || [];

  const cards = [
    { href: "/student/profile", icon: User, label: t("studentNav.myProfile"), desc: `${student.firstName} ${student.surname}` },
    { href: "/student/results", icon: Award, label: t("studentNav.myResults"), desc: `${reportCards.length.toLocaleString("en-IN")} ${t("results.entries")}` },
    { href: "/student/board", icon: GraduationCap, label: t("studentNav.boardRecords"), desc: `GSEB — ${student.board10th}` },
    { href: "/student/scholarship", icon: FileCheck, label: t("common.scholarship"), desc: student.scholarshipScheme as string },
    { href: "/student/documents", icon: FileText, label: t("studentNav.documents"), desc: t("studentPortal.myDocuments") },
  ];

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-sky-600 to-blue-700 text-white border-0">
        <CardContent className="p-8">
          <p className="text-sky-200 text-sm">{t("studentPortal.welcomeBack")}</p>
          <h1 className="text-3xl font-bold mt-1">{student.firstName as string} {student.surname as string}</h1>
          <p className="text-sky-100 mt-2">{t("studentPortal.classRoll", { standard: student.standard as string, section: student.section as string, roll: (student.rollNumber as string) || "—" })}</p>
          <div className="mt-4 flex gap-3">
            <Badge status={student.status as string} />
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{student.category as string}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("studentNav.myResults")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{reportCards.length.toLocaleString("en-IN")}</p>
            <p className="text-xs text-slate-500 mt-1">Report cards available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("results.entries")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{examResults.length.toLocaleString("en-IN")}</p>
            <p className="text-xs text-slate-500 mt-1">Exam records synced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">{t("common.status")}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 capitalize">{String(student.status || "—")}</p>
            <p className="text-xs text-slate-500 mt-1">{String(student.standard || "—")}-{String(student.section || "—")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="hover:border-sky-300 transition-all h-full">
              <CardContent className="p-6">
                <c.icon className="h-10 w-10 text-sky-600 mb-3" />
                <h3 className="font-semibold">{c.label}</h3>
                <p className="text-sm text-slate-500">{c.desc}</p>
                <ArrowRight className="h-4 w-4 text-slate-400 mt-3" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Last updated</p>
            <p className="font-semibold text-slate-900">
              {student.updatedAt ? new Date(student.updatedAt as string).toLocaleString("en-IN") : "—"}
            </p>
          </div>
          <CalendarDays className="h-8 w-8 text-sky-600" />
        </CardContent>
      </Card>
    </div>
  );
}
