"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { InfoModal } from "@/components/ui/info-modal";
import { useT } from "@/i18n/locale-provider";
import {
  SCHOOL_STANDARDS,
  SENIOR_STREAMS,
  FINANCIAL_YEARS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import "./subjects-hub.css";

type TabId = "master" | "standard" | "apply";

type MasterRow = {
  id?: string;
  name: string;
  code: string;
  shortName: string;
  type: "numeric" | "grade";
  maxMarks: number;
  sortOrder: number;
  isActive: boolean;
};

type ClassRow = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
  _count: { classSubjects: number };
};

function emptyMaster(order: number): MasterRow {
  return {
    name: "",
    code: "",
    shortName: "",
    type: "numeric",
    maxMarks: 100,
    sortOrder: order,
    isActive: true,
  };
}

export default function SubjectsHubPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("master");

  // Master
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterSaving, setMasterSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [draft, setDraft] = useState<MasterRow>(() => emptyMaster(0));
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Standard assign
  const [standard, setStandard] = useState("9");
  const [stream, setStream] = useState("");
  const [allSubjects, setAllSubjects] = useState<MasterRow[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [stdLoading, setStdLoading] = useState(false);
  const [stdSaving, setStdSaving] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  // Apply
  const [academicYear, setAcademicYear] = useState<string>("2025-26");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  const needsStream = ["11", "12"].includes(standard);

  const loadMaster = useCallback(
    async (seed = false) => {
      setMasterLoading(true);
      try {
        const res = await fetch(
          `/api/subjects?view=master${seed ? "&seed=1" : ""}`,
          {
            cache: "no-store",
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMaster(
          (data.subjects || []).map((s: MasterRow, i: number) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            shortName: s.shortName || "",
            type: s.type === "grade" ? "grade" : "numeric",
            maxMarks: s.maxMarks ?? 100,
            sortOrder: s.sortOrder ?? i,
            isActive: s.isActive !== false,
          })),
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : t("subjectsHub.loadFailed"),
        );
      } finally {
        setMasterLoading(false);
      }
    },
    [t],
  );

  const loadStandard = useCallback(async () => {
    setStdLoading(true);
    try {
      const params = new URLSearchParams({
        view: "standard",
        standard,
        academicYear,
      });
      if (needsStream && stream) params.set("stream", stream);
      const res = await fetch(`/api/subjects?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAllSubjects(
        (data.subjects || []).map((s: MasterRow) => ({
          ...s,
          type: s.type === "grade" ? "grade" : "numeric",
        })),
      );
      setAssignedIds(data.assignedIds || []);
      setClasses(data.classes || []);
      setSelectedClassIds((data.classes || []).map((c: ClassRow) => c.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.loadFailed"));
    } finally {
      setStdLoading(false);
    }
  }, [standard, stream, needsStream, academicYear, t]);

  useEffect(() => {
    void loadMaster();
  }, [loadMaster]);

  useEffect(() => {
    if (tab === "standard" || tab === "apply") void loadStandard();
  }, [tab, loadStandard]);

  useEffect(() => {
    if (needsStream && !stream) setStream("Arts");
    if (!needsStream) setStream("");
  }, [needsStream, stream]);

  const openAddModal = () => {
    setEditIndex(null);
    setDraft(emptyMaster(master.length));
    setAddOpen(true);
  };

  const openEditModal = (index: number) => {
    const row = master[index];
    if (!row) return;
    setEditIndex(index);
    setDraft({ ...row });
    setAddOpen(true);
  };

  const closeAddModal = () => {
    setAddOpen(false);
    setEditIndex(null);
    setDraft(emptyMaster(0));
  };

  const updateMaster = (index: number, patch: Partial<MasterRow>) => {
    setMaster((rows) => {
      const next = [...rows];
      next[index] = { ...next[index]!, ...patch };
      if (patch.type === "grade") next[index]!.maxMarks = 0;
      if (patch.type === "numeric" && next[index]!.maxMarks === 0) {
        next[index]!.maxMarks = 100;
      }
      if (patch.name && !next[index]!.code) {
        next[index]!.code = patch.name
          .slice(0, 6)
          .toUpperCase()
          .replace(/\s+/g, "_");
      }
      return next;
    });
  };

  const submitAddModal = async () => {
    const name = draft.name.trim();
    const code = draft.code.trim().toUpperCase().replace(/\s+/g, "_");
    if (!name || !code) {
      toast.warning(t("subjectsHub.modalRequired"));
      return;
    }
    const dup = master.some(
      (s, i) => s.code.toUpperCase() === code && i !== editIndex,
    );
    if (dup) {
      toast.warning(t("subjectsHub.modalDuplicateCode"));
      return;
    }

    const row: MasterRow = {
      ...draft,
      name,
      code,
      shortName: (draft.shortName || name.slice(0, 2)).trim(),
      type: draft.type === "grade" ? "grade" : "numeric",
      maxMarks:
        draft.type === "grade" ? 0 : Math.max(0, Number(draft.maxMarks) || 100),
      isActive: true,
      sortOrder: editIndex != null ? draft.sortOrder : master.length,
    };

    const next =
      editIndex != null
        ? master.map((r, i) => (i === editIndex ? row : r))
        : [...master, row];

    setAddSaving(true);
    setMasterSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_master", subjects: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMaster(
        (data.subjects || []).map((s: MasterRow, i: number) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          shortName: s.shortName || "",
          type: s.type === "grade" ? "grade" : "numeric",
          maxMarks: s.maxMarks ?? 100,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive !== false,
        })),
      );
      toast.push({
        title:
          editIndex != null
            ? t("subjectsHub.modalUpdated")
            : t("subjectsHub.modalAdded"),
        variant: "success",
        duration: 2800,
      });
      closeAddModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setAddSaving(false);
      setMasterSaving(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (deleteIndex == null) return;
    const next = master
      .filter((_, idx) => idx !== deleteIndex)
      .map((r, idx) => ({ ...r, sortOrder: idx }));
    setDeleteSaving(true);
    setMasterSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_master", subjects: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMaster(
        (data.subjects || []).map((s: MasterRow, i: number) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          shortName: s.shortName || "",
          type: s.type === "grade" ? "grade" : "numeric",
          maxMarks: s.maxMarks ?? 100,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive !== false,
        })),
      );
      setDeleteIndex(null);
      toast.push({
        title: t("subjectsHub.deleteDone"),
        variant: "success",
        duration: 2800,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setDeleteSaving(false);
      setMasterSaving(false);
    }
  };

  const updateDraft = (patch: Partial<MasterRow>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.type === "grade") next.maxMarks = 0;
      if (patch.type === "numeric" && next.maxMarks === 0) next.maxMarks = 100;
      if (patch.name && !prev.code) {
        next.code = patch.name.slice(0, 6).toUpperCase().replace(/\s+/g, "_");
      }
      if (patch.name && !prev.shortName) {
        next.shortName = patch.name.slice(0, 2);
      }
      return next;
    });
  };

  const saveMaster = async () => {
    setMasterSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_master", subjects: master }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMaster(
        (data.subjects || []).map((s: MasterRow, i: number) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          shortName: s.shortName || "",
          type: s.type === "grade" ? "grade" : "numeric",
          maxMarks: s.maxMarks ?? 100,
          sortOrder: s.sortOrder ?? i,
          isActive: s.isActive !== false,
        })),
      );
      toast.push({
        title: t("subjectsHub.masterSaved"),
        variant: "success",
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setMasterSaving(false);
    }
  };

  const toggleAssigned = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const moveAssigned = (id: string, dir: -1 | 1) => {
    setAssignedIds((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  };

  const saveStandard = async () => {
    setStdSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_standard",
          standard,
          stream: needsStream ? stream : "",
          subjectIds: assignedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.push({
        title: t("subjectsHub.standardSaved"),
        description: t("subjectsHub.standardSavedDesc", {
          count: data.count || 0,
        }),
        variant: "success",
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setStdSaving(false);
    }
  };

  const applyToClasses = async () => {
    if (!selectedClassIds.length) {
      toast.warning(t("subjectsHub.pickClasses"));
      return;
    }
    setApplying(true);
    try {
      // Save standard assignment first so apply uses latest
      await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_standard",
          standard,
          stream: needsStream ? stream : "",
          subjectIds: assignedIds,
        }),
      });
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_to_classes",
          standard,
          stream: needsStream ? stream : "",
          academicYear,
          classIds: selectedClassIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.push({
        title: t("subjectsHub.applied"),
        description: t("subjectsHub.appliedDesc", {
          classes: data.applied || 0,
          subjects: data.subjectCount || 0,
        }),
        variant: "success",
        duration: 4000,
      });
      await loadStandard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setApplying(false);
    }
  };

  const assignedOrdered = useMemo(() => {
    const byId = new Map(
      allSubjects.filter((s) => s.id).map((s) => [s.id!, s]),
    );
    return assignedIds.map((id) => byId.get(id)).filter(Boolean) as MasterRow[];
  }, [assignedIds, allSubjects]);

  const tabs: { id: TabId; label: string; icon: typeof BookMarked }[] = [
    { id: "master", label: t("subjectsHub.tabMaster"), icon: BookMarked },
    { id: "standard", label: t("subjectsHub.tabStandard"), icon: Layers },
    { id: "apply", label: t("subjectsHub.tabApply"), icon: Upload },
  ];

  return (
    <PageShell
      title={t("subjectsHub.title")}
      subtitle={t("subjectsHub.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("subjectsHub.title") },
      ]}
      icon={<BookMarked className="h-5 w-5" />}
    >
      <div className="subhub">
        <div className="subhub__intro">
          <p>{t("subjectsHub.intro")}</p>
          <ol>
            <li>{t("subjectsHub.step1")}</li>
            <li>{t("subjectsHub.step2")}</li>
            <li>{t("subjectsHub.step3")}</li>
          </ol>
        </div>

        <div className="subhub__tabs" role="tablist">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              className={cn(
                "subhub__tab",
                tab === tb.id && "subhub__tab--active",
              )}
              onClick={() => setTab(tb.id)}
            >
              <tb.icon className="h-4 w-4" />
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "master" && (
          <section className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2>{t("subjectsHub.masterTitle")}</h2>
                <p>{t("subjectsHub.masterDesc")}</p>
              </div>
              <div className="subhub__actions">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={openAddModal}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("subjectsHub.addSubject")}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={masterSaving}
                  onClick={() => void saveMaster()}
                >
                  {masterSaving ? (
                    <Spinner size="sm" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
            </div>

            {masterLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : master.length === 0 ? (
              <div className="subhub__empty">
                <BookMarked className="h-10 w-10 opacity-30" />
                <p>{t("subjectsHub.masterEmpty")}</p>
                <div className="subhub__actions">
                  <Button type="button" onClick={openAddModal}>
                    <Plus className="h-4 w-4" />
                    {t("subjectsHub.addSubject")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="subhub__table-wrap">
                <table className="subhub__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t("subjectsHub.colName")}</th>
                      <th>{t("subjectsHub.colCode")}</th>
                      <th>{t("subjectsHub.colShort")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {master.map((row, i) => (
                      <tr key={row.id || `new-${i}`}>
                        <td className="subhub__num" data-label="#">
                          {i + 1}
                        </td>
                        <td data-label={t("subjectsHub.colName")}>
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateMaster(i, { name: e.target.value })
                            }
                            placeholder={t("subjectsHub.namePh")}
                          />
                        </td>
                        <td data-label={t("subjectsHub.colCode")}>
                          <Input
                            value={row.code}
                            onChange={(e) =>
                              updateMaster(i, { code: e.target.value })
                            }
                            className="font-mono"
                          />
                        </td>
                        <td data-label={t("subjectsHub.colShort")}>
                          <Input
                            value={row.shortName}
                            onChange={(e) =>
                              updateMaster(i, { shortName: e.target.value })
                            }
                          />
                        </td>
                        <td
                          className="subhub__row-actions-cell"
                          data-label={t("common.actions")}
                        >
                          <div className="subhub__row-btns">
                            <button
                              type="button"
                              className="subhub__icon-btn"
                              title={t("common.edit")}
                              onClick={() => openEditModal(i)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="subhub__icon-btn"
                              disabled={i === 0}
                              onClick={() => {
                                setMaster((rows) => {
                                  const next = [...rows];
                                  const tmp = next[i]!;
                                  next[i] = next[i - 1]!;
                                  next[i - 1] = tmp;
                                  return next.map((r, idx) => ({
                                    ...r,
                                    sortOrder: idx,
                                  }));
                                });
                              }}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="subhub__icon-btn"
                              disabled={i === master.length - 1}
                              onClick={() => {
                                setMaster((rows) => {
                                  const next = [...rows];
                                  const tmp = next[i]!;
                                  next[i] = next[i + 1]!;
                                  next[i + 1] = tmp;
                                  return next.map((r, idx) => ({
                                    ...r,
                                    sortOrder: idx,
                                  }));
                                });
                              }}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="subhub__icon-btn subhub__icon-btn--danger"
                              onClick={() => setDeleteIndex(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {(tab === "standard" || tab === "apply") && (
          <section className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2>
                  {tab === "standard"
                    ? t("subjectsHub.standardTitle")
                    : t("subjectsHub.applyTitle")}
                </h2>
                <p>
                  {tab === "standard"
                    ? t("subjectsHub.standardDesc")
                    : t("subjectsHub.applyDesc")}
                </p>
              </div>
              <div className="subhub__filters">
                <Select
                  label={t("classes.standard")}
                  hideEmptyOption
                  options={SCHOOL_STANDARDS.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                />
                {needsStream ? (
                  <Select
                    label={t("classes.stream")}
                    hideEmptyOption
                    options={SENIOR_STREAMS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    value={stream || "Arts"}
                    onChange={(e) => setStream(e.target.value)}
                  />
                ) : null}
                {tab === "apply" ? (
                  <Select
                    label={t("classes.academicYear")}
                    hideEmptyOption
                    options={FINANCIAL_YEARS.map((y) => ({
                      value: y,
                      label: y,
                    }))}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="self-end"
                  onClick={() => void loadStandard()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("common.filter")}
                </Button>
              </div>
            </div>

            {stdLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="subhub__split">
                <div className="subhub__col">
                  {tab === "standard" ? (
                    <>
                      <h3>{t("subjectsHub.pickSubjects")}</h3>
                      <p className="subhub__hint">
                        {t("subjectsHub.pickSubjectsHint")}
                      </p>
                      {allSubjects.length === 0 ? (
                        <div className="subhub__empty subhub__empty--sm">
                          <p>{t("subjectsHub.needMasterFirst")}</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setTab("master")}
                          >
                            {t("subjectsHub.tabMaster")}
                          </Button>
                        </div>
                      ) : (
                        <div className="subhub__checklist">
                          {allSubjects
                            .filter((s) => s.id && s.isActive !== false)
                            .map((s) => {
                              const on = assignedIds.includes(s.id!);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={cn(
                                    "subhub__check",
                                    on && "subhub__check--on",
                                  )}
                                  onClick={() => toggleAssigned(s.id!)}
                                >
                                  <CheckSquare
                                    className={cn(
                                      "h-4 w-4",
                                      on ? "opacity-100" : "opacity-30",
                                    )}
                                  />
                                  <span className="subhub__check-body">
                                    <span className="subhub__check-name">
                                      {s.name}
                                    </span>
                                    <span className="subhub__check-meta">
                                      {s.code}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                      <div className="subhub__actions subhub__actions--end">
                        <Button
                          type="button"
                          disabled={stdSaving}
                          onClick={() => void saveStandard()}
                        >
                          {stdSaving ? (
                            <Spinner size="sm" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {t("subjectsHub.saveStandard")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="subhub__apply-package">
                      <div className="subhub__apply-package-head">
                        <div className="subhub__apply-package-icon">
                          <BookMarked className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="subhub__eyebrow">
                            {t("subjectsHub.packageReady")}
                          </span>
                          <h3>
                            {t("classes.standard")} {standard}
                            {needsStream && stream ? ` · ${stream}` : ""}
                          </h3>
                          <p>
                            {t("subjectsHub.packageSummary", {
                              count: assignedOrdered.length,
                            })}
                          </p>
                        </div>
                      </div>

                      {assignedOrdered.length === 0 ? (
                        <div className="subhub__empty subhub__empty--sm">
                          <p>{t("subjectsHub.noneAssigned")}</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setTab("standard")}
                          >
                            {t("subjectsHub.tabStandard")}
                          </Button>
                        </div>
                      ) : (
                        <div className="subhub__subject-chips">
                          {assignedOrdered.map((subject, index) => (
                            <div
                              key={subject.id}
                              className="subhub__subject-chip"
                            >
                              <span>{index + 1}</span>
                              <div>
                                <strong>{subject.name}</strong>
                                <small>{subject.code}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="subhub__col">
                  {tab === "standard" ? (
                    <>
                      <h3>
                        {t("subjectsHub.assignedOrder")}{" "}
                        <span className="subhub__count">
                          {assignedOrdered.length}
                        </span>
                      </h3>
                      <p className="subhub__hint">
                        {t("subjectsHub.assignedOrderHint")}
                      </p>
                      {assignedOrdered.length === 0 ? (
                        <p className="subhub__muted">
                          {t("subjectsHub.noneAssigned")}
                        </p>
                      ) : (
                        <ul className="subhub__order-list">
                          {assignedOrdered.map((s, i) => (
                            <li key={s.id}>
                              <span className="subhub__order-idx">{i + 1}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-slate-900">
                                  {s.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {s.code}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="subhub__icon-btn"
                                disabled={i === 0}
                                onClick={() => moveAssigned(s.id!, -1)}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="subhub__icon-btn"
                                disabled={i === assignedOrdered.length - 1}
                                onClick={() => moveAssigned(s.id!, 1)}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <div className="subhub__apply-classes">
                      <div className="subhub__section-title">
                        <div>
                          <h3>{t("subjectsHub.classesTitle")}</h3>
                          <p>{t("subjectsHub.classesHint")}</p>
                        </div>
                        <span className="subhub__selection-count">
                          {t("subjectsHub.selectedClasses", {
                            selected: selectedClassIds.length,
                            total: classes.length,
                          })}
                        </span>
                      </div>

                      {classes.length === 0 ? (
                        <div className="subhub__empty subhub__empty--sm">
                          <p>{t("subjectsHub.noClasses")}</p>
                        </div>
                      ) : (
                        <>
                          <label className="subhub__select-all">
                            <input
                              type="checkbox"
                              checked={
                                classes.length > 0 &&
                                selectedClassIds.length === classes.length
                              }
                              onChange={(e) => {
                                setSelectedClassIds(
                                  e.target.checked
                                    ? classes.map((c) => c.id)
                                    : [],
                                );
                              }}
                            />
                            <span>{t("subjectsHub.selectAllClasses")}</span>
                          </label>

                          <div className="subhub__class-grid">
                            {classes.map((c) => {
                              const selected = selectedClassIds.includes(c.id);
                              return (
                                <label
                                  key={c.id}
                                  className={cn(
                                    "subhub__class-card",
                                    selected && "subhub__class-card--selected",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => {
                                      setSelectedClassIds((prev) =>
                                        e.target.checked
                                          ? [...prev, c.id]
                                          : prev.filter((id) => id !== c.id),
                                      );
                                    }}
                                  />
                                  <div>
                                    <strong>{c.name}</strong>
                                    <span>{c.academicYear}</span>
                                  </div>
                                  <small>
                                    {t("subjectsHub.classSubjectCount", {
                                      count: c._count.classSubjects,
                                    })}
                                  </small>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}

                      <div className="subhub__apply-footer">
                        <div>
                          <strong>{t("subjectsHub.readyToApply")}</strong>
                          <span>{t("subjectsHub.replaceWarning")}</span>
                        </div>
                        <Button
                          type="button"
                          size="lg"
                          disabled={
                            applying ||
                            !assignedOrdered.length ||
                            !selectedClassIds.length
                          }
                          onClick={() => void applyToClasses()}
                        >
                          {applying ? (
                            <Spinner size="sm" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {t("subjectsHub.applyBtn")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <InfoModal
        isOpen={addOpen}
        onClose={closeAddModal}
        title={
          editIndex != null
            ? t("subjectsHub.modalEditTitle")
            : t("subjectsHub.modalAddTitle")
        }
      >
        <div className="subhub__modal-form">
          <Input
            label={t("subjectsHub.colName")}
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder={t("subjectsHub.namePh")}
            required
            autoFocus
          />
          <div className="subhub__modal-grid">
            <Input
              label={t("subjectsHub.colCode")}
              value={draft.code}
              onChange={(e) => updateDraft({ code: e.target.value })}
              className="font-mono"
              required
            />
            <Input
              label={t("subjectsHub.colShort")}
              value={draft.shortName}
              onChange={(e) => updateDraft({ shortName: e.target.value })}
            />
          </div>
          <p className="subhub__modal-hint">{t("subjectsHub.modalHint")}</p>
          <div className="subhub__modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={closeAddModal}
              disabled={addSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitAddModal()}
              disabled={addSaving}
            >
              {addSaving ? (
                <Spinner size="sm" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {editIndex != null
                ? t("common.save")
                : t("subjectsHub.addSubject")}
            </Button>
          </div>
        </div>
      </InfoModal>

      <InfoModal
        isOpen={deleteIndex != null}
        onClose={() => !deleteSaving && setDeleteIndex(null)}
        title={t("subjectsHub.deleteTitle")}
      >
        <div className="subhub__modal-form">
          <p className="text-sm text-slate-700">
            {t("subjectsHub.deleteConfirm", {
              name:
                deleteIndex != null ? master[deleteIndex]?.name || "—" : "—",
              code: deleteIndex != null ? master[deleteIndex]?.code || "" : "",
            })}
          </p>
          <p className="subhub__modal-hint">{t("subjectsHub.deleteHint")}</p>
          <div className="subhub__modal-actions">
            <Button
              type="button"
              variant="outline"
              disabled={deleteSaving}
              onClick={() => setDeleteIndex(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSaving}
              onClick={() => void confirmDeleteSubject()}
            >
              {deleteSaving ? (
                <Spinner size="sm" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </InfoModal>
    </PageShell>
  );
}
