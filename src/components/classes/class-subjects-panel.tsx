"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

type SubjectRow = {
  id?: string;
  name: string;
  code: string;
  shortName: string;
  type: "numeric" | "grade";
  maxMarks: number;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  classId: string;
  canEdit?: boolean;
};

function emptyRow(order: number): SubjectRow {
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

export function ClassSubjectsPanel({ classId, canEdit = true }: Props) {
  const t = useT();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [className, setClassName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/classes/${classId}/subjects`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClassName(data.class?.name || "");
      setSubjects(
        (data.subjects || []).map((s: SubjectRow, i: number) => ({
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
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (index: number, patch: Partial<SubjectRow>) => {
    setSubjects((rows) => {
      const next = [...rows];
      next[index] = { ...next[index]!, ...patch };
      if (patch.type === "grade") next[index]!.maxMarks = 0;
      if (patch.type === "numeric" && next[index]!.maxMarks === 0) {
        next[index]!.maxMarks = 100;
      }
      return next;
    });
    setSaved(false);
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= subjects.length) return;
    setSubjects((rows) => {
      const next = [...rows];
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next.map((r, i) => ({ ...r, sortOrder: i }));
    });
    setSaved(false);
  };

  const addRow = () => {
    setSubjects((rows) => [...rows, emptyRow(rows.length)]);
    setSaved(false);
  };

  const removeRow = (index: number) => {
    setSubjects((rows) => rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i })));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = subjects
        .filter((s) => s.name.trim() && s.code.trim())
        .map((s, i) => ({
          name: s.name.trim(),
          code: s.code.trim().toUpperCase(),
          shortName: s.shortName.trim() || s.name.trim().slice(0, 2),
          type: s.type,
          maxMarks: s.type === "grade" ? 0 : s.maxMarks,
          sortOrder: i,
          isActive: s.isActive,
        }));

      const res = await fetch(`/api/classes/${classId}/subjects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: payload, syncExam: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!confirm(t("classes.subjectsResetConfirm"))) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/classes/${classId}/subjects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_defaults" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = subjects.filter((s) => s.isActive && s.name.trim()).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("classes.subjectsTitle")}</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                {t("classes.subjectsSubtitle", { count: activeCount, className })}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetDefaults} disabled={saving}>
                <RefreshCw className="h-4 w-4" />
                {t("classes.subjectsReset")}
              </Button>
              <Button size="sm" onClick={save} disabled={saving || subjects.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("classes.subjectsSave")}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {t("classes.subjectsSaved")}
              </div>
            )}

            <p className="text-xs text-slate-500">{t("classes.subjectsHint")}</p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-2 w-10">#</th>
                    <th className="p-2 min-w-[140px]">{t("classes.subjectName")}</th>
                    <th className="p-2 w-24">{t("classes.subjectCode")}</th>
                    <th className="p-2 w-20">{t("classes.subjectShort")}</th>
                    <th className="p-2 w-28">{t("classes.subjectType")}</th>
                    <th className="p-2 w-20">{t("classes.subjectMax")}</th>
                    <th className="p-2 w-20">{t("common.status")}</th>
                    {canEdit && <th className="p-2 w-28">{t("common.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((row, index) => (
                    <tr key={row.id || `new-${index}`} className="border-b border-slate-100">
                      <td className="p-2 text-slate-400">{index + 1}</td>
                      <td className="p-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(index, { name: e.target.value })}
                          placeholder={t("classes.subjectNamePlaceholder")}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.code}
                          onChange={(e) => updateRow(index, { code: e.target.value.toUpperCase() })}
                          placeholder="GUJ"
                          disabled={!canEdit}
                          className="font-mono text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.shortName}
                          onChange={(e) => updateRow(index, { shortName: e.target.value })}
                          disabled={!canEdit}
                          className="text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={row.type}
                          onChange={(e) =>
                            updateRow(index, { type: e.target.value as "numeric" | "grade" })
                          }
                          disabled={!canEdit}
                          options={[
                            { value: "numeric", label: t("classes.subjectTypeNumeric") },
                            { value: "grade", label: t("classes.subjectTypeGrade") },
                          ]}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={row.type === "grade" ? "" : row.maxMarks}
                          onChange={(e) =>
                            updateRow(index, { maxMarks: parseInt(e.target.value, 10) || 0 })
                          }
                          disabled={!canEdit || row.type === "grade"}
                          className="text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={row.isActive ? "active" : "inactive"}
                          onChange={(e) =>
                            updateRow(index, { isActive: e.target.value === "active" })
                          }
                          disabled={!canEdit}
                          options={[
                            { value: "active", label: t("common.active") },
                            { value: "inactive", label: t("common.inactive") },
                          ]}
                        />
                      </td>
                      {canEdit && (
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveRow(index, -1)}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveRow(index, 1)}
                              disabled={index === subjects.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <Button variant="outline" onClick={addRow} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {t("classes.subjectAdd")}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
