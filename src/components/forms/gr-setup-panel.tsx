"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BookOpen, Pencil, Search, UserPlus, UserCheck, GraduationCap, ListOrdered } from "lucide-react";
import type { SchoolClass, Student } from "@/generated/prisma/client";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";

type GrLookupResult = {
  found: boolean;
  source: "student" | "gr_entry" | "both" | null;
  student: Student | null;
  suggested: Partial<Student>;
};

type ClassGrOption = {
  grNumber: string;
  studentId: string | null;
  name: string;
  source: "student" | "gr_entry" | "both";
  status?: string | null;
};

type GrSetupPanelProps = {
  classes: SchoolClass[];
  academicYear: string;
  classId: string;
  grNumber: string;
  locked: boolean;
  studentId?: string;
  onAcademicYearChange: (year: string) => void;
  onClassChange: (classId: string) => void;
  onGrNumberChange: (gr: string) => void;
  onUnlockEdit: () => void;
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

export function GrSetupPanel({
  classes,
  academicYear,
  classId,
  grNumber,
  locked,
  studentId,
  onAcademicYearChange,
  onClassChange,
  onGrNumberChange,
  onUnlockEdit,
  onReady,
}: GrSetupPanelProps) {
  const t = useT();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [grOptions, setGrOptions] = useState<ClassGrOption[]>([]);
  const [selectedExistingGr, setSelectedExistingGr] = useState("");
  const [status, setStatus] = useState<"idle" | "new" | "existing" | "gr_only">("idle");
  const [error, setError] = useState("");

  const yearClasses = useMemo(
    () => classes.filter((c) => c.academicYear === academicYear),
    [classes, academicYear],
  );

  const loadGrList = useCallback(async (cid: string) => {
    if (!cid) {
      setGrOptions([]);
      return;
    }
    setListLoading(true);
    try {
      const res = await fetch(`/api/students/gr-list?classId=${encodeURIComponent(cid)}`);
      const data = await res.json();
      setGrOptions(Array.isArray(data.grs) ? data.grs : []);
    } catch {
      setGrOptions([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locked) return;
    setSelectedExistingGr("");
    void loadGrList(classId);
  }, [classId, locked, loadGrList]);

  useEffect(() => {
    if (!locked || !grNumber) return;
    setSelectedExistingGr(grNumber);
  }, [locked, grNumber]);

  const loadGr = async (grOverride?: string) => {
    const gr = (grOverride ?? grNumber).trim();
    if (!gr) {
      setError(t("studentForm.grRequired"));
      return;
    }
    if (!classId) {
      setError(t("studentForm.classRequiredForGr"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const cls = classes.find((c) => c.id === classId);
      const params = new URLSearchParams({
        grNumber: gr,
        classId,
        academicYear: cls?.academicYear || academicYear || "2025-26",
      });
      const lookupRes = await fetch(`/api/students/lookup-gr?${params}`);
      const lookup = (await lookupRes.json()) as GrLookupResult & { error?: string };
      if (!lookupRes.ok) throw new Error(lookup.error || "Lookup failed");

      let id = lookup.student?.id || studentId;
      onGrNumberChange(gr);

      if (!id) {
        const draftRes = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: true,
            grNumber: gr,
            classId,
            ...lookup.suggested,
          }),
        });
        if (!draftRes.ok) {
          const err = await draftRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Failed to start record");
        }
        const created = (await draftRes.json()) as Student;
        id = created.id;
        setStatus("new");
        onReady({
          studentId: id,
          suggested: { ...lookup.suggested, ...created, grNumber: gr, classId },
          source: lookup.source,
          isNew: true,
        });
      } else {
        setStatus(lookup.source === "gr_entry" && !lookup.student ? "gr_only" : "existing");
        onReady({
          studentId: id,
          suggested: lookup.suggested,
          source: lookup.source,
          isNew: false,
        });
      }
      void loadGrList(classId);
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
    setStatus("idle");
    setError("");
  };

  const handleClassChange = (id: string) => {
    onClassChange(id);
    onGrNumberChange("");
    setSelectedExistingGr("");
    setStatus("idle");
    setError("");
  };

  const existingOptions = grOptions.map((g) => ({
    value: g.grNumber,
    label:
      g.name && g.name !== "—"
        ? `GR ${g.grNumber} — ${g.name}`
        : `GR ${g.grNumber}`,
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">{t("studentForm.grSetupTitle")}</h3>
            <p className="mt-0.5 text-xs text-slate-600">{t("studentForm.grSetupDesc")}</p>
          </div>
        </div>
        {locked && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {studentId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <UserCheck className="h-3 w-3" />
                GR {grNumber}
              </span>
            )}
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onUnlockEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Step 1–2: Year + Class */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {t("studentForm.grStepFilters")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              emptyLabel={t("common.selectClass")}
              options={yearClasses.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={classId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={locked || !academicYear}
              required
            />
          </div>
          {!locked && academicYear && yearClasses.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">{t("studentForm.grNoClassesForYear")}</p>
          )}
        </div>

        {!locked && classId && (
          <>
            {/* Mode switch */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("existing");
                  setError("");
                }}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  mode === "existing"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                {t("studentForm.grModeExisting")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("new");
                  setSelectedExistingGr("");
                  setError("");
                }}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  mode === "new"
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("studentForm.grModeNew")}
              </button>
            </div>

            {mode === "existing" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {t("studentForm.grExistingTitle")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {listLoading
                        ? t("studentForm.grListLoading")
                        : t("studentForm.grExistingDesc", { count: grOptions.length })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <Select
                    label={t("studentForm.grPickExisting")}
                    emptyLabel={
                      listLoading
                        ? t("studentForm.grListLoading")
                        : grOptions.length === 0
                          ? t("studentForm.grNoneInClass")
                          : t("studentForm.grPickExistingEmpty")
                    }
                    options={existingOptions}
                    value={selectedExistingGr}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedExistingGr(v);
                      if (v) {
                        onGrNumberChange(v);
                        void loadGr(v);
                      }
                    }}
                    disabled={listLoading || grOptions.length === 0}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="h-10 w-full sm:w-auto"
                      onClick={() => loadGr(selectedExistingGr)}
                      disabled={loading || !selectedExistingGr}
                    >
                      {loading ? (
                        <Spinner size="sm" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {t("studentForm.grOpenExisting")}
                    </Button>
                  </div>
                </div>
                {!listLoading && grOptions.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">{t("studentForm.grNoneHint")}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-teal-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {t("studentForm.grNewTitle")}
                    </p>
                    <p className="text-[11px] text-slate-500">{t("studentForm.grNewDesc")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    label={t("fields.grNumber")}
                    required
                    value={grNumber}
                    onChange={(e) => onGrNumberChange(e.target.value)}
                    placeholder={t("studentForm.grNewPlaceholder")}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="h-10 w-full bg-teal-700 hover:bg-teal-800 sm:w-auto"
                      onClick={() => loadGr()}
                      disabled={loading || !grNumber.trim()}
                    >
                      {loading ? (
                        <Spinner size="sm" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {t("studentForm.grStartNew")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!locked && !classId && academicYear && yearClasses.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t("studentForm.grSelectClassNext")}
          </p>
        )}

        {locked && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("fields.financialYear")}
              </p>
              <p className="text-sm font-semibold text-slate-800">{academicYear}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("fields.assignClass")}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {classes.find((c) => c.id === classId)?.name || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("fields.grNumber")}
              </p>
              <p className="text-sm font-semibold text-slate-800">{grNumber || "—"}</p>
            </div>
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
          <p className="text-[11px] text-slate-500">{t("studentForm.grLockedEditHint")}</p>
        ) : (
          <p className="text-[11px] text-slate-500">{t("studentForm.grSetupHint")}</p>
        )}
      </div>
    </div>
  );
}
