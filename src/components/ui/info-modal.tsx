"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import "./modal.css";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Wider panel for forms with many fields */
  wide?: boolean;
  /** Extra-wide panel for data tables */
  size?: "default" | "wide" | "xl";
  /** Optional small label above title */
  eyebrow?: string;
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  children,
  wide,
  size,
  eyebrow,
}: InfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { locale } = useLocale();
  const t = useT();
  const resolvedSize = size || (wide ? "wide" : "default");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="info-modal-root fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <button
        type="button"
        className="info-modal-backdrop"
        onClick={onClose}
        aria-label={t("common.close")}
      />

      <div
        ref={modalRef}
        className={cn(
          "info-modal-panel",
          resolvedSize === "xl" && "max-w-6xl",
          resolvedSize === "wide" && "max-w-3xl",
          resolvedSize === "default" && "max-w-lg sm:max-w-2xl",
          locale === "gu" && "font-gujarati",
        )}
        style={
          {
            "--info-modal-max-height":
              resolvedSize === "xl"
                ? "min(92dvh, 860px)"
                : "min(90dvh, 720px)",
          } as React.CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="info-modal-head">
          <div className="info-modal-head-copy">
            <p className="info-modal-kicker">
              {eyebrow || t("common.details")}
            </p>
            <h2 id="info-modal-title" className="info-modal-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="info-modal-close"
            aria-label={t("common.close")}
          >
            <X className="h-4.5 w-4.5 h-[1.15rem] w-[1.15rem]" />
          </button>
        </div>

        <div className="info-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
