"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

export type DeactivateRollMode = "shift" | "blank";

type Target = {
  id: string;
  firstName: string;
  surname: string;
  rollNumber?: string | null;
  grNumber?: string | null;
  standard?: string | null;
  section?: string | null;
};

export function DeactivateStudentDialog({
  student,
  onClose,
  onDone,
}: {
  student: Target;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const t = useT();
  const [mode, setMode] = useState<DeactivateRollMode>("blank");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const name = [student.firstName, student.surname].filter(Boolean).join(" ").trim();
  const classLabel = [student.standard, student.section].filter(Boolean).join("-");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/students/${student.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false, rollMode: mode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t("students.deactivateFailed"));
      }
      await onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("students.deactivateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deactivate-title" className="text-lg font-semibold text-slate-900">
          {t("students.deactivateTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{name}</span>
          {student.rollNumber ? ` · Roll ${student.rollNumber}` : ""}
          {student.grNumber ? ` · GR ${student.grNumber}` : ""}
          {classLabel ? ` · ${classLabel}` : ""}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t("students.deactivateChoose")}</p>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={() => setMode("blank")}
            className={`rounded-xl border px-3 py-3 text-left ${
              mode === "blank" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-900">{t("students.deactivateBlankTitle")}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{t("students.deactivateBlankHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("shift")}
            className={`rounded-xl border px-3 py-3 text-left ${
              mode === "shift" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-900">{t("students.deactivateShiftTitle")}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{t("students.deactivateShiftHint")}</span>
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving..." : "Deactivate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
