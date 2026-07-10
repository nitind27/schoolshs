"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Printer, Award, User } from "lucide-react";
import { ANNUAL_RESULT_TOTAL_MARKS } from "@/lib/results/config";
import { computeStudentTotals } from "@/lib/results/calculations";
import { useT } from "@/i18n/locale-provider";

type Subject = { id: string; name: string; maxMarks: number };
type SubjectMark = {
  subjectId: string;
  name: string;
  maxMarks: number;
  marksObtained: number;
  achievementMarks: number;
  graceMarks: number;
};

function StudentResultInner() {
  const t = useT();
  const params = useSearchParams();
  const classId = params.get("classId") || "";
  const studentId = params.get("studentId") || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examId, setExamId] = useState("");
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [classInfo, setClassInfo] = useState<Record<string, unknown> | null>(null);
  const [subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [meta, setMeta] = useState({ passNumber: "", attendancePresent: "", attendanceTotal: "" });
  const [reopeningDate, setReopeningDate] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const loadData = useCallback(async () => {
    if (!classId || !studentId) return;
    setLoading(true);
    setSaveError(null);

    try {
      const session = await fetch("/api/results/class-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_session", classId }),
      }).then((r) => r.json());

      if (!session.exam) throw new Error("Failed to create session");
      setExamId(session.exam.id);
      setClassInfo(session.class);
      setReopeningDate(session.exam.reopeningDate || "");
      setIsPublished(Boolean(session.exam.isPublished));

      const [overview, examData] = await Promise.all([
        fetch(`/api/results/class-overview?classId=${classId}`).then((r) => r.json()),
        fetch(`/api/results?examId=${session.exam.id}`).then((r) => r.json()),
      ]);

      const st = overview.students?.find((s: { id: string }) => s.id === studentId);
      const fullStudent = examData.students?.find((s: { id: string }) => s.id === studentId);
      setStudent(fullStudent || st);

      const examSubjects: Subject[] = session.exam.subjects || [];
      const results = (examData.exam?.results || []).filter((r: { studentId: string }) => r.studentId === studentId);
      const rc = (examData.reportCards || []).find((r: { studentId: string }) => r.studentId === studentId);

      setSubjects(
        examSubjects.map((sub) => {
          const r = results.find((x: { subjectId: string }) => x.subjectId === sub.id);
          return {
            subjectId: sub.id,
            name: sub.name,
            maxMarks: sub.maxMarks,
            marksObtained: r?.marksObtained ?? 0,
            achievementMarks: r?.achievementMarks ?? 0,
            graceMarks: r?.graceMarks ?? 0,
          };
        }),
      );

      setMeta({
        passNumber: rc?.passNumber || "",
        attendancePresent: rc?.attendancePresent != null ? String(rc.attendancePresent) : "",
        attendanceTotal: rc?.attendanceTotal != null ? String(rc.attendanceTotal) : "",
      });
    } catch {
      setSaveError(t("results.loadError"));
    } finally {
      setLoading(false);
    }
  }, [classId, studentId, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateSubject = (idx: number, field: keyof SubjectMark, value: number) => {
    setSaveOk(false);
    setSubjects((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const totals = computeStudentTotals(
    subjects.map((s) => ({
      marksObtained: s.marksObtained,
      achievementMarks: s.achievementMarks,
      graceMarks: s.graceMarks,
      maxMarks: s.maxMarks,
    })),
  );

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_student",
          examId,
          studentId,
          reopeningDate: reopeningDate || undefined,
          marks: subjects.map((s) => ({
            subjectId: s.subjectId,
            marksObtained: s.marksObtained,
            achievementMarks: s.achievementMarks,
            graceMarks: s.graceMarks,
            maxMarks: s.maxMarks,
          })),
          meta: {
            passNumber: meta.passNumber || null,
            attendancePresent: meta.attendancePresent ? Number(meta.attendancePresent) : null,
            attendanceTotal: meta.attendanceTotal ? Number(meta.attendanceTotal) : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveOk(true);
      await loadData();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!classId || !studentId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t("results.selectStudent")}</p>
        <Link href="/results"><Button variant="outline" className="mt-4">{t("results.backToResults")}</Button></Link>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const fullName = student ? `${student.firstName} ${student.surname}` : "";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={`/results/class/${classId}`}><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-blue-600" />
              {t("results.enterMarks")}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{classInfo?.name as string}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "..." : t("results.save")}
          </Button>
          {examId && (
            <Link href={`/results/print?examId=${examId}&studentId=${studentId}&classId=${classId}&mode=particular`}>
              <Button variant="outline"><Printer className="h-4 w-4" /> {t("results.print")}</Button>
            </Link>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}
      {saveOk && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t("results.marksSaved")}</div>
      )}
      {isPublished && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("results.publishedCanEdit")}</div>
      )}

      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{fullName}</h2>
            <p className="text-sm text-slate-600">
              {t("results.roll")}: {student?.rollNumber as string || "—"} •
              {t("results.classLabel", { standard: classInfo?.standard as string })}-{classInfo?.section as string}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{t("results.total")}</p>
            <p className="text-2xl font-bold text-blue-700">{totals.totalFinal} <span className="text-sm font-normal text-slate-500">/ {ANNUAL_RESULT_TOTAL_MARKS}</span></p>
            <p className="text-sm text-slate-600">{totals.percentage.toFixed(1)}% • {totals.grade}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("results.subjectMarks")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-slate-500">
                <th className="p-3">{t("results.subject")}</th>
                <th className="p-3 text-center w-16">{t("results.max")}</th>
                <th className="p-3 text-center w-24">{t("results.obtained")}</th>
                <th className="p-3 text-center w-20">{t("results.achievement")}</th>
                <th className="p-3 text-center w-20">{t("results.grace")}</th>
                <th className="p-3 text-center w-16">{t("results.total")}</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, i) => {
                const rowTotal = sub.marksObtained + sub.achievementMarks + sub.graceMarks;
                return (
                  <tr key={sub.subjectId} className="border-b">
                    <td className="p-3 font-medium">{sub.name}</td>
                    <td className="p-3 text-center text-slate-500">{sub.maxMarks}</td>
                    <td className="p-2">
                      <Input
                        type="number" min={0} max={sub.maxMarks}
                        className="text-center h-9"
                        value={sub.marksObtained === 0 ? "" : sub.marksObtained}
                        onChange={(e) => updateSubject(i, "marksObtained", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min={0}
                        className="text-center h-9"
                        value={sub.achievementMarks === 0 ? "" : sub.achievementMarks}
                        onChange={(e) => updateSubject(i, "achievementMarks", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number" min={0}
                        className="text-center h-9"
                        value={sub.graceMarks === 0 ? "" : sub.graceMarks}
                        onChange={(e) => updateSubject(i, "graceMarks", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-3 text-center font-bold text-blue-700">{rowTotal > 0 ? rowTotal : "—"}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-bold">
                <td className="p-3">{t("results.grandTotal")}</td>
                <td className="p-3 text-center">{ANNUAL_RESULT_TOTAL_MARKS}</td>
                <td className="p-3 text-center">{totals.totalObtained}</td>
                <td className="p-3 text-center">{totals.totalAchievement || "—"}</td>
                <td className="p-3 text-center">{totals.totalGrace || "—"}</td>
                <td className="p-3 text-center text-blue-700">{totals.totalFinal}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("results.otherDetails")}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Input label={t("results.passNo")} value={meta.passNumber} onChange={(e) => setMeta({ ...meta, passNumber: e.target.value })} />
          <Input label={t("results.reopeningDate")} type="date" value={reopeningDate} onChange={(e) => setReopeningDate(e.target.value)} />
          <Input label={t("results.present")} type="number" value={meta.attendancePresent} onChange={(e) => setMeta({ ...meta, attendancePresent: e.target.value })} />
          <Input label={t("results.totalDays")} type="number" value={meta.attendanceTotal} onChange={(e) => setMeta({ ...meta, attendanceTotal: e.target.value })} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentResultPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-8">{t("common.loading")}</div>}>
      <StudentResultInner />
    </Suspense>
  );
}
