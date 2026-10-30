"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Filter,
  Percent,
  Save,
  Settings2,
  Users,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { toast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { CATEGORIES, DEFAULT_ACADEMIC_YEAR, FINANCIAL_YEARS } from "@/lib/constants";
import type { ExamGradeBand, ExamResultFlag, ExamRules } from "@/lib/results/exam-rules";
import { cn } from "@/lib/utils";

type ClassOption = {
  classId: string;
  className: string;
  standard: string;
  section: string;
  examId: string | null;
  terms: Array<{
    key: string;
    labelEn: string;
    labelGu: string;
    createdByName?: string | null;
    counts: { total: number; passed: number; failed: number; pending: number; passPercent: number };
  }>;
};

type StatsStudent = {
  studentId: string;
  rollNumber: string | null;
  nameEn: string;
  nameGu: string;
  category: string;
  gender: string | null;
  seatNumber: string;
  obtained: number;
  max: number;
  percent: number;
  grade: string;
  result: ExamResultFlag;
};

type DetailPayload = {
  class: { id: string; name: string; standard: string; section: string; academicYear: string };
  exam: { id: string };
  rules: ExamRules;
  term: {
    key: string;
    labelEn: string;
    labelGu: string;
    createdByName?: string | null;
    createdAt?: string | null;
    published?: boolean;
  } | null;
  counts: { total: number; passed: number; failed: number; pending: number; passPercent: number };
  byCategory: Record<string, { total: number; passed: number; failed: number; pending: number }>;
  students: StatsStudent[];
  terms: Array<{
    term: { key: string; labelEn: string; labelGu: string; createdByName?: string | null };
    counts: { total: number; passed: number; failed: number; pending: number; passPercent: number };
  }>;
};

const emptyRules: ExamRules = {
  passPercent: 33,
  passMarks: 33,
  grades: [],
};

export default function PassFailPage() {
  const t = useT();
  const params = useSearchParams();
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [classId, setClassId] = useState(params.get("classId") || "");
  const [termKey, setTermKey] = useState(params.get("term") || params.get("termKey") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [resultFilter, setResultFilter] = useState(params.get("result") || "");
  const [rules, setRules] = useState<ExamRules>(emptyRules);
  const [canEdit, setCanEdit] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [overview, setOverview] = useState<ClassOption[]>([]);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadRules = useCallback(async () => {
    const res = await fetch("/api/exams/rules");
    const data = await res.json();
    if (data.rules) setRules(data.rules);
    setCanEdit(Boolean(data.canEdit));
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/stats?academicYear=${encodeURIComponent(academicYear)}`);
      const data = await res.json();
      setOverview(data.classes || []);
      if (data.rules) setRules(data.rules);
    } catch {
      toast.error(t("examResults.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [academicYear, t]);

  const loadDetail = useCallback(async () => {
    if (!classId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const qs = new URLSearchParams({
        classId,
        academicYear,
      });
      if (termKey) qs.set("term", termKey);
      if (category) qs.set("category", category);
      if (resultFilter) qs.set("result", resultFilter);
      const res = await fetch(`/api/exams/stats?${qs.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetail(data);
    } catch {
      toast.error(t("examResults.loadFailed"));
    } finally {
      setLoadingDetail(false);
    }
  }, [academicYear, category, classId, resultFilter, t, termKey]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!classId || termKey) return;
    const first = overview.find((row) => row.classId === classId)?.terms?.[0]?.key;
    if (first) setTermKey(first);
  }, [classId, overview, termKey]);

  const selectedClass = overview.find((row) => row.classId === classId);
  const termOptions = useMemo(() => {
    const fromDetail = detail?.terms?.map((item) => item.term) || [];
    if (fromDetail.length) return fromDetail;
    return selectedClass?.terms || [];
  }, [detail, selectedClass]);

  async function saveRules() {
    setSavingRules(true);
    try {
      const res = await fetch("/api/exams/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("examResults.rulesSaveFailed"));
      setRules(data.rules);
      toast.success(t("examResults.rulesSaved"));
      await loadDetail();
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("examResults.rulesSaveFailed"));
    } finally {
      setSavingRules(false);
    }
  }

  function updatePassPercent(value: string) {
    const n = Number(value);
    const passPercent = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    setRules((prev) => ({ ...prev, passPercent, passMarks: passPercent }));
  }

  function updatePassMarks(value: string) {
    const n = Number(value);
    const passMarks = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    setRules((prev) => ({ ...prev, passMarks, passPercent: passMarks }));
  }

  function updateBand(index: number, patch: Partial<ExamGradeBand>) {
    setRules((prev) => ({
      ...prev,
      grades: prev.grades.map((band, i) => (i === index ? { ...band, ...patch } : band)),
    }));
  }

  const counts = detail?.counts;
  const categoryRows = Object.entries(detail?.byCategory || {}).filter(([, bucket]) => bucket.total > 0);

  return (
    <PageShell
      title={t("examResults.title")}
      subtitle={t("examResults.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("results.hubTitle"), href: "/results" },
        { label: t("examResults.title") },
      ]}
      icon={<Award className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/40">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-teal-700" />
                  {t("examResults.rulesTitle")}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{t("examResults.rulesHint")}</p>
              </div>
              {canEdit && (
                <Button type="button" size="sm" onClick={() => void saveRules()} disabled={savingRules}>
                  {savingRules ? <Spinner /> : <Save className="h-3.5 w-3.5" />}
                  {t("examResults.saveRules")}
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                label={t("examResults.passMarks")}
                type="number"
                min={0}
                max={100}
                value={String(rules.passMarks)}
                onChange={(e) => updatePassMarks(e.target.value)}
                disabled={!canEdit}
              />
              <Input
                label={t("examResults.passPercent")}
                type="number"
                min={0}
                max={100}
                value={String(rules.passPercent)}
                onChange={(e) => updatePassPercent(e.target.value)}
                disabled={!canEdit}
              />
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">{t("examResults.passPreview")}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {t("examResults.passPreviewValue", {
                    marks: String(rules.passMarks),
                    percent: String(rules.passPercent),
                  })}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">{t("examResults.grade")}</th>
                    <th className="text-left px-3 py-2">{t("examResults.minPercent")}</th>
                    <th className="text-left px-3 py-2">{t("examResults.autoGradeHint")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.grades.map((band, index) => (
                    <tr key={`${band.grade}-${index}`} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          value={band.grade}
                          onChange={(e) => updateBand(index, { grade: e.target.value.toUpperCase() })}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={String(band.minPercent)}
                          onChange={(e) => updateBand(index, { minPercent: Number(e.target.value) || 0 })}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {t("examResults.gradeFrom", { percent: String(band.minPercent), grade: band.grade })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              {t("examResults.filters")}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select
                label={t("examResults.academicYear")}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
                emptyLabel=""
              />
              <Select
                label={t("examResults.class")}
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setTermKey("");
                }}
                options={overview.map((row) => ({
                  value: row.classId,
                  label: `${row.className} (${row.standard}-${row.section})`,
                }))}
                emptyLabel={t("examResults.allClasses")}
              />
              <Select
                label={t("examResults.exam")}
                value={termKey}
                onChange={(e) => setTermKey(e.target.value)}
                options={termOptions.map((term) => ({
                  value: term.key,
                  label: term.labelGu || term.labelEn,
                }))}
                emptyLabel={t("examResults.allExams")}
                disabled={!classId}
              />
              <Select
                label={t("examResults.category")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={CATEGORIES.map((item) => ({ value: item, label: t(`category.${item}`) }))}
                emptyLabel={t("common.all")}
              />
              <Select
                label={t("examResults.result")}
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                options={[
                  { value: "pass", label: t("examResults.pass") },
                  { value: "fail", label: t("examResults.fail") },
                  { value: "pending", label: t("examResults.pending") },
                ]}
                emptyLabel={t("common.all")}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <PageLoader />
        ) : !classId ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {overview.map((row) => (
              <button
                key={row.classId}
                type="button"
                className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300 hover:shadow-md transition"
                onClick={() => setClassId(row.classId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{row.className}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.standard}-{row.section}
                    </p>
                  </div>
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-3 space-y-1.5">
                  {(row.terms || []).length === 0 ? (
                    <p className="text-xs text-slate-400">{t("examResults.noExam")}</p>
                  ) : (
                    row.terms.map((term) => (
                      <div key={term.key} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{term.labelGu || term.labelEn}</span>
                        <span className="text-slate-500">
                          <span className="text-emerald-700 font-semibold">{term.counts.passed}</span>
                          {" / "}
                          <span className="text-rose-700 font-semibold">{term.counts.failed}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : loadingDetail || !detail ? (
          <PageLoader />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{detail.class.name}</h3>
                <p className="text-sm text-slate-500">
                  {detail.term?.labelGu || detail.term?.labelEn || t("examResults.exam")}
                  {detail.term?.createdByName
                    ? ` · ${t("examResults.createdBy", { name: detail.term.createdByName })}`
                    : ""}
                </p>
              </div>
              <Link href={`/results/term?classId=${detail.class.id}&term=${detail.term?.key || ""}`}>
                <Button variant="outline" size="sm">{t("examResults.openMarks")}</Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("examResults.total")} value={counts?.total || 0} icon={Users} tone="slate" />
              <StatCard label={t("examResults.pass")} value={counts?.passed || 0} icon={CheckCircle2} tone="emerald" />
              <StatCard label={t("examResults.fail")} value={counts?.failed || 0} icon={XCircle} tone="rose" />
              <StatCard
                label={t("examResults.passRate")}
                value={`${counts?.passPercent || 0}%`}
                icon={Percent}
                tone="teal"
              />
            </div>

            {categoryRows.length > 0 && (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-4 py-2">{t("examResults.category")}</th>
                        <th className="text-right px-4 py-2">{t("examResults.total")}</th>
                        <th className="text-right px-4 py-2">{t("examResults.pass")}</th>
                        <th className="text-right px-4 py-2">{t("examResults.fail")}</th>
                        <th className="text-right px-4 py-2">{t("examResults.pending")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map(([key, bucket]) => (
                        <tr key={key} className="border-t">
                          <td className="px-4 py-2 font-medium">
                            {key === "Other" ? t("examResults.otherCategory") : t(`category.${key}`)}
                          </td>
                          <td className="px-4 py-2 text-right">{bucket.total}</td>
                          <td className="px-4 py-2 text-right text-emerald-700 font-semibold">{bucket.passed}</td>
                          <td className="px-4 py-2 text-right text-rose-700 font-semibold">{bucket.failed}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{bucket.pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-2">{t("examResults.roll")}</th>
                      <th className="text-left px-4 py-2">{t("examResults.student")}</th>
                      <th className="text-left px-4 py-2">{t("examResults.category")}</th>
                      <th className="text-left px-4 py-2">{t("examResults.seat")}</th>
                      <th className="text-right px-4 py-2">{t("examResults.marks")}</th>
                      <th className="text-right px-4 py-2">{t("examResults.percent")}</th>
                      <th className="text-left px-4 py-2">{t("examResults.grade")}</th>
                      <th className="text-left px-4 py-2">{t("examResults.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.students || []).map((row) => (
                      <tr key={row.studentId} className="border-t">
                        <td className="px-4 py-2">{row.rollNumber || "—"}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-slate-900">{row.nameGu || row.nameEn}</div>
                          <div className="text-xs text-slate-500">{row.nameEn}</div>
                        </td>
                        <td className="px-4 py-2">{row.category}</td>
                        <td className="px-4 py-2 font-mono">{row.seatNumber || "—"}</td>
                        <td className="px-4 py-2 text-right">
                          {row.obtained}/{row.max}
                        </td>
                        <td className="px-4 py-2 text-right">{row.percent}%</td>
                        <td className="px-4 py-2 font-semibold">{row.grade}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
                              row.result === "pass" && "bg-emerald-50 text-emerald-800",
                              row.result === "fail" && "bg-rose-50 text-rose-800",
                              row.result === "pending" && "bg-slate-100 text-slate-600",
                            )}
                          >
                            {t(`examResults.${row.result}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(detail.students || []).length === 0 && (
                  <p className="px-4 py-8 text-center text-slate-500">{t("examResults.noStudents")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone: "slate" | "emerald" | "rose" | "teal";
}) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
  };
  return (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
