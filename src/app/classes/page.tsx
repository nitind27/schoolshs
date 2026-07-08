"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SCHOOL_STANDARDS, FINANCIAL_YEARS } from "@/lib/constants";
import { Plus, Users, BookOpen, ChevronRight } from "lucide-react";
import type { SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";

type ClassWithMeta = SchoolClass & {
  classTeacher?: { firstName: string; lastName: string } | null;
  _count?: { students: number };
};

export default function ClassesPage() {
  const t = useT();
  const [classes, setClasses] = useState<ClassWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [standard, setStandard] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-26");

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ academicYear });
    if (standard) params.set("standard", standard);
    const res = await fetch(`/api/classes?${params}`);
    const data = await res.json();
    setClasses(data.classes || []);
    setLoading(false);
  }, [standard, academicYear]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const grouped = classes.reduce<Record<string, ClassWithMeta[]>>((acc, c) => {
    const key = c.standard;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <PageShell
      title={t("classes.title")}
      subtitle={t("classes.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/" },
        { label: t("nav.classes") },
      ]}
      actions={(
        <Link href="/classes/new">
          <Button><Plus className="h-4 w-4" /> {t("classes.addClass")}</Button>
        </Link>
      )}
    >

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Select
            label={t("classes.academicYear")}
            options={FINANCIAL_YEARS}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-40"
          />
          <Select
            label={t("classes.standardFilter")}
            options={["", ...SCHOOL_STANDARDS]}
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            className="w-40"
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("classes.noClassesHint")}</p>
            <Link href="/classes/new" className="inline-block mt-4">
              <Button>{t("classes.addClass")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        Object.keys(grouped)
          .sort((a, b) => {
            if (a === "Balvatika") return -1;
            if (b === "Balvatika") return 1;
            return parseInt(a, 10) - parseInt(b, 10);
          })
          .map((std) => (
            <div key={std}>
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                  {std === "Balvatika" ? "B" : std}
                </span>
                {std === "Balvatika" ? t("classes.balvatika") : t("classes.classStandard", { standard: std })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[std].map((c) => (
                  <Link key={c.id} href={`/classes/${c.id}`}>
                    <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.academicYear}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-blue-600">
                            <Users className="h-4 w-4" />
                            {t("classes.studentsCount", { count: c._count?.students ?? 0 })}
                          </span>
                          {c.classTeacher && (
                            <span className="text-slate-500 text-xs truncate">
                              {c.classTeacher.firstName} {c.classTeacher.lastName}
                            </span>
                          )}
                        </div>
                        {c.institutionName && (
                          <p className="text-xs text-slate-400 mt-2 truncate">{c.institutionName}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))
      )}
    </PageShell>
  );
}
