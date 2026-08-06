"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "./modal.css";

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
  { icon: typeof Trash2; iconClass: string }
> = {
  destructive: {
    icon: Trash2,
    iconClass: "is-destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "is-warning",
  },
  default: {
    icon: AlertTriangle,
    iconClass: "is-default",
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
      className="info-modal-root fixed inset-0 z-[200] flex items-end justify-center p-2 sm:items-center sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <button
        type="button"
        className="info-modal-backdrop"
        onClick={loading ? undefined : onClose}
        disabled={loading}
        aria-label={cancelLabel ?? t("common.cancel")}
      />

      <div
        ref={modalRef}
        className={cn(
          "confirm-modal-panel",
          locale === "gu" && "font-gujarati",
        )}
        data-variant={variant}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={cn("confirm-modal-icon", styles.iconClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="confirm-modal-title"
                className="break-words text-base font-bold text-slate-900 sm:text-lg"
              >
                {title}
              </h2>
              <p
                id="confirm-modal-message"
                className="mt-2 break-words text-sm leading-relaxed text-slate-600"
              >
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="info-modal-close disabled:opacity-50"
              aria-label={cancelLabel ?? t("common.cancel")}
            >
              <X className="h-[1.05rem] w-[1.05rem]" />
            </button>
          </div>
        </div>

        <div className="confirm-modal-foot">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto sm:min-w-[96px]"
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
            className="w-full sm:w-auto sm:min-w-[96px]"
          >
            {loading ? t("common.loading") : (confirmLabel ?? t("common.confirm"))}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
