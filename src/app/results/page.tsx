"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Users, Award } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("results.title")}</h1>
          <p className="text-slate-500">{t("results.classWiseSubtitle")}</p>
        </div>
        <Select
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
          emptyLabel=""
          className="w-36"
        />
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>{t("results.noClasses")}</p>
            <Link href="/classes/new" className="text-blue-600 text-sm mt-2 inline-block">{t("classes.addClass")}</Link>
          </CardContent>
        </Card>
      ) : (
        Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((std) => (
          <div key={std} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              {t("results.classLabel", { standard: std })}
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {grouped[std].map((cls) => (
                <Link key={cls.id} href={`/results/class/${cls.id}`}>
                  <Card className="hover:border-blue-300 hover:shadow-md transition-all h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{cls.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {t("results.sectionLabel", { section: cls.section })} • {cls.academicYear}
                          </p>
                          {cls.classTeacher && (
                            <p className="text-xs text-slate-400 mt-1">
                              {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="h-4 w-4" />
                          <span>{cls.studentCount} {t("results.students")}</span>
                        </div>
                        {cls.isPublished ? (
                          <Badge status="approved" />
                        ) : cls.examId ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{t("results.inProgress")}</span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{t("results.notStarted")}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
