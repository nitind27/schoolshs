"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./loader.css";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  /** Use on dark / colored backgrounds */
  onDark?: boolean;
  /** Pure white spinner (buttons, dark overlays) */
  white?: boolean;
  label?: string;
};

/** Core spinner — same look everywhere */
export function Spinner({
  size = "md",
  className,
  onDark,
  white,
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      className={cn(
        "shs-spinner",
        `shs-spinner--${size}`,
        onDark && "shs-spinner--on-dark",
        white && "shs-spinner--white",
        className,
      )}
      role="status"
      aria-label={label}
    >
      <span className="shs-spinner__ring" aria-hidden />
    </span>
  );
}

type PageLoaderProps = {
  label?: string;
  hint?: string;
  className?: string;
  /** Full viewport (auth / shell boot) */
  screen?: boolean;
  /** Bordered card block */
  card?: boolean;
  size?: SpinnerSize;
  minHeight?: string | number;
};

/** Centered section / page loader */
export function PageLoader({
  label,
  hint,
  className,
  screen,
  card,
  size,
  minHeight,
}: PageLoaderProps) {
  const spinnerSize = size || (screen ? "xl" : "lg");
  return (
    <div
      className={cn(
        "shs-page-loader",
        screen && "shs-page-loader--screen",
        card && "shs-page-loader--card",
        className,
      )}
      style={minHeight != null ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size={spinnerSize} label={label || "Loading"} />
      {label ? <p className="shs-page-loader__label">{label}</p> : null}
      {hint ? <p className="shs-page-loader__hint">{hint}</p> : null}
    </div>
  );
}

type OverlayLoaderProps = {
  show?: boolean;
  label?: string;
  dark?: boolean;
  className?: string;
  /** Delay before showing — avoids flash on fast responses */
  delayMs?: number;
};

/** Absolute overlay for panels / tables while refetching */
export function OverlayLoader({
  show = true,
  label,
  dark,
  className,
  delayMs = 180,
}: OverlayLoaderProps) {
  const visible = useDelayedVisible(show, delayMs);
  if (!visible) return null;
  return (
    <div
      className={cn("shs-overlay-loader", dark && "shs-overlay-loader--dark", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size="lg" white={dark} onDark={dark} label={label || "Loading"} />
      {label ? (
        <p className={cn("shs-page-loader__label", dark && "text-white/90")}>{label}</p>
      ) : null}
    </div>
  );
}

/** Show children only after `delayMs` while `show` is true */
export function DelayedShow({
  show,
  delayMs = 200,
  children,
}: {
  show: boolean;
  delayMs?: number;
  children: ReactNode;
}) {
  const visible = useDelayedVisible(show, delayMs);
  if (!visible) return null;
  return <>{children}</>;
}

function useDelayedVisible(show: boolean, delayMs: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [show, delayMs]);

  return visible;
}

/** Compact inline row loader (lists, filters) */
export function InlineLoader({
  label,
  className,
  size = "sm",
}: {
  label?: string;
  className?: string;
  size?: SpinnerSize;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-slate-500", className)}>
      <Spinner size={size} label={label || "Loading"} />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
