"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckSquare,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Armchair,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { InfoModal } from "@/components/ui/info-modal";
import { useT } from "@/i18n/locale-provider";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { makeTermKey, type ExamTermRole } from "@/lib/results/exam-terms";
import "../subjects/subjects-hub.css";

type TabId = "template" | "apply";

type TemplateItem = {
  key: string;
  labelEn: string;
  labelGu: string;
  totalMax: number;
  maxMarks: number;
  role: ExamTermRole;
  internalMax?: number;
};

type ClassExamRow = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
  examId: string | null;
  midExamCount: number;
  totalOutOf: number;
  termsList?: TemplateItem[];
  _count: { students: number };
};

function defaultTemplate(): TemplateItem[] {
  return [
    { key: "mid1", labelEn: "Mid Exam 1", labelGu: "મધ્ય પરીક્ષા 1", totalMax: 100, maxMarks: 80, internalMax: 20, role: "component" },
    { key: "mid2", labelEn: "Mid Exam 2", labelGu: "મધ્ય પરીક્ષા 2", totalMax: 100, maxMarks: 80, internalMax: 20, role: "component" },
    {
      key: "final",
      labelEn: "Final Exam",
      labelGu: "અંતિમ પરીક્ષા",
      totalMax: 100,
      maxMarks: 80,
      role: "final",
      internalMax: 20,
    },
  ];
}

