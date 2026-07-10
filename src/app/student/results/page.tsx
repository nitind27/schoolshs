"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Printer } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentResultsPage() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/student-portal").then((r) => r.json()).then((d) => setStudent(d.student));
  }, []);

  const reportCards = (student?.reportCards as Record<string, unknown>[]) || [];
  const examResults = (student?.examResults as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("studentPortal.myResults")}</h1>

      {reportCards.length > 0 ? (
        <div className="grid gap-4">
          {reportCards.map((rc) => (
            <Card key={rc.id as string}>
              <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Award className="h-10 w-10 text-sky-600" />
                  <div>
                    <h3 className="font-semibold">{t("results.reportCardClass", { standard: rc.standard as string, year: rc.academicYear as string })}</h3>
                    <p className="text-sm text-slate-500">
                      {t("results.totalMarks", {
                        total: rc.totalMarks as number,
                        percent: (rc.percentage as number)?.toFixed?.(1) ?? rc.percentage,
                        grade: rc.grade as string,
                        rank: rc.rank as number,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {rc.rank != null && Number(rc.rank) > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500">{t("results.rank")}</p>
                      <p className="text-2xl font-bold text-amber-600">#{rc.rank as number}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <Badge status={String(rc.result).includes("નાપાસ") || rc.result === "Fail" ? "rejected" : "approved"} />
                    <p className="text-2xl font-bold mt-1">{(rc.percentage as number)?.toFixed?.(1) ?? rc.percentage}%</p>
                  </div>
                  {rc.examId != null && (
                    <Link href={`/student/results/print?examId=${rc.examId as string}`}>
                      <Button size="sm"><Printer className="h-4 w-4" /> {t("results.print")}</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center text-slate-500">{t("results.notPublished")}</CardContent></Card>
      )}

      {examResults.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("studentPortal.subjectWiseMarks")}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-3">{t("results.exam")}</th>
                  <th className="p-3">{t("results.subject")}</th>
                  <th className="p-3 text-right">{t("results.obtained")}</th>
                  <th className="p-3 text-right">{t("results.achievement")}</th>
                  <th className="p-3 text-right">{t("results.grace")}</th>
                  <th className="p-3">{t("results.grade")}</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((r) => (
                  <tr key={r.id as string} className="border-b">
                    <td className="p-3">{(r.exam as { name: string })?.name}</td>
                    <td className="p-3">{(r.subject as { name: string })?.name}</td>
                    <td className="p-3 text-right font-semibold">{r.marksObtained as number}</td>
                    <td className="p-3 text-right">{(r.achievementMarks as number) || "—"}</td>
                    <td className="p-3 text-right">{(r.graceMarks as number) || "—"}</td>
                    <td className="p-3">{r.grade as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
