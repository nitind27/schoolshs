"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

type PhotoLightboxProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
  subtitle?: string;
};

export function PhotoLightbox({
  open,
  onClose,
  src,
  title,
  subtitle,
}: PhotoLightboxProps) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title || t("staffPage.photoPreview")}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label={t("common.close")}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 sm:-right-3 sm:-top-3"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title || t("staffPage.photoPreview")}
            className="max-h-[min(78vh,720px)] w-auto max-w-[min(92vw,480px)] object-contain bg-slate-100"
          />
        </div>

        {(title || subtitle) && (
          <div className="rounded-xl bg-white/95 px-4 py-2.5 text-center shadow-lg backdrop-blur">
            {title ? (
              <p className="text-sm font-bold text-slate-900">{title}</p>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

type ClickableStaffPhotoProps = {
  src?: string | null;
  name: string;
  subtitle?: string;
  initial: string;
  className?: string;
};

/** Thumbnail that opens a full photo preview on click when src exists. */
export function ClickableStaffPhoto({
  src,
  name,
  subtitle,
  initial,
  className,
}: ClickableStaffPhotoProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!src) {
    return (
      <span
        className={
          className ||
          "flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-800 ring-1 ring-teal-100"
        }
      >
        {initial}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={t("staffPage.photoPreviewHint")}
        className="group relative shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-label={t("staffPage.photoPreview")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-9 w-9 object-cover transition group-hover:brightness-95"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/35 group-hover:opacity-100">
          <ZoomIn className="h-3.5 w-3.5 text-white drop-shadow" />
        </span>
      </button>
      <PhotoLightbox
        open={open}
        onClose={() => setOpen(false)}
        src={src}
        title={name}
        subtitle={subtitle}
      />
    </>
  );
}
