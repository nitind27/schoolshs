"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ChevronRight,
  Users,
  Award,
  ClipboardCheck,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";

type ClassRow = {
  id: string;
  name: string;
  standard: string;
  section: string;
  academicYear: string;
  studentCount: number;
  classTeacher?: { firstName: string; lastName: string } | null;
  examId?: string | null;
  isPublished?: boolean;
};

export default function ResultsPage() {
  const t = useT();
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/results/class-overview?academicYear=${academicYear}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .finally(() => setLoading(false));
  }, [academicYear]);

  const grouped = classes.reduce<Record<string, ClassRow[]>>((acc, c) => {
    if (!acc[c.standard]) acc[c.standard] = [];
    acc[c.standard].push(c);
    return acc;
  }, {});

  const tools = [
    {
      href: "/results/term",
      icon: ClipboardCheck,
      title: t("results.hubEnterMarks"),
      desc: t("results.hubEnterMarksDesc"),
      accent: "bg-teal-50 text-teal-700 border-teal-200",
      iconBg: "bg-teal-600",
    },
    {
      href: "/results/marks-sheet",
      icon: FileSpreadsheet,
      title: t("results.hubMarksSheet"),
      desc: t("results.hubMarksSheetDesc"),
      accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("results.hubTitle")}</h1>
          <p className="text-slate-500 mt-0.5">{t("results.hubSubtitle")}</p>
        </div>
        <Select
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
          emptyLabel=""
          className="w-36"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className={`h-full border hover:shadow-md transition-all ${tool.accent}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl ${tool.iconBg} text-white flex items-center justify-center shrink-0`}>
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{tool.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{tool.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 flex items-start gap-2">
        <Printer className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <p>{t("results.hubFlowHint")}</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">{t("results.hubClassesTitle")}</h2>
        {loading ? (
          <div className="flex justify-center h-48 items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>{t("results.noClasses")}</p>
              <Link href="/classes" className="text-blue-600 text-sm mt-2 inline-block">
                {t("classes.addClass")}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.keys(grouped)
              .sort((a, b) => Number(a) - Number(b))
              .map((std) => (
                <div key={std} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    {t("results.classLabel", { standard: std })}
                  </h3>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {grouped[std].map((cls) => (
                      <Link key={cls.id} href={`/results/class/${cls.id}`}>
                        <Card className="hover:border-blue-300 hover:shadow-md transition-all h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-bold text-slate-900">{cls.name}</h4>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {t("results.sectionLabel", { section: cls.section })} · {cls.academicYear}
                                </p>
                                {cls.classTeacher && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Users className="h-4 w-4" />
                                <span>
                                  {cls.studentCount} {t("results.students")}
                                </span>
                              </div>
                              {cls.isPublished ? (
                                <Badge status="approved" />
                              ) : cls.examId ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                  {t("results.inProgress")}
                                </span>
                              ) : (
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                  {t("results.notStarted")}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
