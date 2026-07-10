"use client";

import { useEffect, useState, Suspense, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Printer, Trophy } from "lucide-react";
import { SCHOOL_STANDARDS, FINANCIAL_YEARS } from "@/lib/constants";
import { ANNUAL_RESULT_SUBJECTS } from "@/lib/results/config";
import { useT } from "@/i18n/locale-provider";

type Subject = { id: string; name: string; maxMarks: number };
type Student = { id: string; rollNumber?: string; firstName: string; surname: string; section?: string };
type MarkKey = string;

function ResultsEntryInner() {
  const t = useT();
  const params = useSearchParams();
  const examId = params.get("examId");
  const [exam, setExam] = useState<Record<string, unknown> | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<MarkKey, number>>({});
  const [achievement, setAchievement] = useState<Record<MarkKey, number>>({});
  const [grace, setGrace] = useState<Record<MarkKey, number>>({});
  const [meta, setMeta] = useState<Record<string, { passNumber?: string; attendancePresent?: number; attendanceTotal?: number }>>({});
  const [reportCards, setReportCards] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({
    academicYear: "2025-26",
    standard: "10",
    section: "",
    reopeningDate: "",
  });

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/results?examId=${examId}`)
      .then((r) => r.json())
      .then((d) => {
        setExam(d.exam);
        setStudents(d.students || []);
        setReportCards(d.reportCards || []);
        if (d.exam?.reopeningDate) setForm((f) => ({ ...f, reopeningDate: d.exam.reopeningDate as string }));
        const m: Record<MarkKey, number> = {};
        const a: Record<MarkKey, number> = {};
        const g: Record<MarkKey, number> = {};
        for (const r of d.exam?.results || []) {
          const key = `${r.studentId}-${r.subjectId}`;
          m[key] = r.marksObtained;
          a[key] = r.achievementMarks || 0;
          g[key] = r.graceMarks || 0;
        }
        setMarks(m);
        setAchievement(a);
        setGrace(g);
        const metaMap: typeof meta = {};
        for (const rc of d.reportCards || []) {
          metaMap[rc.studentId as string] = {
            passNumber: rc.passNumber as string,
            attendancePresent: rc.attendancePresent as number,
            attendanceTotal: rc.attendanceTotal as number,
          };
        }
        setMeta(metaMap);
      });
  }, [examId]);

  const createSession = async () => {
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_session", ...form }),
    });
    const data = await res.json();
    if (res.ok) window.location.href = `/results/entry?examId=${data.id}`;
    else alert(data.error || "Failed");
  };

  const saveAll = async () => {
    if (!exam) return;
    const subjects = (exam.subjects as Subject[]) || [];
    const payload = [];
    for (const st of students) {
      for (const sub of subjects) {
        const key = `${st.id}-${sub.id}`;
        if (marks[key] !== undefined || achievement[key] || grace[key]) {
          payload.push({
            studentId: st.id,
            subjectId: sub.id,
            marksObtained: marks[key] ?? 0,
            achievementMarks: achievement[key] ?? 0,
            graceMarks: grace[key] ?? 0,
            maxMarks: sub.maxMarks,
          });
        }
      }
    }
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_marks", examId: exam.id, marks: payload }),
    });
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_meta",
        examId: exam.id,
        reopeningDate: form.reopeningDate,
        meta: students.map((st) => ({
          studentId: st.id,
          section: st.section,
          ...meta[st.id],
        })),
      }),
    });
    alert(t("results.marksSaved"));
    window.location.reload();
  };

  const publish = async () => {
    await saveAll();
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", examId: exam?.id }),
    });
    alert(t("results.publishedMsg"));
    window.location.reload();
  };

  if (!examId) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link href="/results"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <Card>
          <CardHeader>
            <CardTitle>{t("results.createSession")}</CardTitle>
            <p className="text-sm text-slate-500">{t("results.formatNote")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
              emptyLabel=""
            />
            <Select
              value={form.standard}
              onChange={(e) => setForm({ ...form, standard: e.target.value })}
              options={SCHOOL_STANDARDS.map((s) => ({ value: s, label: t("results.classLabel", { standard: s }) }))}
              emptyLabel=""
            />
            <Input placeholder={t("results.section")} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            <Input type="date" label={t("results.reopeningDate")} value={form.reopeningDate} onChange={(e) => setForm({ ...form, reopeningDate: e.target.value })} />
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-medium mb-2">{t("results.fixedSubjects")}</p>
              <ul className="grid grid-cols-2 gap-1 text-slate-600">
                {ANNUAL_RESULT_SUBJECTS.map((s) => (
                  <li key={s.nameEn}>{s.name} — {s.maxMarks}</li>
                ))}
              </ul>
            </div>
            <Button onClick={createSession} className="w-full">{t("results.startMarksEntry")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjects = (exam?.subjects as Subject[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Link href="/results"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{exam?.name as string}</h1>
            <p className="text-slate-500">{t("results.marksEntry")} — {t("results.classLabel", { standard: exam?.standard as string })}{exam?.section ? ` (${exam.section})` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-40" type="date" value={form.reopeningDate} onChange={(e) => setForm({ ...form, reopeningDate: e.target.value })} placeholder={t("results.reopeningDate")} />
          <Button variant="outline" onClick={saveAll}><Save className="h-4 w-4" /> {t("results.save")}</Button>
          <Button onClick={publish}><Send className="h-4 w-4" /> {t("results.publish")}</Button>
          {Boolean(exam?.isPublished) && (
            <Link href={`/results/print?examId=${exam?.id}`}><Button variant="outline"><Printer className="h-4 w-4" /> {t("results.print")}</Button></Link>
          )}
        </div>
      </div>

      {reportCards.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-amber-500" />{t("results.meritList")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-left">
                  <th className="p-3">{t("results.rank")}</th>
                  <th className="p-3">{t("results.student")}</th>
                  <th className="p-3 text-right">{t("results.total")}</th>
                  <th className="p-3 text-right">%</th>
                  <th className="p-3">{t("results.grade")}</th>
                  <th className="p-3">{t("results.resultStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {[...reportCards].sort((a, b) => ((a.rank as number) || 999) - ((b.rank as number) || 999)).map((rc) => {
                  const st = rc.student as Student;
                  return (
                    <tr key={rc.id as string} className="border-b">
                      <td className="p-3 font-bold text-amber-600">#{rc.rank as number}</td>
                      <td className="p-3">{st?.firstName} {st?.surname}</td>
                      <td className="p-3 text-right font-semibold">{rc.totalMarks as number}</td>
                      <td className="p-3 text-right">{(rc.percentage as number)?.toFixed(1)}%</td>
                      <td className="p-3">{rc.grade as string}</td>
                      <td className="p-3 text-sm">{rc.result as string}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="p-2 text-left sticky left-0 bg-slate-50 z-10">{t("results.roll")}</th>
                <th className="p-2 text-left sticky left-10 bg-slate-50 z-10 min-w-[120px]">{t("results.student")}</th>
                {subjects.map((s) => (
                  <th key={s.id} colSpan={3} className="p-2 text-center border-l min-w-[180px]">{s.name}</th>
                ))}
                <th className="p-2 text-center border-l" colSpan={3}>{t("results.attendance")}</th>
              </tr>
              <tr className="bg-slate-50 border-b text-xs text-slate-500">
                <th className="sticky left-0 bg-slate-50" colSpan={2} />
                {subjects.map((s) => (
                  <Fragment key={s.id}>
                    <th className="p-1 border-l">{t("results.obtained")}</th>
                    <th className="p-1">{t("results.achievement")}</th>
                    <th className="p-1">{t("results.grace")}</th>
                  </Fragment>
                ))}
                <th className="p-1 border-l">{t("results.present")}</th>
                <th className="p-1">{t("results.totalDays")}</th>
                <th className="p-1">{t("results.passNo")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id} className="border-b hover:bg-slate-50/50">
                  <td className="p-2 sticky left-0 bg-white">{st.rollNumber || "—"}</td>
                  <td className="p-2 sticky left-10 bg-white font-medium whitespace-nowrap">{st.firstName} {st.surname}</td>
                  {subjects.map((sub) => (
                    <Fragment key={sub.id}>
                      <td className="p-1 border-l">
                        <Input type="number" min={0} max={sub.maxMarks} className="w-14 text-center h-8 text-xs" value={marks[`${st.id}-${sub.id}`] ?? ""} onChange={(e) => setMarks({ ...marks, [`${st.id}-${sub.id}`]: Number(e.target.value) })} />
                      </td>
                      <td className="p-1">
                        <Input type="number" min={0} className="w-12 text-center h-8 text-xs" value={achievement[`${st.id}-${sub.id}`] ?? ""} onChange={(e) => setAchievement({ ...achievement, [`${st.id}-${sub.id}`]: Number(e.target.value) })} />
                      </td>
                      <td className="p-1">
                        <Input type="number" min={0} className="w-12 text-center h-8 text-xs" value={grace[`${st.id}-${sub.id}`] ?? ""} onChange={(e) => setGrace({ ...grace, [`${st.id}-${sub.id}`]: Number(e.target.value) })} />
                      </td>
                    </Fragment>
                  ))}
                  <td className="p-1 border-l">
                    <Input type="number" className="w-14 text-center h-8 text-xs" value={meta[st.id]?.attendancePresent ?? ""} onChange={(e) => setMeta({ ...meta, [st.id]: { ...meta[st.id], attendancePresent: Number(e.target.value) } })} />
                  </td>
                  <td className="p-1">
                    <Input type="number" className="w-14 text-center h-8 text-xs" value={meta[st.id]?.attendanceTotal ?? ""} onChange={(e) => setMeta({ ...meta, [st.id]: { ...meta[st.id], attendanceTotal: Number(e.target.value) } })} />
                  </td>
                  <td className="p-1">
                    <Input className="w-16 text-center h-8 text-xs" value={meta[st.id]?.passNumber ?? ""} onChange={(e) => setMeta({ ...meta, [st.id]: { ...meta[st.id], passNumber: e.target.value } })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResultsEntryPage() {
  const t = useT();
  return (
    <Suspense fallback={<div>{t("common.loading")}</div>}>
      <ResultsEntryInner />
    </Suspense>
  );
}
