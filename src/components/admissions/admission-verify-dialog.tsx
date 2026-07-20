"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import type { AdmissionStatus } from "@/lib/admissions";

export function AdmissionVerifyDialog({
  open,
  studentName,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  studentName: string;
  action: AdmissionStatus | "pending";
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}) {
  const t = useT();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setNotes("");
  }, [open, studentName, action]);

  if (!mounted || !open) return null;

  const titles: Record<string, string> = {
    verified: t("admissions.verifyTitle"),
    rejected: t("admissions.rejectTitle"),
    pending: t("admissions.reopenTitle"),
  };

  const icons = {
    verified: <CheckCircle className="h-5 w-5 text-emerald-600" />,
    rejected: <XCircle className="h-5 w-5 text-red-600" />,
    pending: <RotateCcw className="h-5 w-5 text-amber-600" />,
  };

  const submit = async () => {
    setLoading(true);
    try {
      await onConfirm(notes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            {icons[action]}
            <h3 className="font-bold text-slate-900">{titles[action]}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{studentName}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {action === "rejected" ? t("admissions.rejectReason") : t("admissions.notesOptional")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder={t("admissions.notesPlaceholder")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || (action === "rejected" && !notes.trim())}
            className={
              action === "verified"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : action === "rejected"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
            }
          >
            {loading ? t("common.saving") : t("common.confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
