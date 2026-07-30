"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import type { AdmissionStatus } from "@/lib/admissions";
import { cn } from "@/lib/utils";

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
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setNotes("");
      setError("");
    }
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
    if (action === "rejected" && !notes.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm(notes.trim());
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("admissions.actionFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-2 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex shrink-0 items-center justify-between border-b bg-slate-50 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            {icons[action]}
            <h3 className="break-words font-bold text-slate-900">{titles[action]}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain sm:px-5">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{studentName}</span>
          </p>
          {action === "rejected" && (
            <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="block">
                  {t("admissions.rejectConfirmTitle")}
                </strong>
                <span className="text-xs">
                  {t("admissions.rejectConfirmHint")}
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {action === "rejected"
                ? t("admissions.rejectReason")
                : t("admissions.notesOptional")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder={t("admissions.notesPlaceholder")}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
          <Button className="w-full sm:w-auto" variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || (action === "rejected" && !notes.trim())}
            className={cn(
              "w-full sm:w-auto",
              action === "verified"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : action === "rejected"
                  ? "bg-red-600 hover:bg-red-700"
                  : "",
            )}
          >
            {loading
              ? t("common.saving")
              : action === "rejected"
                ? t("admissions.confirmReject")
                : action === "verified"
                  ? t("admissions.confirmVerify")
                  : t("admissions.confirmReopen")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