export default function ExamsHubPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("template");
  const [year, setYear] = useState("2025-26");
  const [classes, setClasses] = useState<ClassExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateItem[]>(() => defaultTemplate());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftNameGu, setDraftNameGu] = useState("");
  const [draftMax, setDraftMax] = useState(50);
  const [draftInternalMax, setDraftInternalMax] = useState(20);
  const [draftTotalMax, setDraftTotalMax] = useState(100);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const totalOutOf = useMemo(() => {
    return template.reduce((sum, item) => {
      return sum + Math.max(0, Number(item.totalMax) || 0);
    }, 0);
  }, [template]);

  const componentCount = template.filter((x) => x.role === "component").length;
  const hasInvalidSplit = template.some(
    (x) => x.maxMarks + (x.internalMax ?? 0) !== x.totalMax,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?academicYear=${encodeURIComponent(year)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const rows: ClassExamRow[] = data.classes || [];
      setClasses(rows);
      const saved = Array.isArray(data.savedTemplate)
        ? (data.savedTemplate as TemplateItem[])
        : null;
      const sample = rows.find((r) => r.examId && r.termsList?.length);
      const source = saved?.length ? saved : sample?.termsList;
      if (source?.length) {
        setTemplate(
          source.map((item) => ({
            key: item.key,
            labelEn: item.labelEn,
            labelGu: item.labelGu || item.labelEn,
            totalMax:
              item.totalMax ??
              item.maxMarks +
                (item.internalMax ?? (item.role === "final" ? 20 : 0)),
            maxMarks: item.maxMarks,
            role: item.role === "final" ? "final" : "component",
            internalMax:
              item.internalMax ?? (item.role === "final" ? 20 : 0),
          })),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("examsHub.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [year, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAll = () => {
    if (selected.size === classes.length) setSelected(new Set());
    else setSelected(new Set(classes.map((c) => c.id)));
  };

  const updateItem = (key: string, patch: Partial<TemplateItem>) => {
    setTemplate((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const openAdd = () => {
    const n = componentCount + 1;
    setDraftName(`Mid Exam ${n}`);
    setDraftNameGu(`મધ્ય પરીક્ષા ${n}`);
    setDraftTotalMax(100);
    setDraftMax(80);
    setDraftInternalMax(20);
    setAddOpen(true);
  };

  const confirmAdd = () => {
    const labelEn = draftName.trim();
    if (!labelEn) {
      toast.warning(t("examsHub.addNameRequired"));
      return;
    }
    if (draftMax + draftInternalMax !== draftTotalMax) {
      toast.warning(t("examsHub.splitMismatch"));
      return;
    }
    setAddSaving(true);
    const key = makeTermKey(labelEn, template.map((x) => x.key));
    const item: TemplateItem = {
      key,
      labelEn,
      labelGu: draftNameGu.trim() || labelEn,
      totalMax: Math.max(0, Number(draftTotalMax) || 0),
      maxMarks: Math.max(0, Number(draftMax) || 0),
      internalMax: Math.max(0, Number(draftInternalMax) || 0),
      role: "component",
    };
    setTemplate((prev) => {
      const finalIdx = prev.findIndex((x) => x.role === "final");
      if (finalIdx < 0) return [...prev, item];
      const next = [...prev];
      next.splice(finalIdx, 0, item);
      return next;
    });
    setAddOpen(false);
    setAddSaving(false);
    toast.success(t("examsHub.examAdded"));
  };

  const confirmDelete = () => {
    if (!deleteKey) return;
    const target = template.find((x) => x.key === deleteKey);
    if (!target) {
      setDeleteKey(null);
      return;
    }
    if (target.role === "final") {
      toast.warning(t("examsHub.cannotDeleteFinal"));
      setDeleteKey(null);
      return;
    }
    if (componentCount <= 1) {
      toast.warning(t("examsHub.keepOneExam"));
      setDeleteKey(null);
      return;
    }
    setTemplate((prev) => prev.filter((x) => x.key !== deleteKey));
    setDeleteKey(null);
    toast.success(t("examsHub.examDeleted"));
  };

  const saveTemplate = async () => {
    if (hasInvalidSplit) {
      toast.error(t("examsHub.fixSplitBeforeApply"));
      return;
    }
    if (!template.some((item) => item.role === "component")) {
      toast.error(t("examsHub.keepOneExam"));
      return;
    }

    setTemplateSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_template",
          templateTerms: template,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(t("examsHub.templateSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("examsHub.templateSaveFailed"),
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const apply = async () => {
    if (!selected.size) {
      toast.error(t("examsHub.selectClassHint"));
      return;
    }
    if (!template.some((x) => x.role === "component")) {
      toast.error(t("examsHub.keepOneExam"));
      return;
    }
    if (
      template.some(
        (x) =>
          x.maxMarks + (x.internalMax ?? 0) !== x.totalMax,
      )
    ) {
      toast.error(t("examsHub.fixSplitBeforeApply"));
      setTab("template");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          classIds: [...selected],
          templateTerms: template,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.push({
        title: t("examsHub.applyDone", { count: data.applied }),
        variant: "success",
        duration: 3200,
      });
      await load();
      setTab("apply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("examsHub.applyFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={t("examsHub.title")}
      subtitle={t("examsHub.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("examsHub.title") },
      ]}
      icon={<BookOpenCheck className="h-5 w-5" />}
      actions={
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Link href="/exam-seat-numbers" className="w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
              <Armchair className="h-3.5 w-3.5" />
              {t("examSeats.title")}
            </Button>
          </Link>
          <Link href="/subjects" className="w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
              {t("nav.subjects")}
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => void load()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("examsHub.reload")}
          </Button>
        </div>
      }
    >
      <div className="subhub">
        <div className="subhub__intro">
          <p>{t("examsHub.introTitle")}</p>
          <ol>
            <li>{t("examsHub.intro1")}</li>
            <li>{t("examsHub.intro2")}</li>
            <li>{t("examsHub.intro3")}</li>
          </ol>
        </div>

        <div className="subhub__tabs">
          {(
            [
              { id: "template" as const, icon: Layers, label: t("examsHub.tabTemplate") },
              { id: "apply" as const, icon: Upload, label: t("examsHub.tabApply") },
            ] as const
          ).map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              className={cn("subhub__tab", tab === tabItem.id && "subhub__tab--active")}
              onClick={() => setTab(tabItem.id)}
            >
              <tabItem.icon className="h-3.5 w-3.5" />
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === "template" && (
          <div className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2 className="subhub__panel-title">{t("examsHub.templateTitle")}</h2>
                <p className="subhub__panel-desc">{t("examsHub.templateDesc")}</p>
              </div>
              <div className="subhub__actions">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={templateSaving || hasInvalidSplit}
                  onClick={() => void saveTemplate()}
                >
                  {templateSaving ? (
                    <Spinner size="sm" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {templateSaving
                    ? t("common.saving")
                    : t("examsHub.saveTemplate")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("examsHub.addExam")}
                </Button>
                <Button type="button" size="sm" onClick={() => setTab("apply")}>
                  <Upload className="h-3.5 w-3.5" />
                  {t("examsHub.goApply")}
                </Button>
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              {template.map((item, idx) => (
                <div
                  key={item.key}
                  className={cn(
                    "rounded-xl border p-3 sm:p-4 space-y-3",
                    item.role === "final" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.role === "final"
                        ? t("examTerms.final")
                        : `${t("examsHub.componentExam")} ${idx + 1}`}
                    </p>
                    {item.role === "component" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => setDeleteKey(item.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={t("examsHub.labelEn")}
                      value={item.labelEn}
                      onChange={(e) => updateItem(item.key, { labelEn: e.target.value })}
                    />
                    <Input
                      label={t("examsHub.labelGu")}
                      value={item.labelGu}
                      onChange={(e) => updateItem(item.key, { labelGu: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      label={t("examsHub.totalOutOf")}
                      type="number"
                      min={0}
                      value={item.totalMax}
                      onChange={(e) =>
                        updateItem(item.key, {
                          totalMax: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                    <Input
                      label={t("examsHub.paperOutOf")}
                      type="number"
                      min={0}
                      value={item.maxMarks}
                      onChange={(e) =>
                        updateItem(item.key, { maxMarks: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                    <Input
                      label={t("examsHub.teacherOutOf")}
                      type="number"
                      min={0}
                      value={item.internalMax ?? 0}
                      onChange={(e) =>
                        updateItem(item.key, {
                          internalMax: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                  {item.maxMarks + (item.internalMax ?? 0) !== item.totalMax && (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                      {t("examsHub.splitError", {
                        paper: item.maxMarks,
                        internal: item.internalMax ?? 0,
                        sum: item.maxMarks + (item.internalMax ?? 0),
                        total: item.totalMax,
                      })}
                    </p>
                  )}
                </div>
              ))}

              <Button type="button" variant="outline" className="w-full border-dashed" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                {t("examsHub.addExam")}
              </Button>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4" />
                  {t("examsHub.autoTotal", { total: totalOutOf })}
                </p>
                <p className="text-xs mt-1 text-emerald-800/80">
                  {t("examsHub.templateCount", { count: componentCount })} · {t("examsHub.autoTotalHint")}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "apply" && (
          <div className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2 className="subhub__panel-title">{t("examsHub.applyTitle")}</h2>
                <p className="subhub__panel-desc">
                  {t("examsHub.applyDesc", { total: totalOutOf, mids: componentCount })}
                </p>
              </div>
              <div className="subhub__filters">
                <Select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
                  emptyLabel=""
                />
                <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selected.size === classes.length
                    ? t("examsHub.unselectAll")
                    : t("examsHub.selectAll")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !selected.size || hasInvalidSplit}
                  onClick={() => void apply()}
                >
                  {saving ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                  {t("examsHub.applyBtn")}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : classes.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">{t("examsHub.noClasses")}</p>
            ) : (
              <div className="examhub__table-wrap overflow-x-auto">
                <table className="examhub__table w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-left text-xs text-slate-500">
                      <th className="p-3 w-10" />
                      <th className="p-3">{t("examsHub.colClass")}</th>
                      <th className="p-3">{t("examsHub.colStudents")}</th>
                      <th className="p-3">{t("examsHub.colMids")}</th>
                      <th className="p-3">{t("examsHub.colOutOf")}</th>
                      <th className="p-3">{t("examsHub.colBreakdown")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => {
                      const checked = selected.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            "border-b hover:bg-teal-50/40 cursor-pointer",
                            checked && "bg-teal-50/50",
                          )}
                          onClick={() => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            });
                          }}
                        >
                          <td className="examhub__check-cell p-3" data-label="">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                          <td
                            className="p-3 font-medium text-slate-900"
                            data-label={t("examsHub.colClass")}
                          >
                            {c.name}
                            <span className="block text-[11px] text-slate-400 font-normal">
                              {c.standard}-{c.section}
                              {c.stream ? ` · ${c.stream}` : ""}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600" data-label={t("examsHub.colStudents")}>
                            {c._count.students}
                          </td>
                          <td className="p-3" data-label={t("examsHub.colMids")}>
                            {c.midExamCount}
                          </td>
                          <td
                            className="p-3 font-semibold text-teal-800"
                            data-label={t("examsHub.colOutOf")}
                          >
                            {c.totalOutOf}
                          </td>
                          <td
                            className="p-3 text-xs text-slate-500"
                            data-label={t("examsHub.colBreakdown")}
                          >
                            {(c.termsList || [])
                              .map((x) =>
                                `${x.maxMarks}+${x.internalMax ?? 0}`,
                              )
                              .join("+") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <InfoModal
        isOpen={addOpen}
        onClose={() => !addSaving && setAddOpen(false)}
        title={t("examsHub.addExam")}
      >
        <div className="subhub__modal-form space-y-3">
          <p className="text-sm text-slate-600">{t("examsHub.addExamHint")}</p>
          <Input
            label={t("examsHub.labelEn")}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="e.g. Mid Exam 3 / Unit Test 1"
          />
          <Input
            label={t("examsHub.labelGu")}
            value={draftNameGu}
            onChange={(e) => setDraftNameGu(e.target.value)}
            placeholder="દા.ત. મધ્ય પરીક્ષા 3"
          />
          <Input
            label={t("examsHub.totalOutOf")}
            type="number"
            min={0}
            value={draftTotalMax}
            onChange={(e) =>
              setDraftTotalMax(Math.max(0, Number(e.target.value) || 0))
            }
          />
          <Input
            label={t("examsHub.paperOutOf")}
            type="number"
            min={0}
            value={draftMax}
            onChange={(e) => setDraftMax(Math.max(0, Number(e.target.value) || 0))}
          />
          <Input
            label={t("examsHub.teacherOutOf")}
            type="number"
            min={0}
            value={draftInternalMax}
            onChange={(e) =>
              setDraftInternalMax(Math.max(0, Number(e.target.value) || 0))
            }
          />
          {draftMax + draftInternalMax !== draftTotalMax && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {t("examsHub.splitError", {
                paper: draftMax,
                internal: draftInternalMax,
                sum: draftMax + draftInternalMax,
                total: draftTotalMax,
              })}
            </p>
          )}
          <div className="subhub__modal-actions">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmAdd}
              disabled={
                addSaving ||
                draftMax + draftInternalMax !== draftTotalMax
              }
            >
              {addSaving ? <Spinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
              {t("examsHub.addExam")}
            </Button>
          </div>
        </div>
      </InfoModal>

      <InfoModal
        isOpen={deleteKey != null}
        onClose={() => setDeleteKey(null)}
        title={t("examsHub.deleteTitle")}
      >
        <div className="subhub__modal-form space-y-3">
          <p className="text-sm text-slate-700">
            {t("examsHub.deleteConfirm", {
              name: template.find((x) => x.key === deleteKey)?.labelEn || "—",
            })}
          </p>
          <div className="subhub__modal-actions">
            <Button type="button" variant="outline" onClick={() => setDeleteKey(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </InfoModal>
    </PageShell>
  );
}
