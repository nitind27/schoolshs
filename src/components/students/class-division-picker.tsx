"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { classGroupKey, uniqueClassGroups } from "@/lib/class-structure";
import { useT } from "@/i18n/locale-provider";

export type DivisionClass = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string | null;
  academicYear?: string | null;
  _count?: { students?: number };
};

function groupLabel(
  standard: string,
  stream: string | undefined,
  t: (key: string, params?: Record<string, string>) => string,
) {
  const base =
    standard === "Balvatika"
      ? t("classes.balvatika")
      : t("students.stdShort", { standard });
  if (["11", "12"].includes(standard) && stream) return `${base} — ${stream}`;
  return base;
}

export function ClassDivisionPicker({
  classes,
  classId,
  standard,
  stream,
  onSelectClass,
  onSelectStandard,
  allowLater = true,
  compact = false,
}: {
  classes: DivisionClass[];
  classId?: string | null;
  standard?: string | null;
  stream?: string | null;
  onSelectClass: (classId: string | null) => void;
  onSelectStandard?: (standard: string, stream?: string) => void;
  allowLater?: boolean;
  compact?: boolean;
}) {
  const t = useT();
  const groups = useMemo(() => uniqueClassGroups(classes), [classes]);
  const selectedStd = String(standard || "").trim();
  const selectedStream = ["11", "12"].includes(selectedStd)
    ? String(stream || "").trim()
    : "";
  const selectedGroupKey = selectedStd ? classGroupKey(selectedStd, selectedStream) : "";

  const divisions = useMemo(() => {
    if (!selectedStd) return [];
    return classes
      .filter((c) => {
        if (c.standard !== selectedStd) return false;
        if (!["11", "12"].includes(selectedStd)) return true;
        return String(c.stream || "").trim() === selectedStream;
      })
      .sort((a, b) => a.section.localeCompare(b.section));
  }, [classes, selectedStd, selectedStream]);

  if (classes.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        {t("studentForm.noSchoolClasses")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {t("fields.standard")}
        </p>
        <div className={cn("grid gap-2", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
          {groups.map((g) => {
            const active = g.key === selectedGroupKey;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => {
                  onSelectStandard?.(g.standard, g.stream);
                  onSelectClass(null);
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition",
                  active
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20"
                    : "border-slate-200 bg-white text-slate-800 hover:border-emerald-400",
                )}
              >
                {groupLabel(g.standard, g.stream, t)}
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                  {t("studentForm.classGroupMeta", { count: String(g.count) })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedStd ? (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("students.assignDivisionPick")}
          </p>
          <div className={cn("grid gap-2", compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
            {allowLater ? (
              <button
                type="button"
                onClick={() => onSelectClass(null)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  !classId
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20"
                    : "border-slate-200 bg-white hover:border-amber-300",
                )}
              >
                <span className="block text-sm font-bold text-amber-900">
                  {t("students.assignClassLater")}
                </span>
                <span className="mt-0.5 block text-[11px] text-amber-800">
                  {t("students.pendingDivision")}
                </span>
              </button>
            ) : null}
            {divisions.map((c) => {
              const active = classId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectClass(c.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? "border-emerald-600 bg-emerald-50 shadow-sm ring-2 ring-emerald-600/20"
                      : "border-slate-200 bg-white hover:border-emerald-400",
                  )}
                >
                  <span className="block text-base font-bold text-slate-900">{c.section}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-600">{c.name}</span>
                  {typeof c._count?.students === "number" ? (
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {t("classes.studentsCount", { count: c._count.students })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t("studentForm.assignStandardRequired")}</p>
      )}
    </div>
  );
}
