"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ConfirmVariant = "default" | "destructive" | "warning";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const variantStyles: Record<
  ConfirmVariant,
  { icon: typeof Trash2; iconBg: string; iconColor: string }
> = {
  destructive: {
    icon: Trash2,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  default: {
    icon: AlertTriangle,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { locale, t } = useLocale();
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={loading ? undefined : onClose}
        disabled={loading}
        aria-label={cancelLabel ?? t("common.cancel")}
      />

      <div
        ref={modalRef}
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in",
          locale === "gu" && "font-gujarati"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                styles.iconBg
              )}
            >
              <Icon className={cn("h-5 w-5", styles.iconColor)} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="confirm-modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                {title}
              </h2>
              <p
                id="confirm-modal-message"
                className="mt-2 text-sm leading-relaxed text-slate-600"
              >
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label={cancelLabel ?? t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="sm:min-w-[96px]"
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={
              variant === "destructive"
                ? "destructive"
                : variant === "warning"
                  ? "warning"
                  : "default"
            }
            onClick={() => void onConfirm()}
            disabled={loading}
            className="sm:min-w-[96px]"
          >
            {loading ? t("common.loading") : (confirmLabel ?? t("common.confirm"))}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
