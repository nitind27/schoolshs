"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, FileText } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentBoardPage() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/student-portal").then((r) => r.json()).then((d) => setStudent(d.student));
  }, []);

  if (!student) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("studentPortal.boardRecordsGseb")}</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> {t("boardRecords.board10Title")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.board")}</p><p className="font-semibold">{student.board10th as string}</p></div>
          <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.percentage")}</p><p className="font-semibold text-2xl text-blue-700">{(student.percentage10th as number) > 0 ? `${student.percentage10th}%` : "—"}</p></div>
          <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.year")}</p><p className="font-semibold">{student.year10th as string}</p></div>
          {!!student.marksheet10Path && (
            <a href={student.marksheet10Path as string} target="_blank" className="p-4 bg-blue-50 rounded-lg flex items-center gap-2 text-blue-700"><FileText className="h-5 w-5" /> {t("boardRecords.viewMarksheet")}</a>
          )}
        </CardContent>
      </Card>

      {!!(student.board12th || student.percentage12th) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> {t("boardRecords.board12Title")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.board")}</p><p className="font-semibold">{student.board12th as string || "—"}</p></div>
            <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.percentage")}</p><p className="font-semibold text-2xl text-purple-700">{student.percentage12th ? `${student.percentage12th}%` : "—"}</p></div>
            <div className="p-4 bg-slate-50 rounded-lg"><p className="text-xs text-slate-500">{t("boardRecords.year")}</p><p className="font-semibold">{student.year12th as string || "—"}</p></div>
            {!!student.marksheet12Path && (
              <a href={student.marksheet12Path as string} target="_blank" className="p-4 bg-purple-50 rounded-lg flex items-center gap-2 text-purple-700"><FileText className="h-5 w-5" /> {t("boardRecords.viewMarksheet")}</a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
