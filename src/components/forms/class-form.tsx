"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SCHOOL_STANDARDS, SENIOR_STREAMS } from "@/lib/constants";
import { buildClassName, nextAvailableSection } from "@/lib/class-structure";
import { Save } from "lucide-react";
import type { SchoolClass } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

type ClassFormData = Partial<SchoolClass>;

interface ClassFormProps {
  initialData?: ClassFormData;
  onSubmit: (data: ClassFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ClassForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel,
}: ClassFormProps) {
  const t = useT();
  const isEdit = Boolean(initialData?.id);
  const [loading, setLoading] = useState(false);
  const [existingClasses, setExistingClasses] = useState<SchoolClass[]>([]);
  const [sectionTouched, setSectionTouched] = useState(isEdit);
  const [form, setForm] = useState<ClassFormData>({
    section: "A",
    stream: "",
    ...initialData,
  });

  const resolvedSubmitLabel = submitLabel ?? t("classes.saveClass");
  const standard = String(form.standard || "");
  const stream = String(form.stream || "");
  const isSenior = ["11", "12"].includes(standard);
  const sectionValue = String(form.section || "").trim().toUpperCase();

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setExistingClasses(d.classes || []))
      .catch(() => setExistingClasses([]));
  }, []);

  const siblingSections = useMemo(() => {
    if (!standard) return [] as string[];
    const resolvedStream = isSenior ? stream : "";
    return existingClasses
      .filter(
        (c) =>
          c.standard === standard &&
          (c.stream || "") === resolvedStream &&
          c.id !== initialData.id
      )
      .map((c) => c.section);
  }, [existingClasses, standard, stream, isSenior, initialData.id]);

  const suggestedSection = useMemo(
    () => nextAvailableSection(siblingSections),
    [siblingSections]
  );

  // Auto-fill next free section when standard/stream changes (create mode only)
  useEffect(() => {
    if (isEdit || sectionTouched || !standard) return;
    if (isSenior && !stream) return;
    setForm((prev) => ({ ...prev, section: suggestedSection }));
  }, [isEdit, sectionTouched, standard, stream, isSenior, suggestedSection]);

  const update = (field: string, value: unknown) => {
    if (field === "standard" || field === "stream") {
      setSectionTouched(false);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (value: string) => {
    setSectionTouched(true);
    // Allow letters only; normalize to uppercase as user types
    const cleaned = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
    setForm((prev) => ({ ...prev, section: cleaned }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const section = sectionValue;
    if (!standard || !section) return;
    if (isSenior && !stream) return;

    setLoading(true);
    try {
      const resolvedStream = isSenior ? stream : "";
      await onSubmit({
        standard,
        section,
        stream: resolvedStream,
        name: buildClassName(standard, section, resolvedStream || undefined),
      });
    } finally {
      setLoading(false);
    }
  };

  const classAlreadyExists = Boolean(
    standard &&
      sectionValue &&
      existingClasses.some(
        (c) =>
          c.standard === standard &&
          c.section === sectionValue &&
          (c.stream || "") === (isSenior ? stream : "") &&
          c.id !== initialData.id
      )
  );

  const previewName = standard && sectionValue
    ? buildClassName(
        standard,
        sectionValue,
        isSenior ? stream || undefined : undefined
      )
    : null;

  const requiredReady = Boolean(standard && sectionValue && (!isSenior || stream));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t("classes.standard")}
          required
          options={SCHOOL_STANDARDS}
          value={form.standard || ""}
          onChange={(e) => update("standard", e.target.value)}
        />
        {isSenior && (
          <Select
            label={t("classes.stream")}
            required
            options={[...SENIOR_STREAMS]}
            value={stream}
            onChange={(e) => update("stream", e.target.value)}
          />
        )}
        <div className={isSenior ? "sm:col-span-2" : undefined}>
          <Input
            label={t("classes.section")}
            required
            value={form.section || ""}
            onChange={(e) => handleSectionChange(e.target.value)}
            placeholder={suggestedSection || "A"}
            maxLength={2}
            autoComplete="off"
          />
        </div>
      </div>

      {standard && siblingSections.length > 0 && (
        <p className="text-xs text-slate-500">
          {t("classes.existingSections", {
            sections: [...new Set(siblingSections.map((s) => s.toUpperCase()))]
              .sort()
              .join(", "),
          })}
          {!sectionTouched && (
            <span className="text-blue-600">
              {" "}
              · {t("classes.nextSectionHint", { section: suggestedSection })}
            </span>
          )}
        </p>
      )}

      {classAlreadyExists && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {t("classes.duplicateClass")}
          <button
            type="button"
            className="ml-2 font-semibold text-red-800 underline underline-offset-2"
            onClick={() => {
              setSectionTouched(false);
              setForm((prev) => ({ ...prev, section: suggestedSection }));
            }}
          >
            {t("classes.useNextSection", { section: suggestedSection })}
          </button>
        </div>
      )}

      {previewName && (
        <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{previewName}</span>
          <span className="text-slate-400"> · {t("classes.teacherAssignLater")}</span>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || classAlreadyExists || !requiredReady}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <Save className="h-4 w-4" />
          {loading ? t("common.saving") : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
