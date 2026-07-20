"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import type { ExamTermKey } from "@/lib/results/exam-terms";

export default function ExamSettingsPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId") || "";

  const [classId, setClassId] = useState(classIdParam);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [midExamCount, setMidExamCount] = useState<"1" | "2">("2");
  const [examId, setExamId] = useState("");
  const [terms, setTerms] = useState<Record<string, { maxMarks: number; examDate: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/classes?academicYear=2025-26")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, []);

  useEffect(() => {
    if (!classId) return;
    fetch(`/api/results/term-marks?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.exam) return;
        setExamId(d.exam.id);
        setMidExamCount(String(d.termMeta?.midExamCount || 2) as "1" | "2");
        const tms = d.termMeta?.terms || {};
        setTerms({
          mid1: { maxMarks: tms.mid1?.maxMarks ?? 50, examDate: tms.mid1?.examDate || "" },
          mid2: { maxMarks: tms.mid2?.maxMarks ?? 50, examDate: tms.mid2?.examDate || "" },
          final: { maxMarks: tms.final?.maxMarks ?? 80, examDate: tms.final?.examDate || "" },
        });
      });
  }, [classId]);

  const save = async () => {
    if (!examId) return;
    setSaving(true);
    await fetch("/api/results/term-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_config",
        examId,
        classId,
        midExamCount: Number(midExamCount),
        terms: {
          mid1: terms.mid1,
          mid2: terms.mid2,
          final: { ...terms.final, internalMax: 20 },
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateTerm = (key: string, field: string, value: string) => {
    setTerms((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: field === "maxMarks" ? Number(value) : value },
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={classId ? `/results/class/${classId}` : "/results"}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("examTerms.settingsTitle")}</h1>
          <p className="text-slate-500 text-sm">{t("examTerms.settingsSubtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("examTerms.settings")}</CardTitle>
          <CardDescription>{t("examTerms.settingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Select
            label={t("examTerms.selectClass")}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t("examTerms.midCountLabel")}</label>
            <div className="flex gap-3">
              {(["1", "2"] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMidExamCount(n)}
                  className={`flex-1 rounded-lg border-2 p-4 text-center transition-all ${
                    midExamCount === n ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-lg">{n}</p>
                  <p className="text-xs text-slate-500 mt-1">{t(`examTerms.midCount${n}`)}</p>
                </button>
              ))}
            </div>
          </div>

          {(["mid1", "mid2", "final"] as ExamTermKey[]).map((key) => {
            if (key === "mid2" && midExamCount === "1") return null;
            const term = terms[key];
            if (!term) return null;
            return (
              <div key={key} className="border rounded-lg p-4 space-y-3">
                <p className="font-semibold text-slate-800">{t(`examTerms.${key}`)}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">{t("examTerms.maxMarksLabel")}</label>
                    <input
                      type="number"
                      value={term.maxMarks}
                      onChange={(e) => updateTerm(key, "maxMarks", e.target.value)}
                      className="w-full h-10 border rounded-lg px-3 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t("examTerms.examDateLabel")}</label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={term.examDate}
                      onChange={(e) => updateTerm(key, "examDate", e.target.value)}
                      className="w-full h-10 border rounded-lg px-3 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Button onClick={save} disabled={saving || !examId} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? t("results.save") + "..." : saved ? t("examTerms.saved") : t("results.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
