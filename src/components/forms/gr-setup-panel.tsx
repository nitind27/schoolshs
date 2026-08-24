"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Check,
  Pencil,
  Search,
  UserPlus,
  UserCheck,
  GraduationCap,
  ListOrdered,
  X,
} from "lucide-react";
import type { SchoolClass, Student } from "@/generated/prisma/client";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";
import "./gr-picker.css";

type GrLookupResult = {
  found: boolean;
  source: "student" | "gr_entry" | "both" | null;
  student: Student | null;
  students?: Student[];
  suggested: Partial<Student>;
};

type ClassGrOption = {
  grNumber: string;
  studentId: string | null;
  name: string;
  source: "student" | "gr_entry" | "both";
  status?: string | null;
  standard?: string | null;
  section?: string | null;
  className?: string | null;
  classLabel?: string;
};

type GrConflict = {
  studentId: string;
  grNumber: string;
  name: string;
  classLabel: string;
};

type GrSetupPanelProps = {
  classes: SchoolClass[];
  academicYear: string;
  classId: string;
  grNumber: string;
  locked: boolean;
  studentId?: string;
  /** New student: hide class at start — assign later. Edit: show class. */
  deferClassAssignment?: boolean;
  onAcademicYearChange: (year: string) => void;
  onClassChange: (classId: string) => void;
  onGrNumberChange: (gr: string) => void;
  onUnlockEdit: () => void;
  /** Clear selected GR / student so user can pick another or switch to new */
  onClearSelection?: () => void;
  onReady: (result: {
    studentId?: string;
    suggested: Partial<Student>;
    source: GrLookupResult["source"];
    isNew: boolean;
  }) => void;
};

const YEAR_OPTIONS = Array.from(
  new Set([...FINANCIAL_YEARS, "2026-27", "2025-26", "2024-25", "2023-24"]),
);

