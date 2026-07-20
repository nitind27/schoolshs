"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { FINANCIAL_YEARS } from "@/lib/constants";
import type { ExamTermKey } from "@/lib/results/exam-terms";
import { cn } from "@/lib/utils";

type SubjectMark = {
  subjectCode: string;
  subjectName: string;
  subjectType: "numeric" | "grade";
  examSubjectId: string | null;
  termValue: number | null;
  internalValue?: number | null;
  letterGrade?: string | null;
};

type StudentRow = {
  studentId: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  rollNumber?: string | null;
  subjectMarks: SubjectMark[];
};

const GRADE_OPTIONS = ["A", "B", "C", "D", "E", ""];

export default function TermMarksPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId") || "";
  const termParam = (searchParams.get("term") || "mid1") as ExamTermKey;

  const [classes, setClasses] = useState<Array<{ id: string; name: string; standard: string; section: string }>>([]);
  const [classId, setClassId] = useState(classIdParam);
  const [term, setTerm] = useState<ExamTermKey>(termParam);
  const [data, setData] = useState<{
    class: { id: string; name: string; standard: string; section: string };
    exam: { id: string };
    term: { key: ExamTermKey; labelEn: string; maxMarks: number; internalMax?: number; published: boolean; locked: boolean };
    termMeta: { midExamCount: 1 | 2 };
    students: StudentRow[];
    completion: { percent: number; complete: number; total: number };
    editable: boolean;
  } | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/classes?academicYear=2025-26")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, []);

  const load = useCallback(() => {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    fetch(`/api/results/term-marks?classId=${classId}&term=${term}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMessage({ type: "err", text: d.error });
          setData(null);
          return;
        }
        setData(d);
        setRows(JSON.parse(JSON.stringify(d.students)));
      })
      .catch(() => setMessage({ type: "err", text: t("examTerms.loadError") }))
      .finally(() => setLoading(false));
  }, [classId, term, t]);

  useEffect(() => {
    if (classId) load();
  }, [classId, term, load]);

  useEffect(() => {
    if (classIdParam) setClassId(classIdParam);
    if (termParam) setTerm(termParam);
  }, [classIdParam, termParam]);

  const numericSubjects = useMemo(() => {
    if (!rows.length) return [];
    return rows[0].subjectMarks.filter((s) => s.subjectType === "numeric");
  }, [rows]);

  const updateCell = (studentIdx: number, subjectCode: string, field: "termValue" | "internalValue", value: string) => {
    setRows((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentRow[];
      const sub = next[studentIdx].subjectMarks.find((s) => s.subjectCode === subjectCode);
      if (!sub) return prev;
      const num = value === "" ? null : Number(value);
      sub[field] = num;
      return next;
    });
  };

  const updateGrade = (studentIdx: number, subjectCode: string, value: string) => {
    setRows((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentRow[];
      const sub = next[studentIdx].subjectMarks.find((s) => s.subjectCode === subjectCode);
      if (sub) sub.letterGrade = value || null;
      return next;
    });
  };

  const save = async () => {
    if (!data?.exam?.id || !classId) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/results/term-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_marks",
        examId: data.exam.id,
        classId,
        term,
        students: rows.map((st) => ({
          studentId: st.studentId,
          subjectMarks: st.subjectMarks,
        })),
      }),
    });
    const payload = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "err", text: payload.error || t("examTerms.saveFailed") });
      return;
    }
    setMessage({ type: "ok", text: t("examTerms.saved") });
    load();
  };

  const termOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "mid1", label: t("examTerms.mid1") },
    ];
    if (data?.termMeta?.midExamCount === 2 || !data) {
      opts.push({ value: "mid2", label: t("examTerms.mid2") });
    }
    opts.push({ value: "final", label: t("examTerms.final") });
    return opts;
  }, [data, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={classId ? `/results/class/${classId}` : "/results"}>
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("examTerms.marksEntryTitle")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("examTerms.marksEntrySubtitle")}</p>
          </div>
        </div>
        {data?.editable && (
          <Button onClick={save} disabled={saving} size="lg" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t("results.save") + "..." : t("results.save")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px] flex-1">
            <Select
              label={t("examTerms.selectClass")}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.section})` }))}
            />
          </div>
          <div className="min-w-[160px]">
            <Select
              label={t("examTerms.selectExam")}
              value={term}
              onChange={(e) => setTerm(e.target.value as ExamTermKey)}
              options={termOptions}
              emptyLabel=""
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg p-3 text-sm",
          message.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        )}>
          {message.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {data?.term?.published && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {t("examTerms.publishedReadonly")}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !classId ? (
        <Card><CardContent className="p-12 text-center text-slate-500">{t("examTerms.selectClassFirst")}</CardContent></Card>
      ) : data && rows.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-slate-100 px-3 py-1 rounded-full">{data.class.name}</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{data.term.labelEn}</span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {data.completion.complete}/{data.completion.total} {t("examTerms.complete")}
            </span>
            {term === "final" && data.term.internalMax && (
              <span className="text-slate-500">{t("examTerms.finalHint", { annual: data.term.maxMarks, internal: data.term.internalMax })}</span>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("examTerms.gridTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2 text-left sticky left-0 bg-slate-50 z-10 min-w-[48px]">#</th>
                      <th className="p-2 text-left sticky left-12 bg-slate-50 z-10 min-w-[56px]">{t("results.roll")}</th>
                      <th className="p-2 text-left sticky left-[104px] bg-slate-50 z-10 min-w-[140px]">{t("results.student")}</th>
                      {numericSubjects.map((s) => (
                        <th key={s.subjectCode} className="p-2 text-center min-w-[72px] text-xs font-medium text-slate-600">
                          <div>{s.subjectName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            /{term === "final" ? data.term.maxMarks : data.term.maxMarks}
                          </div>
                          {term === "final" && (
                            <div className="text-[10px] text-violet-500">+{t("examTerms.internal")}</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((st, i) => (
                      <tr key={st.studentId} className="border-b hover:bg-blue-50/30">
                        <td className="p-2 sticky left-0 bg-white text-slate-400">{i + 1}</td>
                        <td className="p-2 sticky left-12 bg-white font-mono text-xs">{st.rollNumber || "—"}</td>
                        <td className="p-2 sticky left-[104px] bg-white font-medium whitespace-nowrap">
                          {st.firstName} {st.surname}
                        </td>
                        {st.subjectMarks.filter((s) => s.subjectType === "numeric").map((sub) => (
                          <td key={sub.subjectCode} className="p-1 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <input
                                type="number"
                                min={0}
                                max={data.term.maxMarks}
                                step={0.5}
                                disabled={!data.editable}
                                value={sub.termValue ?? ""}
                                onChange={(e) => updateCell(i, sub.subjectCode, "termValue", e.target.value)}
                                className="w-16 h-8 text-center text-sm border border-slate-200 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50"
                              />
                              {term === "final" && (
                                <input
                                  type="number"
                                  min={0}
                                  max={data.term.internalMax ?? 20}
                                  step={0.5}
                                  disabled={!data.editable}
                                  value={sub.internalValue ?? ""}
                                  onChange={(e) => updateCell(i, sub.subjectCode, "internalValue", e.target.value)}
                                  className="w-16 h-7 text-center text-xs border border-violet-200 rounded-md focus:border-violet-400 disabled:bg-slate-50"
                                  placeholder={t("examTerms.internal")}
                                />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : data ? (
        <Card><CardContent className="p-12 text-center text-slate-500">{t("results.noStudentsInClass")}</CardContent></Card>
      ) : null}
    </div>
  );
}
