"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckSquare,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Armchair,
  Star,
  GripVertical,
} from "lucide-react";
import { makeTermKey, type ExamSubjectScope, type ExamTermRole } from "@/lib/results/exam-terms";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { InfoModal } from "@/components/ui/info-modal";
import { useT } from "@/i18n/locale-provider";
import { FINANCIAL_YEARS, DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { useSchoolFeatures } from "@/components/school/use-school-features";
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
  subjectScope?: ExamSubjectScope;
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
    {
      key: "mid1",
      labelEn: "Mid Exam 1",
      labelGu: "મધ્ય પરીક્ષા 1",
      totalMax: 100,
      maxMarks: 80,
      internalMax: 20,
      role: "component",
    },
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

/** 24261004404: two exams, year total theory 160 + internal 40 = 200. */
function upperPrimaryTemplate(): TemplateItem[] {
  return [
    {
      key: "mid1",
      labelEn: "First Exam",
      labelGu: "પ્રથમ પરીક્ષા",
      totalMax: 100,
      maxMarks: 80,
      internalMax: 20,
      role: "component",
    },
    {
      key: "final",
      labelEn: "Second Exam",
      labelGu: "દ્વિતીય પરીક્ષા",
      totalMax: 100,
      maxMarks: 80,
      internalMax: 20,
      role: "final",
    },
  ];
}

function isLegacyUpperPrimaryTemplate(items: TemplateItem[]) {
  const split = (item: TemplateItem, paper: number, internal: number) =>
    item.maxMarks === paper &&
    (item.internalMax ?? 0) === internal &&
    item.totalMax === paper + internal;
  if (items.length !== 3) return false;
  const [first, second, final] = items;
  if (!first || !second || !final || final.role !== "final") return false;
  const stock =
    first.key === "mid1" &&
    split(first, 50, 0) &&
    second.key === "mid2" &&
    split(second, 50, 0) &&
    split(final, 80, 20);
  const triple =
    first.key === "mid1" &&
    first.role === "component" &&
    split(first, 80, 20) &&
    second.key === "mid2" &&
    second.role === "component" &&
    split(second, 80, 20) &&
    split(final, 80, 20);
  return stock || triple;
}

export default function ExamsHubPage() {
  const t = useT();
  const { letterhead } = useSchoolFeatures();
  const schoolCode = (letterhead?.code || letterhead?.udiseCode || "").trim();
  const upperPrimarySchool = schoolCode === "24261004404";
  const [tab, setTab] = useState<TabId>("template");
  const [year, setYear] = useState(DEFAULT_ACADEMIC_YEAR);
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
  const [draftComputerOnly, setDraftComputerOnly] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const isComputerItem = (item: TemplateItem) =>
    item.role === "component" && item.subjectScope === "computer";

  const totalOutOf = useMemo(() => {
    return template.reduce((sum, item) => {
      if (isComputerItem(item)) return sum;
      return sum + Math.max(0, Number(item.totalMax) || 0);
    }, 0);
  }, [template]);

  const computerOutOf = useMemo(() => {
    return template.reduce((sum, item) => {
      if (!isComputerItem(item)) return sum;
      return sum + Math.max(0, Number(item.totalMax) || 0);
    }, 0);
  }, [template]);

  const generalItems = template.filter((item) => !isComputerItem(item));
  const computerItems = template.filter((item) => isComputerItem(item));
  const computerCount = computerItems.length;

  const generalComponentCount = template.filter(
    (x) => x.role === "component" && x.subjectScope !== "computer",
  ).length;

  // Total exam count (general non-computer)
  const generalExamCount = generalItems.length;

  const hasInvalidSplit = template.some(
    (x) => x.maxMarks + (x.internalMax ?? 0) !== x.totalMax,
  );

  // Validation: at least 1 general exam required
  const hasEnoughExams = generalExamCount >= 1;

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
        const next: TemplateItem[] = source.map((item) => ({
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
          subjectScope:
            item.role === "final" || item.subjectScope !== "computer"
              ? "all"
              : "computer",
        }));
        setTemplate(
          upperPrimarySchool && isLegacyUpperPrimaryTemplate(next)
            ? upperPrimaryTemplate()
            : next,
        );
      } else if (upperPrimarySchool) {
        setTemplate(upperPrimaryTemplate());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("examsHub.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [year, t, upperPrimarySchool]);

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

  const openAdd = (computer = false) => {
    if (computer) {
      const n = computerCount + 1;
      const source = generalItems.find((item) => item.role === "component") || generalItems[0];
      setDraftName(`Computer Exam ${n}`);
      setDraftNameGu(`કોમ્પ્યુટર પરીક્ષા ${n}`);
      setDraftTotalMax(source?.totalMax ?? 100);
      setDraftMax(source?.maxMarks ?? 80);
      setDraftInternalMax(source?.internalMax ?? 20);
      setDraftComputerOnly(true);
    } else {
      const n = generalComponentCount + 1;
      setDraftName(`Exam ${n}`);
      setDraftNameGu(`પરીક્ષા ${n}`);
      setDraftTotalMax(100);
      setDraftMax(80);
      setDraftInternalMax(20);
      setDraftComputerOnly(false);
    }
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
      subjectScope: draftComputerOnly ? "computer" : "all",
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

    // Allow deleting any exam including final
    // But if deleting final, make sure another exam exists; if only 1 exam left total, prevent
    if (template.length <= 1) {
      toast.warning("ઓછામાં ઓછી એક પરીક્ષા હોવી જ જોઈએ");
      setDeleteKey(null);
      return;
    }

    const nextTemplate = template.filter((x) => x.key !== deleteKey);

    // If we deleted the final exam, make sure there's still a final role
    // Promote the last non-computer exam to final if no final exists
    const hasFinal = nextTemplate.some((x) => x.role === "final");
    if (!hasFinal) {
      // Find last non-computer general item and make it final
      const lastGeneralIdx = [...nextTemplate]
        .map((x, i) => ({ x, i }))
        .filter(({ x }) => !isComputerItem(x))
        .pop();
      if (lastGeneralIdx) {
        nextTemplate[lastGeneralIdx.i] = {
          ...nextTemplate[lastGeneralIdx.i]!,
          role: "final",
        };
      }
    }

    setTemplate(nextTemplate);
    setDeleteKey(null);
    toast.success(t("examsHub.examDeleted"));
  };

  // Mark an exam as Final (role="final") and demote old final to component
  const setAsFinal = (key: string) => {
    setTemplate((prev) => {
      return prev.map((item) => {
        if (item.key === key) return { ...item, role: "final" };
        if (item.role === "final") return { ...item, role: "component" };
        return item;
      });
    });
    toast.success("અંતિમ પરીક્ષા બદલાઈ");
  };

  const saveTemplate = async () => {
    if (hasInvalidSplit) {
      toast.error(t("examsHub.fixSplitBeforeApply"));
      return;
    }
    if (!hasEnoughExams) {
      toast.error("ઓછામાં ઓછી એક પરીક્ષા ઉમેરો");
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
    if (!hasEnoughExams) {
      toast.error("ઓછામાં ઓછી એક પરીક્ષા ઉમેરો");
      return;
    }
    if (hasInvalidSplit) {
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

  // Render a single exam card in the template tab
  const renderExamCard = (item: TemplateItem, label: string, canDelete: boolean) => {
    const isFinal = item.role === "final";
    const isComputer = isComputerItem(item);
    const splitValid = item.maxMarks + (item.internalMax ?? 0) === item.totalMax;

    return (
      <div
        key={item.key}
        className={cn(
          "rounded-xl border p-3 sm:p-4 space-y-3 transition-all",
          isFinal
            ? "border-amber-200 bg-amber-50/60"
            : isComputer
              ? "border-sky-200 bg-sky-50/40"
              : "border-slate-200 bg-white",
        )}
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {label}
              </p>
              {isFinal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  <Star className="h-3 w-3" />
                  અંતિમ
                </span>
              )}
              {isComputer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                  <Monitor className="h-3 w-3" />
                  {t("examsHub.computerBadge")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Allow setting any exam as Final (except computer) */}
            {!isFinal && !isComputer && (
              <button
                type="button"
                title="આ પરીક્ષાને અંતિમ બનાવો"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition"
                onClick={() => setAsFinal(item.key)}
              >
                <Star className="h-3 w-3" />
                અંતિમ
              </button>
            )}
            {/* Delete button for all exams */}
            {canDelete && (
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
        </div>

        {/* Name fields */}
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

        {/* Marks split */}
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

        {/* Split validation error */}
        {!splitValid && (
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
    );
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
            <li>પરીક્ષા ઉમેરો (Mid / Final) — ગુણ સેટ કરો</li>
            <li>જે class માં apply કરો ત્યાં જ marks enter/show થશે</li>
            <li>Final exam — Star icon ક્લિક કરી કોઈ પણ exam ને Final બનાવો</li>
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
                <p className="subhub__panel-desc">
                  પરીક્ષા ઉમેરો/કાઢો · ગુણ સેટ કરો · Apply tab માં class ને assign કરો
                </p>
              </div>
              <div className="subhub__actions">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={templateSaving || hasInvalidSplit || !hasEnoughExams}
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
                <Button type="button" variant="outline" size="sm" onClick={() => openAdd(false)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("examsHub.addExam")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openAdd(true)}>
                  <Monitor className="h-3.5 w-3.5" />
                  {t("examsHub.addComputerExam")}
                </Button>
                <Button type="button" size="sm" onClick={() => setTab("apply")}>
                  <Upload className="h-3.5 w-3.5" />
                  {t("examsHub.goApply")}
                </Button>
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              {/* General subject exams */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {t("examsHub.subjectExamsTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t("examsHub.subjectExamsDesc")} · ⭐ = અંતિમ પરીક્ષા
                </p>
              </div>

              {generalItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>હજુ કોઈ પરીક્ષા નથી. &quot;પરીક્ષા ઉમેરો&quot; ક્લિક કરો.</p>
                </div>
              ) : (
                generalItems.map((item, idx) => {
                  const isFinal = item.role === "final";
                  const compNumber = generalItems
                    .slice(0, idx + 1)
                    .filter((x) => x.role === "component").length;
                  const label = isFinal
                    ? t("examTerms.final")
                    : `${t("examsHub.componentExam")} ${compNumber}`;
                  // Can delete if more than 1 general exam total
                  const canDelete = generalItems.length > 1;
                  return renderExamCard(item, label, canDelete);
                })
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => openAdd(false)}
              >
                <Plus className="h-4 w-4" />
                {t("examsHub.addExam")}
              </Button>

              {/* Total summary */}
              {generalItems.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                  <p className="font-semibold flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4" />
                    {t("examsHub.autoTotal", { total: totalOutOf })}
                  </p>
                  <p className="text-xs mt-1 text-emerald-800/80">
                    {t("examsHub.templateCount", { count: generalComponentCount })} ·{" "}
                    {t("examsHub.autoTotalHint")}
                  </p>
                  {computerOutOf > 0 && (
                    <p className="text-xs mt-1 text-sky-900">
                      {t("examsHub.autoTotalComputer", { total: computerOutOf })}
                    </p>
                  )}
                  {upperPrimarySchool &&
                  template.length === 2 &&
                  template.every((item) => item.maxMarks === 80 && (item.internalMax ?? 0) === 20) ? (
                    <p className="text-xs mt-1 text-emerald-950">
                      પ્રથમ: આંતરિક 20 + લેખિત 80 = 100 · દ્વિતીય: લેખિત 80 + આંતરિક 20 = 100 · વર્ષાન્તે લેખિત 160 + આંતરિક 40 = 200
                    </p>
                  ) : null}
                </div>
              )}

              {/* Computer exams block */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-950">
                      <Monitor className="h-4 w-4" />
                      {t("examsHub.computerExamsTitle")}
                    </h3>
                    <p className="mt-0.5 text-xs text-sky-900/80">
                      {t("examsHub.computerExamsDesc")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAdd(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("examsHub.addComputerExam")}
                  </Button>
                </div>

                {computerItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-sky-200 bg-white/70 px-3 py-4 text-center text-sm text-sky-900/80">
                    {t("examsHub.computerEmpty")}
                  </p>
                ) : (
                  computerItems.map((item, idx) =>
                    renderExamCard(
                      item,
                      `${t("examsHub.computerExam")} ${idx + 1}`,
                      true, // computer exams can always be deleted
                    ),
                  )
                )}
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
                  {t("examsHub.applyDesc", { total: totalOutOf, mids: generalComponentCount })}
                  {" · "}
                  <span className="font-semibold text-teal-800">
                    જે class select કરો ત્યાં જ marks enter & show થશે
                  </span>
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
                  disabled={saving || !selected.size || hasInvalidSplit || !hasEnoughExams}
                  onClick={() => void apply()}
                >
                  {saving ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                  {t("examsHub.applyBtn")}
                </Button>
              </div>
            </div>

            {/* Template summary for apply tab */}
            {generalItems.length > 0 && (
              <div className="mx-3 mt-3 sm:mx-4 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3">
                <p className="text-xs font-bold text-teal-900 mb-2">
                  ✦ Template: નીચેની Exams selected classes ને apply થશે
                </p>
                <div className="flex flex-wrap gap-2">
                  {generalItems.map((item) => (
                    <span
                      key={item.key}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        item.role === "final"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-white text-teal-800 border border-teal-200",
                      )}
                    >
                      {item.role === "final" && <Star className="h-3 w-3" />}
                      {item.labelGu || item.labelEn}
                      <span className="font-normal opacity-70">
                        ({item.totalMax})
                      </span>
                    </span>
                  ))}
                  {computerItems.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800 border border-sky-200"
                    >
                      <Monitor className="h-3 w-3" />
                      {item.labelGu || item.labelEn}
                      <span className="font-normal opacity-70">({item.totalMax})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                      <th className="p-3">Current Exams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => {
                      const checked = selected.has(c.id);
                      const general = (c.termsList || []).filter(
                        (x) => x.subjectScope !== "computer",
                      );
                      const computers = (c.termsList || []).filter(
                        (x) => x.subjectScope === "computer",
                      );
                      return (
                        <tr
                          key={c.id}
                          className={cn(
                            "border-b hover:bg-teal-50/40 cursor-pointer",
                            checked && "bg-teal-50/60",
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
                            {c.totalOutOf || "—"}
                          </td>
                          <td
                            className="p-3"
                            data-label="Current Exams"
                          >
                            {general.length === 0 && computers.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Applied નથી</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {general.map((x) => (
                                  <span
                                    key={x.key}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                      x.role === "final"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-700",
                                    )}
                                  >
                                    {x.role === "final" && <Star className="h-2.5 w-2.5" />}
                                    {x.labelGu || x.labelEn}
                                    <span className="opacity-60">({x.totalMax})</span>
                                  </span>
                                ))}
                                {computers.map((x) => (
                                  <span
                                    key={x.key}
                                    className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800"
                                  >
                                    <Monitor className="h-2.5 w-2.5" />
                                    {x.labelGu || x.labelEn}
                                    <span className="opacity-60">({x.totalMax})</span>
                                  </span>
                                ))}
                              </div>
                            )}
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

      {/* Add exam modal */}
      <InfoModal
        isOpen={addOpen}
        onClose={() => !addSaving && setAddOpen(false)}
        title={draftComputerOnly ? t("examsHub.addComputerExam") : t("examsHub.addExam")}
      >
        <div className="subhub__modal-form space-y-3">
          <p className="text-sm text-slate-600">
            {draftComputerOnly ? t("examsHub.addComputerHint") : t("examsHub.addExamHint")}
          </p>
          <Input
            label={t("examsHub.labelEn")}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={draftComputerOnly ? "e.g. Computer Exam 1" : "e.g. Exam 1 / Unit Test 1"}
          />
          <Input
            label={t("examsHub.labelGu")}
            value={draftNameGu}
            onChange={(e) => setDraftNameGu(e.target.value)}
            placeholder={draftComputerOnly ? "દા.ત. કોમ્પ્યુટર પરીક્ષા 1" : "દા.ત. પરીક્ષા 1"}
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
          {draftComputerOnly && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              {t("examsHub.computerOnlyHint")}
            </p>
          )}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addSaving}
            >
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
              {draftComputerOnly ? t("examsHub.addComputerExam") : t("examsHub.addExam")}
            </Button>
          </div>
        </div>
      </InfoModal>

      {/* Delete exam modal */}
      <InfoModal
        isOpen={deleteKey != null}
        onClose={() => setDeleteKey(null)}
        title={t("examsHub.deleteTitle")}
      >
        <div className="subhub__modal-form space-y-3">
          {template.find((x) => x.key === deleteKey)?.role === "final" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-medium">
              ⚠️ આ અંતિમ પરીક્ષા છે. Delete કરો તો છેલ્લી general exam ને automatically Final બનાવાશે.
            </div>
          )}
          <p className="text-sm text-slate-700">
            {t("examsHub.deleteConfirm", {
              name:
                template.find((x) => x.key === deleteKey)?.labelGu ||
                template.find((x) => x.key === deleteKey)?.labelEn ||
                "—",
            })}
          </p>
          {template.length <= 1 && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              ઓછામાં ઓછી એક પરીક્ષા હોવી જ જોઈએ. Delete ન થઈ શકે.
            </p>
          )}
          <div className="subhub__modal-actions">
            <Button type="button" variant="outline" onClick={() => setDeleteKey(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={template.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </InfoModal>
    </PageShell>
  );
}