function displayStudentName(
  s: { firstName?: string | null; middleName?: string | null; surname?: string | null },
  fallback?: string,
) {
  const name = [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ");
  return name || fallback || "";
}

function classLabelFromOption(g: ClassGrOption) {
  if (g.classLabel) return g.classLabel;
  if (g.className) return g.className;
  const std = String(g.standard || "").trim();
  const sec = String(g.section || "").trim();
  if (std && sec) return `${std}-${sec}`;
  if (std) return std;
  return "—";
}

function isBlankName(name: string | null | undefined) {
  const n = String(name || "").trim();
  return !n || n === "—" || n === "-" || n === "— —" || /^[—\-\s]+$/.test(n);
}

export function GrSetupPanel({
  classes,
  academicYear,
  classId,
  grNumber,
  locked,
  studentId,
  deferClassAssignment = false,
  onAcademicYearChange,
  onClassChange,
  onGrNumberChange,
  onUnlockEdit,
  onClearSelection,
  onReady,
}: GrSetupPanelProps) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(
    deferClassAssignment ? "new" : "existing",
  );
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [grOptions, setGrOptions] = useState<ClassGrOption[]>([]);
  const [selectedExistingGr, setSelectedExistingGr] = useState("");
  const [status, setStatus] = useState<"idle" | "new" | "existing" | "gr_only">("idle");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<GrConflict | null>(null);
  const [changingGr, setChangingGr] = useState(false);
  const [changeGrValue, setChangeGrValue] = useState("");
  const [changeChecking, setChangeChecking] = useState(false);
  const [changeConflicts, setChangeConflicts] = useState<GrConflict[]>([]);
  const [grSearch, setGrSearch] = useState("");
  const [grClassFilter, setGrClassFilter] = useState("");
  const [grMenuOpen, setGrMenuOpen] = useState(false);
  const grComboRef = useRef<HTMLDivElement>(null);

  const yearClasses = useMemo(
    () => classes.filter((c) => c.academicYear === academicYear),
    [classes, academicYear],
  );

  const canOpenGr = deferClassAssignment
    ? Boolean(academicYear)
    : Boolean(classId);

  const resolveClassLabel = useCallback(
    (student: Student | null | undefined, fromList?: ClassGrOption) => {
      if (fromList) {
        const label = classLabelFromOption(fromList);
        if (label && label !== "—") return label;
      }
      if (student?.classId) {
        const cls = classes.find((c) => c.id === student.classId);
        if (cls?.name) return cls.name;
      }
      const std = String(student?.standard || "").trim();
      const sec = String(student?.section || "").trim();
      if (std && sec) return `${std}-${sec}`;
      if (std) return std;
      return "—";
    },
    [classes],
  );

  const buildConflict = useCallback(
    (gr: string, student: Student, fromList?: ClassGrOption): GrConflict => ({
      studentId: student.id,
      grNumber: gr,
      name:
        displayStudentName(student) ||
        (fromList?.name && fromList.name !== "—" ? fromList.name : "") ||
        t("studentForm.grUnknownStudent"),
      classLabel: resolveClassLabel(student, fromList),
    }),
    [resolveClassLabel, t],
  );

  const buildConflictFromList = useCallback(
    (gr: string, fromList: ClassGrOption): GrConflict | null => {
      if (!fromList.studentId) return null;
      return {
        studentId: fromList.studentId,
        grNumber: gr,
        name:
          fromList.name && fromList.name !== "—"
            ? fromList.name
            : t("studentForm.grUnknownStudent"),
        classLabel: classLabelFromOption(fromList),
      };
    },
    [t],
  );

  const loadGrList = useCallback(
    async (opts: { classId?: string; academicYear?: string }) => {
      const params = new URLSearchParams();
      if (opts.classId) params.set("classId", opts.classId);
      else if (opts.academicYear) params.set("academicYear", opts.academicYear);
      else {
        setGrOptions([]);
        return;
      }
      setListLoading(true);
      try {
        const res = await fetch(`/api/students/gr-list?${params}`);
        const data = await res.json();
        setGrOptions(Array.isArray(data.grs) ? data.grs : []);
      } catch {
        setGrOptions([]);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (locked) return;
    setSelectedExistingGr("");
    if (deferClassAssignment) {
      if (classId) void loadGrList({ classId });
      else if (academicYear) void loadGrList({ academicYear });
      else setGrOptions([]);
    } else {
      void loadGrList({ classId });
    }
  }, [classId, academicYear, locked, deferClassAssignment, loadGrList]);

  useEffect(() => {
    if (!locked || !grNumber) return;
    setSelectedExistingGr(grNumber);
  }, [locked, grNumber]);

  const goEditConflict = (id?: string) => {
    const target = id || conflict?.studentId;
    if (!target) return;
    router.push(`/students/${target}/edit`);
  };

  const loadGr = async (grOverride?: string) => {
    const gr = (grOverride ?? grNumber).trim();
    if (!gr) {
      setError(t("studentForm.grRequired"));
      return;
    }
    if (deferClassAssignment) {
      if (!academicYear) {
        setError(t("studentForm.yearRequiredForGr"));
        return;
      }
    } else if (!classId) {
      setError(t("studentForm.classRequiredForGr"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const cls = classId ? classes.find((c) => c.id === classId) : undefined;
      const params = new URLSearchParams({
        grNumber: gr,
        academicYear: cls?.academicYear || academicYear || "2025-26",
      });
      if (classId) params.set("classId", classId);

      const lookupRes = await fetch(`/api/students/lookup-gr?${params}`);
      const lookup = (await lookupRes.json()) as GrLookupResult & { error?: string };
      if (!lookupRes.ok) throw new Error(lookup.error || "Lookup failed");

      // New mode: GR already belongs to a student — warn, do not draft / onReady
      if (mode === "new" && (lookup.students?.length || lookup.student?.id)) {
        const first = lookup.students?.[0] || lookup.student;
        if (first?.id) {
          const fromList = grOptions.find(
            (g) => g.grNumber.trim() === gr && g.studentId === first.id,
          );
          setConflict(buildConflict(gr, first, fromList));
          onGrNumberChange(gr);
          setStatus("idle");
          return;
        }
      }

      let id = lookup.student?.id || studentId;
      onGrNumberChange(gr);

      if (!id) {
        const draftBody: Record<string, unknown> = {
          draft: true,
          grNumber: gr,
          financialYear: cls?.academicYear || academicYear || "2025-26",
          ...lookup.suggested,
        };
        if (classId) draftBody.classId = classId;
        else if (deferClassAssignment) draftBody.classId = null;

        const draftRes = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftBody),
        });
        if (!draftRes.ok) {
          const err = await draftRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Failed to start record");
        }
        const created = (await draftRes.json()) as Student;
        id = created.id;
        setConflict(null);
        setStatus("new");
        onReady({
          studentId: id,
          suggested: {
            ...lookup.suggested,
            ...created,
            grNumber: gr,
            classId: classId || null,
          },
          source: lookup.source,
          isNew: true,
        });
      } else {
        setConflict(null);
        setStatus(lookup.source === "gr_entry" && !lookup.student ? "gr_only" : "existing");
        const suggested = { ...lookup.suggested };
        if (deferClassAssignment && !lookup.student?.classId) {
          suggested.classId = (classId || null) as unknown as string;
        }
        onReady({
          studentId: id,
          suggested,
          source: lookup.source,
          isNew: false,
        });
      }
      if (deferClassAssignment) void loadGrList({ academicYear });
      else void loadGrList({ classId });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studentForm.grLoadFailed"));
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year: string) => {
    onAcademicYearChange(year);
    onClassChange("");
    onGrNumberChange("");
    setSelectedExistingGr("");
    setGrOptions([]);
    setGrSearch("");
    setGrClassFilter("");
    setGrMenuOpen(false);
    setStatus("idle");
    setError("");
    setConflict(null);
  };

  const handleClassChange = (id: string) => {
    onClassChange(id);
    onGrNumberChange("");
    setSelectedExistingGr("");
    setGrSearch("");
    setGrClassFilter("");
    setGrMenuOpen(false);
    setStatus("idle");
    setError("");
    setConflict(null);
  };

  useEffect(() => {
    if (!grMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!grComboRef.current?.contains(e.target as Node)) setGrMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGrMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [grMenuOpen]);

  const clearLocalSelection = () => {
    setSelectedExistingGr("");
    setStatus("idle");
    setError("");
    setConflict(null);
    setGrSearch("");
    setGrMenuOpen(false);
    onGrNumberChange("");
  };

  const handleClear = () => {
    clearLocalSelection();
    setGrClassFilter("");
    setChangingGr(false);
    setChangeConflicts([]);
    onClearSelection?.();
  };

  const startChangeGr = () => {
    setChangingGr(true);
    setChangeGrValue(grNumber);
    setChangeConflicts([]);
    setError("");
  };

  const cancelChangeGr = () => {
    setChangingGr(false);
    setChangeGrValue(grNumber);
    setChangeConflicts([]);
    setError("");
  };

  const applyChangeGr = () => {
    const next = changeGrValue.trim();
    if (!next) {
      setError(t("studentForm.grRequired"));
      return;
    }
    if (changeConflicts.length) return;
    if (next === grNumber.trim()) {
      cancelChangeGr();
      return;
    }
    onGrNumberChange(next);
    setChangingGr(false);
    setChangeConflicts([]);
  };

  useEffect(() => {
    if (!changingGr) return;
    const next = changeGrValue.trim();
    if (!next || next === grNumber.trim()) {
      setChangeConflicts([]);
      setChangeChecking(false);
      return;
    }
    const timer = setTimeout(async () => {
      setChangeChecking(true);
      try {
        const params = new URLSearchParams({
          grNumber: next,
          academicYear: academicYear || "2025-26",
        });
        if (studentId) params.set("excludeStudentId", studentId);
        const res = await fetch(`/api/students/lookup-gr?${params}`);
        const lookup = (await res.json()) as GrLookupResult;
        const others = (
          lookup.students?.length ? lookup.students : lookup.student ? [lookup.student] : []
        ).filter((s) => s.id && s.id !== studentId);
        setChangeConflicts(
          others.map((s) => {
            const fromList = grOptions.find((g) => g.studentId === s.id);
            return buildConflict(next, s, fromList);
          }),
        );
      } catch {
        setChangeConflicts([]);
      } finally {
        setChangeChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    changingGr,
    changeGrValue,
    grNumber,
    studentId,
    academicYear,
    grOptions,
    buildConflict,
  ]);

  const handleTryDifferentGr = () => {
    setConflict(null);
    setError("");
    setStatus("idle");
    onGrNumberChange("");
  };

  const formatGrOptionLabel = useCallback((g: ClassGrOption) => {
    const std = String(g.standard || "").trim();
    const sec = String(g.section || "").trim();
    const fromLabel = g.classLabel?.includes("-") ? g.classLabel.split("-") : null;
    const classStd = std || fromLabel?.[0]?.trim() || "";
    const classSec = sec || fromLabel?.[1]?.trim() || "";
    const bracket =
      classStd && classSec
        ? `[${classStd}-${classSec}]`
        : classStd
          ? `[${classStd}]`
          : g.classLabel
            ? `[${g.classLabel}]`
            : g.className
              ? `[${g.className}]`
              : "";
    const namePart = g.name && g.name !== "—" ? g.name : "";
    let label = `GR ${g.grNumber}`;
    if (namePart && bracket) label = `GR ${g.grNumber} — ${namePart} ${bracket}`;
    else if (namePart) label = `GR ${g.grNumber} — ${namePart}`;
    else if (bracket) label = `GR ${g.grNumber} ${bracket}`;
    return label;
  }, []);

  const grClassFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grOptions) {
      const label = classLabelFromOption(g);
      if (label && label !== "—") map.set(label, label);
    }
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [grOptions]);

  const filteredGrOptions = useMemo(() => {
    const q = grSearch.trim().toLowerCase();
    return grOptions.filter((g) => {
      if (grClassFilter) {
        const label = classLabelFromOption(g);
        if (label !== grClassFilter) return false;
      }
      if (!q) return true;
      const hay = [
        g.grNumber,
        g.name,
        g.classLabel,
        g.className,
        g.standard,
        g.section,
        formatGrOptionLabel(g),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [grOptions, grSearch, grClassFilter, formatGrOptionLabel]);

  const pickExistingGr = (gr: string) => {
    setSelectedExistingGr(gr);
    onGrNumberChange(gr);
    setGrMenuOpen(false);
    setGrSearch("");
    void loadGr(gr);
  };

  const selectedGrOption = useMemo(
    () => grOptions.find((g) => g.grNumber === selectedExistingGr) || null,
    [grOptions, selectedExistingGr],
  );

  const conflictActive = mode === "new" && Boolean(conflict);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-tight text-slate-900">{t("studentForm.grSetupTitle")}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
              {t("studentForm.grSetupDesc")}
            </p>
          </div>
        </div>
        {locked && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {studentId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <UserCheck className="h-3 w-3" />
                GR {grNumber}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto min-h-11 gap-1 px-3 text-xs text-slate-700"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
              {t("studentForm.grClearSelection")}
            </Button>
            {studentId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-11 gap-1 px-3 text-xs"
                onClick={startChangeGr}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("studentForm.grChangeNumber")}
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-auto min-h-11 gap-1 px-3 text-xs" onClick={onUnlockEdit}>
                <Pencil className="h-3.5 w-3.5" />
                {t("common.edit")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 p-3 sm:p-3.5">
        {/* Step 1: Year (+ Class only in edit) */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            {deferClassAssignment
              ? t("studentForm.grStepFilters")
              : t("studentForm.grStepFiltersEdit")}
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Select
              label={t("fields.financialYear")}
              options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
              value={academicYear}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={locked}
              required
            />
            <Select
              label={t("fields.assignClass")}
              emptyLabel={
                deferClassAssignment
                  ? t("students.assignClassLater")
                  : t("common.selectClass")
              }
              options={yearClasses.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={locked || !academicYear}
              required={!deferClassAssignment}
            />
          </div>
          {!locked && academicYear && yearClasses.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-700">{t("studentForm.grNoClassesForYear")}</p>
          )}
          {deferClassAssignment && !locked ? (
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              {t("studentForm.classOptionalHint")}
            </p>
          ) : null}
        </div>

        {!locked && canOpenGr && (
          <>
            <div className="gr-mode-tabs">
              <button
                type="button"
                onClick={() => {
                  setMode("existing");
                  setError("");
                  setConflict(null);
                }}
                className="gr-mode-tab"
                data-active={mode === "existing" ? "true" : undefined}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                {t("studentForm.grModeExisting")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("new");
                  clearLocalSelection();
                  onClearSelection?.();
                }}
                className="gr-mode-tab"
                data-active={mode === "new" ? "true" : undefined}
                data-tone="teal"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("studentForm.grModeNew")}
              </button>
            </div>

            {mode === "existing" ? (
              <div className="gr-browse">
                <div className="gr-browse__head">
                  <div className="min-w-0">
                    <span className="gr-browse__badge">
                      <GraduationCap className="h-3 w-3" />
                      {academicYear}
                    </span>
                    <h4 className="gr-browse__title">
                      {deferClassAssignment
                        ? t("studentForm.grExistingTitle")
                        : t("studentForm.grExistingTitleClass")}
                    </h4>
                    <p className="gr-browse__sub">
                      {listLoading
                        ? t("studentForm.grListLoading")
                        : t("studentForm.grExistingFilteredDesc", {
                            shown: filteredGrOptions.length,
                            total: grOptions.length,
                          })}
                    </p>
                  </div>
                  <div className="gr-browse__count">
                    <span className="gr-browse__count-num">{filteredGrOptions.length}</span>
                    <span className="gr-browse__count-label">{t("studentForm.grBrowseCount")}</span>
                  </div>
                </div>

                <div className="gr-browse__tools">
                  <div className="gr-browse__picker" ref={grComboRef}>
                    <div className="gr-browse__row">
                      <div className="gr-field gr-field--class">
                        <label className="gr-field__label" htmlFor="gr-class-filter">
                          {t("studentForm.grFilterByClass")}
                        </label>
                        <Select
                          id="gr-class-filter"
                          emptyLabel={t("studentForm.grFilterAllClasses")}
                          options={grClassFilterOptions.map((c) => ({ value: c, label: c }))}
                          value={grClassFilter}
                          onChange={(e) => {
                            setGrClassFilter(e.target.value);
                            setSelectedExistingGr("");
                          }}
                          disabled={listLoading || grOptions.length === 0}
                          className="gr-field__control"
                        />
                      </div>

                      <div className="gr-field gr-field--gr gr-combo">
                        <label className="gr-field__label" htmlFor="gr-combo-trigger">
                          {t("studentForm.grPickExisting")}
                        </label>
                        <button
                          id="gr-combo-trigger"
                          type="button"
                          className="gr-combo__trigger gr-field__control"
                          aria-expanded={grMenuOpen}
                          aria-haspopup="listbox"
                          disabled={listLoading || grOptions.length === 0}
                          onClick={() => setGrMenuOpen((o) => !o)}
                        >
                          <span className="gr-combo__value" data-placeholder={!selectedExistingGr ? "true" : undefined}>
                            {selectedGrOption ? (
                              <>
                                <span className="gr-combo__gr">GR {selectedGrOption.grNumber}</span>
                                <span className="gr-combo__sep">·</span>
                                <span className="gr-combo__name">
                                  {isBlankName(selectedGrOption.name)
                                    ? t("studentForm.grUnnamedDraft")
                                    : selectedGrOption.name}
                                </span>
                              </>
                            ) : (
                              t("studentForm.grPickExistingEmpty")
                            )}
                          </span>
                          <ChevronDown
                            className={cn("gr-combo__chevron h-4 w-4", grMenuOpen && "gr-combo__chevron--open")}
                          />
                        </button>
                      </div>
                    </div>

                    {grMenuOpen && (
                      <div
                        className="gr-combo__menu"
                        role="listbox"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="gr-combo__search">
                          <Search className="gr-combo__search-icon h-4 w-4" />
                          <input
                            type="search"
                            value={grSearch}
                            onChange={(e) => setGrSearch(e.target.value)}
                            placeholder={t("studentForm.grSearchPlaceholder")}
                            autoComplete="off"
                            autoFocus
                          />
                        </div>
                        <div className="gr-combo__cols" aria-hidden>
                          <span>GR</span>
                          <span>{t("common.name")}</span>
                          <span>{t("fields.class")}</span>
                        </div>
                        <div className="gr-combo__list">
                          {listLoading ? (
                            <div className="gr-combo__empty">
                              <Spinner size="sm" />
                              <span>{t("studentForm.grListLoading")}</span>
                            </div>
                          ) : filteredGrOptions.length === 0 ? (
                            <div className="gr-combo__empty">
                              {grOptions.length === 0
                                ? t("studentForm.grNoneInClass")
                                : t("studentForm.grSearchNoMatch")}
                            </div>
                          ) : (
                            filteredGrOptions.map((g) => {
                              const active = selectedExistingGr === g.grNumber;
                              const displayName = isBlankName(g.name)
                                ? t("studentForm.grUnnamedDraft")
                                : g.name;
                              return (
                                <button
                                  key={g.grNumber}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  className="gr-combo__option"
                                  data-active={active ? "true" : undefined}
                                  onClick={() => pickExistingGr(g.grNumber)}
                                >
                                  <span className="gr-combo__opt-gr">{g.grNumber}</span>
                                  <span
                                    className="gr-combo__opt-name"
                                    data-empty={isBlankName(g.name) ? "true" : undefined}
                                  >
                                    {displayName}
                                  </span>
                                  <span className="gr-combo__opt-class">{classLabelFromOption(g)}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                        <div className="gr-combo__footer">
                          {t("studentForm.grExistingFilteredDesc", {
                            shown: filteredGrOptions.length,
                            total: grOptions.length,
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="gr-browse__actions">
                    <button
                      type="button"
                      className="gr-browse__open"
                      disabled={loading || !selectedExistingGr}
                      onClick={() => void loadGr(selectedExistingGr)}
                    >
                      {loading ? <Spinner size="sm" /> : <Pencil className="h-3.5 w-3.5" />}
                      {t("studentForm.grOpenExisting")}
                    </button>
                    <button
                      type="button"
                      className="gr-browse__ghost"
                      onClick={handleClear}
                      disabled={!selectedExistingGr && !grNumber && !grSearch && !grClassFilter}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("studentForm.grClearSelection")}
                    </button>
                  </div>
                </div>

                {!listLoading && grOptions.length === 0 && (
                  <p className="px-4 pb-3 text-[11px] text-slate-500">{t("studentForm.grNoneHint")}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-2.5 sm:p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserPlus className="h-4 w-4 shrink-0 text-teal-700" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-slate-800">
                        {t("studentForm.grNewTitle")}
                      </p>
                      <p className="text-[11px] text-slate-500">{t("studentForm.grNewDesc")}</p>
                    </div>
                  </div>
                  {grNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 px-2 text-xs"
                      onClick={handleClear}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("studentForm.grClearSelection")}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    label={t("fields.grNumber")}
                    required
                    value={grNumber}
                    onChange={(e) => {
                      setConflict(null);
                      setError("");
                      onGrNumberChange(e.target.value);
                    }}
                    placeholder={t("studentForm.grNewPlaceholder")}
                    aria-invalid={conflictActive}
                  />
                  <div className="flex items-end">
                    {conflictActive && conflict ? (
                      <Button
                        type="button"
                        className="h-10 w-full gap-1.5 bg-amber-600 hover:bg-amber-700 sm:w-auto"
                        onClick={() => goEditConflict(conflict.studentId)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("studentForm.grEditExisting")}
                        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="h-10 w-full cursor-pointer bg-teal-700 hover:bg-teal-800 sm:w-auto"
                        onClick={() => void loadGr()}
                        disabled={loading || !grNumber.trim()}
                      >
                        {loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        {t("studentForm.grStartNew")}
                      </Button>
                    )}
                  </div>
                </div>

                {conflictActive && conflict && (
                  <div
                    role="alert"
                    className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950"
                  >
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-tight">
                          {t("studentForm.grAlreadyExistsTitle", { gr: conflict.grNumber })}
                        </p>
                        <p className="text-[11px] font-medium text-amber-800">
                          {t("studentForm.grAlreadyExistsShort", { gr: conflict.grNumber })}
                        </p>
                        <p className="text-xs leading-snug text-amber-900/90">
                          {t("studentForm.grAlreadyExistsBody", {
                            name: conflict.name,
                            class: conflict.classLabel,
                          })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 bg-amber-600 px-2.5 text-xs hover:bg-amber-700"
                            onClick={() => goEditConflict(conflict.studentId)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("studentForm.grEditExisting")}
                            <ExternalLink className="h-3 w-3 opacity-80" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 border-amber-300 bg-white px-2.5 text-xs text-amber-900 hover:bg-amber-100"
                            onClick={handleTryDifferentGr}
                          >
                            {t("studentForm.grTryDifferent")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!locked && !canOpenGr && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
            {deferClassAssignment
              ? t("studentForm.grSelectYearNext")
              : t("studentForm.grSelectClassNext")}
          </p>
        )}

        {locked && (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("fields.financialYear")}
              </p>
              <p className="text-sm font-semibold text-slate-800">{academicYear}</p>
            </div>
            {!deferClassAssignment && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("fields.assignClass")}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {classes.find((c) => c.id === classId)?.name || "—"}
                </p>
              </div>
            )}
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("fields.grNumber")}
              </p>
              <p className="text-sm font-semibold text-slate-800">{grNumber || "—"}</p>
            </div>
          </div>
        )}

        {locked && changingGr && studentId && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3">
            <p className="text-sm font-semibold text-teal-950">{t("studentForm.grChangeTitle")}</p>
            <p className="mt-0.5 text-xs leading-snug text-teal-800/90">{t("studentForm.grChangeDesc")}</p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                label={t("fields.grNumber")}
                value={changeGrValue}
                onChange={(e) => setChangeGrValue(e.target.value)}
                placeholder={t("studentForm.grNewPlaceholder")}
                aria-invalid={changeConflicts.length > 0}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  className="h-10 w-full gap-1.5 bg-teal-700 hover:bg-teal-800 sm:w-auto"
                  onClick={applyChangeGr}
                  disabled={changeChecking || changeConflicts.length > 0 || !changeGrValue.trim()}
                >
                  {changeChecking ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
                  {t("studentForm.grChangeSave")}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full sm:w-auto"
                  onClick={cancelChangeGr}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
            {changeChecking ? (
              <p className="mt-2 text-xs text-teal-800">{t("studentForm.grListLoading")}</p>
            ) : changeConflicts.length > 0 ? (
              <div role="alert" className="mt-2.5 space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950">
                {changeConflicts.map((row) => (
                  <div key={row.studentId} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-tight">
                        {t("studentForm.grChangeTaken", { gr: row.grNumber })}
                      </p>
                      <p className="text-xs leading-snug text-amber-900/90">
                        {t("studentForm.grChangeTakenBody", {
                          name: row.name,
                          class: row.classLabel,
                        })}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 bg-amber-600 px-2.5 text-xs hover:bg-amber-700"
                        onClick={() => goEditConflict(row.studentId)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("studentForm.grEditExisting")}
                        <ExternalLink className="h-3 w-3 opacity-80" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : changeGrValue.trim() && changeGrValue.trim() !== grNumber.trim() ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">{t("studentForm.grChangeOk")}</p>
            ) : null}
          </div>
        )}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        {status === "existing" && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <UserCheck className="h-3.5 w-3.5" />
            {t("studentForm.grFoundStudent")}
          </p>
        )}
        {status === "gr_only" && (
          <p className="flex items-center gap-1.5 text-xs text-blue-700">
            <BookOpen className="h-3.5 w-3.5" />
            {t("studentForm.grFoundRegister")}
          </p>
        )}
        {status === "new" && (
          <p className="flex items-center gap-1.5 text-xs text-teal-700">
            <UserPlus className="h-3.5 w-3.5" />
            {t("studentForm.grNewStarted")}
          </p>
        )}

        {locked ? (
          <p className="text-[11px] leading-snug text-slate-500">{t("studentForm.grLockedEditHint")}</p>
        ) : (
          <p className="text-[11px] leading-snug text-slate-500">{t("studentForm.grSetupHint")}</p>
        )}
      </div>
    </div>
  );
}
