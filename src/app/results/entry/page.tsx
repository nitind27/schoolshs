"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save, Send } from "lucide-react";
import { SCHOOL_STANDARDS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";

function ResultsEntryInner() {
  const t = useT();
  const params = useSearchParams();
  const examId = params.get("examId");
  const [mode, setMode] = useState(examId ? "marks" : "create");
  const [exam, setExam] = useState<Record<string, unknown> | null>(null);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", examType: "Unit Test", standard: "10", term: "Term 1", subjects: "Gujarati,English,Maths,Science,Social Science" });

  useEffect(() => {
    if (examId) {
      fetch(`/api/results?examId=${examId}`).then((r) => r.json()).then((d) => {
        setExam(d.exam);
        const studentMap = new Map<string, Record<string, unknown>>();
        for (const r of d.exam?.results || []) {
          if (!studentMap.has(r.studentId)) studentMap.set(r.studentId, r.student);
        }
        setStudents([...studentMap.values()]);
        const m: Record<string, number> = {};
        for (const r of d.exam?.results || []) m[`${r.studentId}-${r.subjectId}`] = r.marksObtained;
        setMarks(m);
      });
      fetch(`/api/students?standard=${form.standard}`).then((r) => r.json()).then((d) => {
        if (d.students?.length) setStudents(d.students);
      });
    }
  }, [examId, form.standard]);

  const createExam = async () => {
    const res = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_exam",
        ...form,
        subjects: form.subjects.split(",").map((s) => ({ name: s.trim() })),
      }),
    });
    const data = await res.json();
    if (res.ok) window.location.href = `/results/entry?examId=${data.id}`;
  };

  const saveMarks = async () => {
    if (!exam) return;
    const subjects = (exam.subjects as { id: string }[]) || [];
    const payload = [];
    for (const st of students) {
      for (const sub of subjects) {
        const key = `${st.id}-${sub.id}`;
        if (marks[key] !== undefined) {
          payload.push({ studentId: st.id, subjectId: sub.id, marksObtained: marks[key], maxMarks: 100 });
        }
      }
    }
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_marks", examId: exam.id, marks: payload }),
    });
    alert(t("results.marksSaved"));
  };

  const publish = async () => {
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", examId: exam?.id }),
    });
    alert(t("results.publishedMsg"));
  };

  if (mode === "create" && !examId) {
    return (
      <div className="space-y-6 max-w-xl">
        <Link href="/results"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <Card>
          <CardHeader><CardTitle>{t("results.createNewExam")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder={t("results.examName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select
              value={form.standard}
              onChange={(e) => setForm({ ...form, standard: e.target.value })}
              options={SCHOOL_STANDARDS.map((s) => ({ value: s, label: t("results.classLabel", { standard: s }) }))}
              emptyLabel=""
            />
            <Input placeholder={t("results.subjectsComma")} value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
            <Button onClick={createExam} className="w-full">{t("results.createExam")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjects = (exam?.subjects as { id: string; name: string }[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/results"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{exam?.name as string}</h1>
            <p className="text-slate-500">{t("results.marksEntry")} — {t("results.classLabel", { standard: exam?.standard as string })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveMarks}><Save className="h-4 w-4" /> {t("results.save")}</Button>
          <Button onClick={publish}><Send className="h-4 w-4" /> {t("results.publish")}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="p-3 text-left sticky left-0 bg-slate-50">{t("results.roll")}</th>
                <th className="p-3 text-left sticky left-12 bg-slate-50">{t("results.student")}</th>
                {subjects.map((s) => <th key={s.id} className="p-3 text-center min-w-[80px]">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id as string} className="border-b">
                  <td className="p-3 sticky left-0 bg-white">{st.rollNumber as string || "—"}</td>
                  <td className="p-3 sticky left-12 bg-white font-medium">{st.firstName as string} {st.surname as string}</td>
                  {subjects.map((sub) => (
                    <td key={sub.id} className="p-2">
                      <Input
                        type="number"
                        className="w-20 text-center"
                        value={marks[`${st.id}-${sub.id}`] ?? ""}
                        onChange={(e) => setMarks({ ...marks, [`${st.id}-${sub.id}`]: Number(e.target.value) })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultsEntryLoading() {
  const t = useT();
  return <div>{t("common.loading")}</div>;
}

export default function ResultsEntryPage() {
  return <Suspense fallback={<ResultsEntryLoading />}><ResultsEntryInner /></Suspense>;
}
