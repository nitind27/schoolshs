"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  BookOpenCheck,
  CheckSquare,
  GraduationCap,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  Users,
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
import "./exams-hub.css";

type TabId = "classes" | "types";
type ClassFilter = "all" | "ready" | "empty";
type WizardStep = "type" | "marks";

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

function emptyTemplate(): TemplateItem[] {
  return [];
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

function mapTemplateItems(source: TemplateItem[]): TemplateItem[] {
  return source.map((item) => ({
    key: item.key,
    labelEn: item.labelEn,
    labelGu: item.labelGu || item.labelEn,
    totalMax: item.totalMax ?? item.maxMarks + (item.internalMax ?? 0),
    maxMarks: item.maxMarks,
    role: item.role === "final" ? "final" : "component",
    internalMax: item.internalMax ?? 0,
    subjectScope:
      item.role === "final" || item.subjectScope !== "computer" ? "all" : "computer",
  }));
}

function isComputerItem(item: TemplateItem) {
  return item.role === "component" && item.subjectScope === "computer";
}

export default function ExamsHubPage() {
  const t = useT();
  const { letterhead } = useSchoolFeatures();
  const schoolCode = (letterhead?.code || letterhead?.udiseCode || "").trim();
  const upperPrimarySchool = schoolCode === "24261004404";
  const [tab, setTab] = useState<TabId>("classes");
  const [year, setYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [classes, setClasses] = useState<ClassExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateItem[]>(() => emptyTemplate());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [classSearch, setClassSearch] = useState("");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("type");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [addingType, setAddingType] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftNameGu, setDraftNameGu] = useState("");
  const [draftMax, setDraftMax] = useState(80);
  const [draftInternalMax, setDraftInternalMax] = useState(20);
  const [draftTotalMax, setDraftTotalMax] = useState(100);
  const [draftComputerOnly, setDraftComputerOnly] = useState(false);
  const [draftFinal, setDraftFinal] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

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
  const generalExamCount = generalItems.length;
  const hasInvalidSplit = template.some(
    (x) => x.maxMarks + (x.internalMax ?? 0) !== x.totalMax,
  );
  const hasEnoughExams = generalExamCount >= 1;
  const splitValid = draftMax + draftInternalMax === draftTotalMax;
  const paperPct =
    draftTotalMax > 0 ? Math.round((draftMax / draftTotalMax) * 100) : 0;

  const readyCount = classes.filter((row) => (row.termsList || []).length > 0).length;
  const emptyCount = classes.length - readyCount;

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classes.filter((row) => {
      const hasExams = (row.termsList || []).length > 0;
      if (classFilter === "ready" && !hasExams) return false;
      if (classFilter === "empty" && hasExams) return false;
      if (!q) return true;
      const hay = `${row.name} ${row.standard} ${row.section} ${row.stream}`.toLowerCase();
      return hay.includes(q);
    });
  }, [classes, classFilter, classSearch]);

  const selectedClasses = useMemo(
    () => classes.filter((row) => selected.has(row.id)),
    [classes, selected],
  );

  const pickedItem = template.find((item) => item.key === pickedKey) || null;
  const alreadyOnCount = pickedItem
    ? selectedClasses.filter((row) =>
        (row.termsList || []).some((term) => term.key === pickedItem.key),
      ).length
    : 0;

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
        const next = mapTemplateItems(source);
        setTemplate(
          upperPrimarySchool && isLegacyUpperPrimaryTemplate(next)
            ? upperPrimaryTemplate()
            : next,
        );
      } else if (upperPrimarySchool) {
        setTemplate(upperPrimaryTemplate());
      } else {
        setTemplate(emptyTemplate());
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

  const toggleClass = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredClasses.length) setSelected(new Set());
    else setSelected(new Set(filteredClasses.map((c) => c.id)));
  };

  const updateItem = (key: string, patch: Partial<TemplateItem>) => {
    setTemplate((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const setDraftSplit = (total: number, paper: number, internal: number) => {
    const safeTotal = Math.max(0, total);
    const safePaper = Math.max(0, Math.min(paper, safeTotal));
    const safeInternal = Math.max(0, Math.min(internal, safeTotal - safePaper));
    setDraftTotalMax(safeTotal);
    setDraftMax(safePaper);
    setDraftInternalMax(safeInternal);
  };

  const resetWizard = () => {
    setWizardStep("type");
    setPickedKey(null);
    setAddingType(false);
    setDraftName("");
    setDraftNameGu("");
    setDraftComputerOnly(false);
    setDraftFinal(false);
    setDraftSplit(100, 80, 20);
  };

  const openCreate = (classIds?: string[]) => {
    if (classIds?.length) setSelected(new Set(classIds));
    const nextSelected = classIds?.length ? classIds : [...selected];
    if (!nextSelected.length) {
      toast.error(t("examsHub.selectClassHint"));
      return;
    }
    if (!template.length) {
      toast.warning(t("examsHub.needTypeFirst"));
      setTab("types");
      openAdd(false);
      return;
    }
    resetWizard();
    setCreateOpen(true);
  };

  const openAdd = (computer = false) => {
    if (computer) {
      const n = computerCount + 1;
      const source = generalItems.find((item) => item.role === "component") || generalItems[0];
      setDraftName(`Computer Exam ${n}`);
      setDraftNameGu(`કોમ્પ્યુટર પરીક્ષા ${n}`);
      setDraftSplit(
        source?.totalMax ?? 100,
        source?.maxMarks ?? 80,
        source?.internalMax ?? 20,
      );
      setDraftComputerOnly(true);
      setDraftFinal(false);
    } else {
      const n = generalComponentCount + 1;
      setDraftName(`Exam ${n}`);
      setDraftNameGu(`પરીક્ષા ${n}`);
      setDraftSplit(100, 80, 20);
      setDraftComputerOnly(false);
      setDraftFinal(false);
    }
    setAddOpen(true);
  };

  const confirmAdd = () => {
    const labelEn = draftName.trim();
    if (!labelEn) {
      toast.warning(t("examsHub.addNameRequired"));
      return;
    }
    if (!splitValid) {
      toast.warning(t("examsHub.splitMismatch"));
      return;
    }
    setAddSaving(true);
    const key = draftFinal
      ? "final"
      : makeTermKey(labelEn, template.map((x) => x.key));
    const item: TemplateItem = {
      key,
      labelEn,
      labelGu: draftNameGu.trim() || labelEn,
      totalMax: Math.max(0, Number(draftTotalMax) || 0),
      maxMarks: Math.max(0, Number(draftMax) || 0),
      internalMax: Math.max(0, Number(draftInternalMax) || 0),
      role: draftFinal ? "final" : "component",
      subjectScope: draftComputerOnly ? "computer" : "all",
    };
    setTemplate((prev) => {
      const withoutFinal =
        draftFinal ? prev.map((row) => (row.role === "final" ? { ...row, role: "component" as const } : row)) : prev;
      const filtered = withoutFinal.filter((row) => row.key !== key);
      const finalIdx = filtered.findIndex((x) => x.role === "final");
      if (item.role === "final" || finalIdx < 0) return [...filtered, item];
      const next = [...filtered];
      next.splice(finalIdx, 0, item);
      return next;
    });
    setAddOpen(false);
    setAddSaving(false);
    toast.success(t("examsHub.examAdded"));
    if (selected.size > 0) {
      setPickedKey(key);
      setDraftName(item.labelEn);
      setDraftNameGu(item.labelGu);
      setDraftComputerOnly(Boolean(item.subjectScope === "computer"));
      setDraftFinal(item.role === "final");
      setDraftSplit(item.totalMax, item.maxMarks, item.internalMax ?? 0);
      setWizardStep("marks");
      setCreateOpen(true);
    }
  };

  const pickExamType = (item: TemplateItem) => {
    setPickedKey(item.key);
    setAddingType(false);
    setDraftName(item.labelEn);
    setDraftNameGu(item.labelGu);
    setDraftComputerOnly(isComputerItem(item));
    setDraftFinal(item.role === "final");
    setDraftSplit(item.totalMax, item.maxMarks, item.internalMax ?? 0);
    setWizardStep("marks");
  };

  const startNewTypeInWizard = () => {
    setAddingType(true);
    setPickedKey(null);
    setDraftName("");
    setDraftNameGu("");
    setDraftComputerOnly(false);
    setDraftFinal(false);
    setDraftSplit(100, 80, 20);
    setWizardStep("type");
  };

  const confirmNewTypeThenMarks = () => {
    const labelEn = draftName.trim();
    if (!labelEn) {
      toast.warning(t("examsHub.addNameRequired"));
      return;
    }
    const key = draftFinal ? "final" : makeTermKey(labelEn, template.map((x) => x.key));
    const item: TemplateItem = {
      key,
      labelEn,
      labelGu: draftNameGu.trim() || labelEn,
      totalMax: draftTotalMax,
      maxMarks: draftMax,
      internalMax: draftInternalMax,
      role: draftFinal ? "final" : "component",
      subjectScope: draftComputerOnly ? "computer" : "all",
    };
    setTemplate((prev) => {
      const withoutFinal = draftFinal
        ? prev.map((row) => (row.role === "final" ? { ...row, role: "component" as const } : row))
        : prev;
      const filtered = withoutFinal.filter((row) => row.key !== key);
      return [...filtered, item];
    });
    setPickedKey(key);
    setAddingType(false);
    setWizardStep("marks");
    toast.success(t("examsHub.typeAdded"));
  };

  const confirmDelete = () => {
    if (!deleteKey) return;
    const target = template.find((x) => x.key === deleteKey);
    if (!target) {
      setDeleteKey(null);
      return;
    }
    if (template.length <= 1) {
      toast.warning("ઓછામાં ઓછી એક પરીક્ષા હોવી જ જોઈએ");
      setDeleteKey(null);
      return;
    }
    const nextTemplate = template.filter((x) => x.key !== deleteKey);
    const hasFinal = nextTemplate.some((x) => x.role === "final");
    if (!hasFinal) {
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

  const setAsFinal = (key: string) => {
    setTemplate((prev) =>
      prev.map((item) => {
        if (item.key === key) return { ...item, role: "final" };
        if (item.role === "final") return { ...item, role: "component" };
        return item;
      }),
    );
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
        error instanceof Error ? error.message : t("examsHub.templateSaveFailed"),
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const createExam = async () => {
    const item = template.find((row) => row.key === pickedKey);
    if (!selected.size) {
      toast.error(t("examsHub.selectClassHint"));
      return;
    }
    if (!item) {
      toast.error(t("examsHub.needTypeFirst"));
      return;
    }
    if (!splitValid) {
      toast.error(t("examsHub.splitMismatch"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_exam",
          classIds: [...selected],
          examTerm: {
            ...item,
            labelEn: draftName.trim() || item.labelEn,
            labelGu: draftNameGu.trim() || item.labelGu,
            totalMax: draftTotalMax,
            maxMarks: draftMax,
            internalMax: draftInternalMax,
            role: draftFinal ? "final" : item.role,
            subjectScope: draftComputerOnly ? "computer" : item.subjectScope,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.push({
        title: t("examsHub.examCreated", { count: data.applied }),
        variant: "success",
        duration: 3200,
      });
      setCreateOpen(false);
      resetWizard();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("examsHub.applyFailed"));
    } finally {
      setSaving(false);
    }
  };

  const renderExamCard = (item: TemplateItem, label: string, canDelete: boolean) => {
    const isFinal = item.role === "final";
    const isComputer = isComputerItem(item);
    const itemSplitValid = item.maxMarks + (item.internalMax ?? 0) === item.totalMax;

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {label}
              </p>
              {isFinal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  <Star className="h-3 w-3" />
                  {t("examsHub.roleFinal")}
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
            {!isFinal && !isComputer && (
              <button
                type="button"
                title="આ પરીક્ષાને અંતિમ બનાવો"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition"
                onClick={() => setAsFinal(item.key)}
              >
                <Star className="h-3 w-3" />
                {t("examsHub.roleFinal")}
              </button>
            )}
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
        {!itemSplitValid && (
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
      <div className="subhub examhub">
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
              { id: "classes" as const, icon: GraduationCap, label: t("examsHub.tabClasses") },
              { id: "types" as const, icon: Layers, label: t("examsHub.tabTypes") },
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

        {tab === "classes" && (
          <div className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2 className="subhub__panel-title">{t("examsHub.classesTitle")}</h2>
                <p className="subhub__panel-desc">{t("examsHub.classesDesc")}</p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!selected.size}
                onClick={() => openCreate()}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("examsHub.createExam")}
              </Button>
            </div>

            <div className="space-y-4 p-3 sm:p-4">
              <div className="examhub-stats">
                <div className="examhub-stat examhub-stat--navy">
                  <strong>{classes.length}</strong>
                  <span>{t("examsHub.classesTitle")}</span>
                </div>
                <div className="examhub-stat examhub-stat--teal">
                  <strong>{selected.size}</strong>
                  <span>{t("examsHub.selectedClasses")}</span>
                </div>
                <div className="examhub-stat examhub-stat--sky">
                  <strong>{readyCount}</strong>
                  <span>{t("examsHub.filterReady")}</span>
                </div>
                <div className="examhub-stat examhub-stat--amber">
                  <strong>{emptyCount}</strong>
                  <span>{t("examsHub.filterEmpty")}</span>
                </div>
              </div>

              <div className="examhub-toolbar">
                <div className="examhub-toolbar__filters">
                  <Select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
                    hideEmptyOption
                  />
                  <div className="examhub-search relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder={t("examsHub.searchClass")}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="examhub-pills">
                  {(
                    [
                      { id: "all" as const, label: t("examsHub.filterAll") },
                      { id: "ready" as const, label: t("examsHub.filterReady") },
                      { id: "empty" as const, label: t("examsHub.filterEmpty") },
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      className={cn("examhub-pill", classFilter === pill.id && "examhub-pill--on")}
                      onClick={() => setClassFilter(pill.id)}
                    >
                      {pill.label}
                    </button>
                  ))}
                  <button type="button" className="examhub-pill" onClick={toggleAll}>
                    <CheckSquare className="h-3.5 w-3.5" />
                    {selected.size === filteredClasses.length && filteredClasses.length > 0
                      ? t("examsHub.unselectAll")
                      : t("examsHub.selectAll")}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Spinner />
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="examhub-empty">
                  <GraduationCap className="h-8 w-8 text-slate-300" />
                  <p>{t("examsHub.noClasses")}</p>
                </div>
              ) : (
                <div className="examhub-grid">
                  {filteredClasses.map((row) => {
                    const checked = selected.has(row.id);
                    const terms = row.termsList || [];
                    const general = terms.filter((x) => x.subjectScope !== "computer");
                    const computers = terms.filter((x) => x.subjectScope === "computer");
                    return (
                      <div
                        key={row.id}
                        className={cn("examhub-card", checked && "examhub-card--on")}
                        onClick={() => toggleClass(row.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleClass(row.id);
                          }
                        }}
                      >
                        <div className="examhub-card__top">
                          <input
                            type="checkbox"
                            className="examhub-card__check"
                            checked={checked}
                            onChange={() => toggleClass(row.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="examhub-card__mark">{row.standard}</span>
                          <div className="examhub-card__copy">
                            <strong>{row.name}</strong>
                            <span>
                              {row.standard}-{row.section}
                              {row.stream ? ` · ${row.stream}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="examhub-card__meta">
                          <span className="examhub-chip examhub-chip--count">
                            <Users className="h-3 w-3" />
                            {t("examsHub.studentsCount", { count: row._count.students })}
                          </span>
                          {general.length === 0 && computers.length === 0 ? (
                            <span className="examhub-chip examhub-chip--empty">
                              {t("examsHub.noExamYet")}
                            </span>
                          ) : (
                            <>
                              {general.map((term) => (
                                <span
                                  key={term.key}
                                  className={cn(
                                    "examhub-chip",
                                    term.role === "final" ? "examhub-chip--final" : "examhub-chip--exam",
                                  )}
                                >
                                  {term.role === "final" && <Star className="h-2.5 w-2.5" />}
                                  {term.labelGu || term.labelEn}
                                  <span className="opacity-70">({term.totalMax})</span>
                                </span>
                              ))}
                              {computers.map((term) => (
                                <span key={term.key} className="examhub-chip examhub-chip--comp">
                                  <Monitor className="h-2.5 w-2.5" />
                                  {term.labelGu || term.labelEn}
                                  <span className="opacity-70">({term.totalMax})</span>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="examhub-card__go"
                          title={t("examsHub.createForClass")}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreate([row.id]);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selected.size > 0 && (
              <div className="examhub-dock">
                <div>
                  <p>{t("examsHub.selectedCount", { count: selected.size })}</p>
                  <span>{t("examsHub.dockHint")}</span>
                </div>
                <div className="examhub-dock__actions">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                    {t("examsHub.unselectAll")}
                  </Button>
                  <Button type="button" size="sm" onClick={() => openCreate()}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("examsHub.createExam")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "types" && (
          <div className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2 className="subhub__panel-title">{t("examsHub.typesTitle")}</h2>
                <p className="subhub__panel-desc">{t("examsHub.typesDesc")}</p>
              </div>
              <div className="subhub__actions">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={templateSaving || hasInvalidSplit || !hasEnoughExams}
                  onClick={() => void saveTemplate()}
                >
                  {templateSaving ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                  {templateSaving ? t("common.saving") : t("examsHub.saveTemplate")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openAdd(false)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("examsHub.addExam")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openAdd(true)}>
                  <Monitor className="h-3.5 w-3.5" />
                  {t("examsHub.addComputerExam")}
                </Button>
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {t("examsHub.subjectExamsTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{t("examsHub.subjectExamsDesc")}</p>
              </div>

              {generalItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p>{t("examsHub.emptyTypes")}</p>
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
                  return renderExamCard(item, label, generalItems.length > 1);
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
                </div>
              )}

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
                  <Button type="button" variant="outline" size="sm" onClick={() => openAdd(true)}>
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
                    renderExamCard(item, `${t("examsHub.computerExam")} ${idx + 1}`, true),
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <InfoModal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title={t("examsHub.createExamTitle")}
        eyebrow={t("examsHub.selectedCount", { count: selected.size })}
        wide
      >
        <div className="examhub-wizard">
          <div className="examhub-steps">
            <div
              className={cn(
                "examhub-step",
                wizardStep === "type" && "examhub-step--on",
                wizardStep === "marks" && "examhub-step--done",
              )}
            >
              <b>1</b>
              <span>{t("examsHub.wizardStepType")}</span>
            </div>
            <div className={cn("examhub-step", wizardStep === "marks" && "examhub-step--on")}>
              <b>2</b>
              <span>{t("examsHub.wizardStepMarks")}</span>
            </div>
          </div>

          <div className="examhub-selected">
            {selectedClasses.slice(0, 6).map((row) => (
              <em key={row.id}>{row.name}</em>
            ))}
            {selectedClasses.length > 6 && <em>+{selectedClasses.length - 6}</em>}
          </div>

          {wizardStep === "type" && (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t("examsHub.pickExamType")}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t("examsHub.pickExamTypeHint")}</p>
              </div>

              {template.length === 0 && !addingType ? (
                <div className="examhub-empty">
                  <p>{t("examsHub.emptyTypes")}</p>
                </div>
              ) : (
                <div className="examhub-types">
                  {template.map((item) => {
                    const computer = isComputerItem(item);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={cn(
                          "examhub-type",
                          item.role === "final" && "examhub-type--final",
                          computer && "examhub-type--comp",
                          pickedKey === item.key && "examhub-type--on",
                        )}
                        onClick={() => pickExamType(item)}
                      >
                        <span className="examhub-type__icon">
                          {computer ? (
                            <Monitor className="h-4 w-4" />
                          ) : item.role === "final" ? (
                            <Star className="h-4 w-4" />
                          ) : (
                            <BookOpenCheck className="h-4 w-4" />
                          )}
                        </span>
                        <span className="examhub-type__copy">
                          <strong>{item.labelGu || item.labelEn}</strong>
                          <span>{item.labelEn}</span>
                          <span className="examhub-type__marks">
                            {t("examsHub.paperTeacherTotal", {
                              paper: item.maxMarks,
                              internal: item.internalMax ?? 0,
                              total: item.totalMax,
                            })}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {addingType ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm text-slate-600">{t("examsHub.newTypeHint")}</p>
                  <Input
                    label={t("examsHub.labelEn")}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. First Exam"
                  />
                  <Input
                    label={t("examsHub.labelGu")}
                    value={draftNameGu}
                    onChange={(e) => setDraftNameGu(e.target.value)}
                    placeholder="દા.ત. પ્રથમ પરીક્ષા"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draftFinal}
                      onChange={(e) => {
                        setDraftFinal(e.target.checked);
                        if (e.target.checked) setDraftComputerOnly(false);
                      }}
                    />
                    {t("examsHub.makeFinal")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draftComputerOnly}
                      disabled={draftFinal}
                      onChange={(e) => setDraftComputerOnly(e.target.checked)}
                    />
                    {t("examsHub.computerType")}
                  </label>
                </div>
              ) : (
                <button type="button" className="examhub-add-type" onClick={startNewTypeInWizard}>
                  <Plus className="mr-1 inline h-4 w-4" />
                  {t("examsHub.addExamType")}
                </button>
              )}

              <div className="subhub__modal-actions">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                {addingType ? (
                  <Button type="button" onClick={confirmNewTypeThenMarks} disabled={!draftName.trim()}>
                    {t("common.next")}
                  </Button>
                ) : (
                  <Button type="button" disabled={!pickedKey} onClick={() => setWizardStep("marks")}>
                    {t("common.next")}
                  </Button>
                )}
              </div>
            </>
          )}

          {wizardStep === "marks" && (
            <div className="examhub-marks">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {draftNameGu || draftName || pickedItem?.labelGu || pickedItem?.labelEn}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{t("examsHub.marksStepHint")}</p>
              </div>

              {alreadyOnCount > 0 && (
                <p className="examhub-ok">{t("examsHub.updatingExisting")}</p>
              )}

              <Input
                label={t("examsHub.totalOutOf")}
                type="number"
                min={0}
                value={draftTotalMax}
                onChange={(e) => {
                  const total = Math.max(0, Number(e.target.value) || 0);
                  setDraftSplit(total, draftMax, total - draftMax);
                }}
              />

              <div
                className="examhub-split"
                aria-hidden="true"
              >
                <div className="examhub-split__paper" style={{ width: `${Math.max(paperPct, 8)}%` }}>
                  {t("examsHub.paperShare", { marks: draftMax })}
                </div>
                <div
                  className="examhub-split__internal"
                  style={{ width: `${Math.max(100 - paperPct, 8)}%` }}
                >
                  {t("examsHub.internalShare", { marks: draftInternalMax })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={t("examsHub.paperOutOf")}
                  type="number"
                  min={0}
                  value={draftMax}
                  onChange={(e) => {
                    const paper = Math.max(0, Number(e.target.value) || 0);
                    setDraftSplit(draftTotalMax, paper, draftTotalMax - paper);
                  }}
                />
                <Input
                  label={t("examsHub.teacherOutOf")}
                  type="number"
                  min={0}
                  value={draftInternalMax}
                  onChange={(e) => {
                    const internal = Math.max(0, Number(e.target.value) || 0);
                    setDraftSplit(draftTotalMax, draftTotalMax - internal, internal);
                  }}
                />
              </div>

              {splitValid ? (
                <p className="examhub-ok">
                  {t("examsHub.marksPreview", {
                    paper: draftMax,
                    internal: draftInternalMax,
                    total: draftTotalMax,
                  })}
                </p>
              ) : (
                <p className="examhub-warn">
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
                  onClick={() => setWizardStep("type")}
                  disabled={saving}
                >
                  {t("common.back")}
                </Button>
                <Button
                  type="button"
                  onClick={() => void createExam()}
                  disabled={saving || !splitValid || !pickedKey}
                >
                  {saving ? <Spinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
                  {t("examsHub.createAndApply")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </InfoModal>

      <InfoModal
        isOpen={addOpen}
        onClose={() => !addSaving && setAddOpen(false)}
        title={draftComputerOnly ? t("examsHub.addComputerExam") : t("examsHub.addExamType")}
      >
        <div className="subhub__modal-form space-y-3">
          <p className="text-sm text-slate-600">
            {draftComputerOnly ? t("examsHub.addComputerHint") : t("examsHub.addExamHint")}
          </p>
          <Input
            label={t("examsHub.labelEn")}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={draftComputerOnly ? "e.g. Computer Exam 1" : "e.g. First Exam"}
          />
          <Input
            label={t("examsHub.labelGu")}
            value={draftNameGu}
            onChange={(e) => setDraftNameGu(e.target.value)}
            placeholder={draftComputerOnly ? "દા.ત. કોમ્પ્યુટર પરીક્ષા 1" : "દા.ત. પ્રથમ પરીક્ષા"}
          />
          {!draftComputerOnly && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draftFinal}
                onChange={(e) => setDraftFinal(e.target.checked)}
              />
              {t("examsHub.makeFinal")}
            </label>
          )}
          <Input
            label={t("examsHub.totalOutOf")}
            type="number"
            min={0}
            value={draftTotalMax}
            onChange={(e) => {
              const total = Math.max(0, Number(e.target.value) || 0);
              setDraftSplit(total, draftMax, total - draftMax);
            }}
          />
          <Input
            label={t("examsHub.paperOutOf")}
            type="number"
            min={0}
            value={draftMax}
            onChange={(e) => {
              const paper = Math.max(0, Number(e.target.value) || 0);
              setDraftSplit(draftTotalMax, paper, draftTotalMax - paper);
            }}
          />
          <Input
            label={t("examsHub.teacherOutOf")}
            type="number"
            min={0}
            value={draftInternalMax}
            onChange={(e) => {
              const internal = Math.max(0, Number(e.target.value) || 0);
              setDraftSplit(draftTotalMax, draftTotalMax - internal, internal);
            }}
          />
          {draftComputerOnly && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              {t("examsHub.computerOnlyHint")}
            </p>
          )}
          {!splitValid && (
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
            <Button type="button" onClick={confirmAdd} disabled={addSaving || !splitValid}>
              {addSaving ? <Spinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
              {draftComputerOnly ? t("examsHub.addComputerExam") : t("examsHub.addExam")}
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
