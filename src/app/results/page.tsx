"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, FileText } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function ResultsPage() {
  const t = useT();
  const [exams, setExams] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch("/api/results").then((r) => r.json()).then((d) => setExams(d.exams || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("results.title")}</h1>
          <p className="text-slate-500">{t("results.subtitle")}</p>
        </div>
        <Link href="/results/entry"><Button><Plus className="h-4 w-4" /> {t("results.createExam")}</Button></Link>
      </div>

      <div className="grid gap-4">
        {exams.map((exam) => (
          <Card key={exam.id as string}>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Award className="h-10 w-10 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">{exam.name as string}</h3>
                  <p className="text-sm text-slate-500">{t("results.classLabel", { standard: exam.standard as string })} • {exam.examType as string} • {exam.academicYear as string}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={exam.isPublished ? "approved" : "pending"} />
                <span className="text-sm text-slate-500">{(exam._count as { results: number })?.results || 0} {t("results.entries")}</span>
                <Link href={`/results/entry?examId=${exam.id}`}><Button variant="outline" size="sm"><FileText className="h-4 w-4" /> {t("results.marks")}</Button></Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {!exams.length && (
          <Card><CardContent className="p-12 text-center text-slate-500">{t("results.noExams")}</CardContent></Card>
        )}
      </div>
    </div>
  );
}
