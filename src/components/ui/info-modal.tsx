"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Wider panel for forms with many fields */
  wide?: boolean;
  /** Extra-wide panel for data tables */
  size?: "default" | "wide" | "xl";
}

export function InfoModal({ isOpen, onClose, title, children, wide, size }: InfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { locale } = useLocale();
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
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-label="Close dialog"
      />

      <div
        ref={modalRef}
        className={cn(
          "info-modal-panel relative z-10 flex w-full flex-col overflow-hidden bg-white shadow-2xl animate-fade-in",
          resolvedSize === "xl" && "max-w-6xl",
          resolvedSize === "wide" && "max-w-3xl",
          resolvedSize === "default" && "max-w-lg sm:max-w-2xl",
          locale === "gu" && "font-gujarati"
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
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
          <h2 id="info-modal-title" className="min-w-0 break-words text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
