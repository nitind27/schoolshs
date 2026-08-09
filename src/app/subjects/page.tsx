"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Layers,
  Plus,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loader";
import { InfoModal } from "@/components/ui/info-modal";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import "./subjects-hub.css";

type TabId = "master" | "classes";

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
  _count: { classSubjects: number; students: number };
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

function mapMaster(rows: MasterRow[]): MasterRow[] {
  return (rows || []).map((s, i) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    shortName: s.shortName || "",
    type: s.type === "grade" ? "grade" : "numeric",
    maxMarks: s.maxMarks ?? 100,
    sortOrder: s.sortOrder ?? i,
    isActive: s.isActive !== false,
  }));
}

export default function SubjectsHubPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("master");

  // Step 1 — master
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterSaving, setMasterSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [draft, setDraft] = useState<MasterRow>(() => emptyMaster(0));
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Step 2 — by class
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classId, setClassId] = useState("");
  const [classSubjectsLoading, setClassSubjectsLoading] = useState(false);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [classSaving, setClassSaving] = useState(false);
  const [classSearch, setClassSearch] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);

  const loadMaster = useCallback(async () => {
    setMasterLoading(true);
    try {
      const res = await fetch("/api/subjects?view=master", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMaster(mapMaster(data.subjects || []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.loadFailed"));
    } finally {
      setMasterLoading(false);
    }
  }, [t]);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await fetch("/api/subjects?view=classes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClasses(data.classes || []);
      if (data.subjects) setMaster(mapMaster(data.subjects));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.loadFailed"));
    } finally {
      setClassesLoading(false);
    }
  }, [t]);

  const loadClassSubjects = useCallback(
    async (id: string) => {
      if (!id) {
        setAssignedIds([]);
        return;
      }
      setClassSubjectsLoading(true);
      try {
        const res = await fetch(`/api/classes/${id}/subjects?seed=0`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        const classRows = (data.subjects || []) as Array<{
          code: string;
          isActive?: boolean;
          sortOrder?: number;
        }>;
        const active = classRows
          .filter((s) => s.isActive !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Match class subjects to master by code (preferred) then name
        const byCode = new Map(
          master.filter((m) => m.id).map((m) => [m.code.toUpperCase(), m.id!]),
        );

        const ids: string[] = [];
        for (const row of active) {
          const idFromCode = byCode.get(String(row.code || "").toUpperCase());
          if (idFromCode && !ids.includes(idFromCode)) {
            ids.push(idFromCode);
          }
        }
        setAssignedIds(ids);
      } catch (e) {
        setAssignedIds([]);
        toast.error(e instanceof Error ? e.message : t("subjectsHub.loadFailed"));
      } finally {
        setClassSubjectsLoading(false);
      }
    },
    [master, t],
  );

  useEffect(() => {
    void loadMaster();
  }, [loadMaster]);

  useEffect(() => {
    if (tab === "classes") void loadClasses();
  }, [tab, loadClasses]);

  useEffect(() => {
    if (tab !== "classes" || !classId) return;
    void loadClassSubjects(classId);
    // Only reload when class changes — not when master list updates mid-edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, classId]);

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

  const persistMaster = async (next: MasterRow[], successTitle: string) => {
    setMasterSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_master", subjects: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMaster(mapMaster(data.subjects || []));
      toast.push({ title: successTitle, variant: "success", duration: 2800 });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
      return false;
    } finally {
      setMasterSaving(false);
    }
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
    const ok = await persistMaster(
      next,
      editIndex != null
        ? t("subjectsHub.modalUpdated")
        : t("subjectsHub.modalAdded"),
    );
    setAddSaving(false);
    if (ok) closeAddModal();
  };

  const confirmDeleteSubject = async () => {
    if (deleteIndex == null) return;
    const next = master
      .filter((_, idx) => idx !== deleteIndex)
      .map((r, idx) => ({ ...r, sortOrder: idx }));
    setDeleteSaving(true);
    const ok = await persistMaster(next, t("subjectsHub.deleteDone"));
    setDeleteSaving(false);
    if (ok) setDeleteIndex(null);
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
    await persistMaster(master, t("subjectsHub.masterSaved"));
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

  const assignedOrdered = useMemo(() => {
    const byId = new Map(master.filter((s) => s.id).map((s) => [s.id!, s]));
    return assignedIds.map((id) => byId.get(id)).filter(Boolean) as MasterRow[];
  }, [assignedIds, master]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) =>
      [c.name, c.standard, c.section, c.stream, c.academicYear]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [classes, classSearch]);

  const saveClassSubjects = async () => {
    if (!classId || !selectedClass) return;
    if (!assignedOrdered.length) {
      toast.warning(t("subjectsHub.pickAtLeastOne"));
      return;
    }
    setClassSaving(true);
    try {
      const payload = assignedOrdered.map((s, i) => ({
        name: s.name,
        code: s.code,
        shortName: s.shortName || s.name.slice(0, 2),
        type: s.type,
        maxMarks: s.type === "grade" ? 0 : s.maxMarks || 100,
        sortOrder: i,
        isActive: true,
      }));
      const res = await fetch(`/api/classes/${classId}/subjects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: payload, syncExam: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                _count: {
                  ...c._count,
                  classSubjects: payload.length,
                },
              }
            : c,
        ),
      );

      toast.push({
        title: t("subjectsHub.classSaved"),
        description: t("subjectsHub.classSavedDesc", {
          class: selectedClass.name,
          count: payload.length,
        }),
        variant: "success",
        duration: 3500,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subjectsHub.saveFailed"));
    } finally {
      setClassSaving(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof BookMarked }[] = [
    { id: "master", label: t("subjectsHub.tabMaster"), icon: BookMarked },
    { id: "classes", label: t("subjectsHub.tabClasses"), icon: Layers },
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
                {master.length > 0 ? (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => setTab("classes")}
                  >
                    {t("subjectsHub.goClasses")}
                  </Button>
                ) : null}
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

        {tab === "classes" && (
          <section className="subhub__panel">
            <div className="subhub__panel-head">
              <div>
                <h2>{t("subjectsHub.classesStepTitle")}</h2>
                <p>{t("subjectsHub.classesStepDesc")}</p>
              </div>
            </div>

            {master.filter((s) => s.id && s.isActive !== false).length === 0 ? (
              <div className="subhub__empty">
                <p>{t("subjectsHub.needMasterFirst")}</p>
                <Button type="button" size="sm" onClick={() => setTab("master")}>
                  {t("subjectsHub.tabMaster")}
                </Button>
              </div>
            ) : classesLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : !classId ? (
              <div className="subhub__class-pick">
                <div className="subhub__class-pick-head">
                  <div>
                    <h3>{t("subjectsHub.pickClassTitle")}</h3>
                    <p>{t("subjectsHub.pickClassHint")}</p>
                  </div>
                  <Input
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder={t("subjectsHub.searchClass")}
                    className="max-w-xs"
                  />
                </div>

                {filteredClasses.length === 0 ? (
                  <div className="subhub__empty subhub__empty--sm">
                    <p>{t("subjectsHub.noClasses")}</p>
                  </div>
                ) : (
                  <div className="subhub__class-grid">
                    {filteredClasses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="subhub__class-card subhub__class-card--btn"
                        onClick={() => setClassId(c.id)}
                      >
                        <div>
                          <strong>{c.name}</strong>
                          <span>
                            Std {c.standard}
                            {c.stream ? ` · ${c.stream}` : ""} · {c.academicYear}
                          </span>
                        </div>
                        <small>
                          {t("subjectsHub.classSubjectCount", {
                            count: c._count.classSubjects,
                          })}
                          {" · "}
                          {c._count.students} {t("subjectsHub.studentsShort")}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="subhub__class-assign">
                <div className="subhub__class-assign-bar">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setClassId("");
                      setAssignedIds([]);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t("subjectsHub.backToClasses")}
                  </Button>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {selectedClass?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("subjectsHub.assignForClass", {
                        count: assignedOrdered.length,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={classSaving || classSubjectsLoading}
                    onClick={() => void saveClassSubjects()}
                  >
                    {classSaving ? (
                      <Spinner size="sm" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {t("subjectsHub.saveClassSubjects")}
                  </Button>
                </div>

                {classSubjectsLoading ? (
                  <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <div className="subhub__split">
                    <div className="subhub__col">
                      <h3>{t("subjectsHub.pickSubjects")}</h3>
                      <p className="subhub__hint">
                        {t("subjectsHub.pickSubjectsForClass")}
                      </p>
                      <div className="subhub__checklist">
                        {master
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
                    </div>

                    <div className="subhub__col">
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
                      <div className="subhub__actions subhub__actions--end mt-4">
                        <Button
                          type="button"
                          disabled={classSaving}
                          onClick={() => void saveClassSubjects()}
                        >
                          {classSaving ? (
                            <Spinner size="sm" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {t("subjectsHub.saveClassSubjects")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
