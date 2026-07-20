"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BookOpen, Loader2, Search, UserPlus, UserCheck } from "lucide-react";
import type { SchoolClass, Student } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

type GrLookupResult = {
  found: boolean;
  source: "student" | "gr_entry" | "both" | null;
  student: Student | null;
  suggested: Partial<Student>;
};

type GrSetupPanelProps = {
  classes: SchoolClass[];
  classId: string;
  grNumber: string;
  locked: boolean;
  studentId?: string;
  onClassChange: (classId: string) => void;
  onGrNumberChange: (gr: string) => void;
  onReady: (result: {
    studentId?: string;
    suggested: Partial<Student>;
    source: GrLookupResult["source"];
    isNew: boolean;
  }) => void;
};

export function GrSetupPanel({
  classes,
  classId,
  grNumber,
  locked,
  studentId,
  onClassChange,
  onGrNumberChange,
  onReady,
}: GrSetupPanelProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "new" | "existing" | "gr_only">("idle");
  const [error, setError] = useState("");

  const loadGr = async () => {
    const gr = grNumber.trim();
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
        academicYear: cls?.academicYear || "2025-26",
      });
      const lookupRes = await fetch(`/api/students/lookup-gr?${params}`);
      const lookup = (await lookupRes.json()) as GrLookupResult & { error?: string };
      if (!lookupRes.ok) throw new Error(lookup.error || "Lookup failed");

      let id = lookup.student?.id || studentId;

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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studentForm.grLoadFailed"));
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{t("studentForm.grSetupTitle")}</h3>
          <p className="mt-0.5 text-xs text-slate-600">{t("studentForm.grSetupDesc")}</p>
        </div>
        {locked && studentId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <UserCheck className="h-3 w-3" />
            GR {grNumber}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_auto]">
        <Select
          label={t("fields.assignClass")}
          emptyLabel={t("common.selectClass")}
          options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` }))}
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
          disabled={locked}
        />
        <Input
          label={t("fields.grNumber")}
          required
          value={grNumber}
          onChange={(e) => onGrNumberChange(e.target.value)}
          placeholder="e.g. 6604"
          disabled={locked}
        />
        <div className="flex items-end">
          <Button
            type="button"
            className="h-10 w-full sm:w-auto"
            onClick={loadGr}
            disabled={loading || locked}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : locked ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {locked ? t("studentForm.grLoaded") : t("studentForm.grLoadBtn")}
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      {status === "existing" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
          <UserCheck className="h-3.5 w-3.5" />
          {t("studentForm.grFoundStudent")}
        </p>
      )}
      {status === "gr_only" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
          <BookOpen className="h-3.5 w-3.5" />
          {t("studentForm.grFoundRegister")}
        </p>
      )}
      {status === "new" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-indigo-700">
          <UserPlus className="h-3.5 w-3.5" />
          {t("studentForm.grNewStarted")}
        </p>
      )}

      {!locked && (
        <p className={cn("mt-2 text-[11px] text-slate-500")}>{t("studentForm.grSetupHint")}</p>
      )}
    </div>
  );
}
