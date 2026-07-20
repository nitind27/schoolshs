"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
  duration: number;
};

type ToastApi = {
  push: (toast: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let externalApi: ToastApi | null = null;

/** Call from anywhere (client). Safe no-op until Toaster mounts. */
export const toast: ToastApi = {
  push: (t) => externalApi?.push(t) ?? "",
  success: (title, description) => externalApi?.success(title, description) ?? "",
  error: (title, description) => externalApi?.error(title, description) ?? "",
  info: (title, description) => externalApi?.info(title, description) ?? "",
  warning: (title, description) => externalApi?.warning(title, description) ?? "",
  dismiss: (id) => externalApi?.dismiss(id),
};

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastVariant, { bar: string; icon: string; glow: string }> = {
  success: {
    bar: "from-emerald-500 to-teal-400",
    icon: "text-emerald-600 bg-emerald-50",
    glow: "shadow-emerald-500/10",
  },
  error: {
    bar: "from-rose-500 to-orange-400",
    icon: "text-rose-600 bg-rose-50",
    glow: "shadow-rose-500/10",
  },
  info: {
    bar: "from-sky-500 to-blue-400",
    icon: "text-sky-600 bg-sky-50",
    glow: "shadow-sky-500/10",
  },
  warning: {
    bar: "from-amber-500 to-orange-400",
    icon: "text-amber-600 bg-amber-50",
    glow: "shadow-amber-500/10",
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[item.variant];
  const style = STYLES[item.variant];
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (item.duration <= 0) return;
    const t = window.setTimeout(() => setLeaving(true), item.duration);
    return () => window.clearTimeout(t);
  }, [item.duration, item.id]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => onDismiss(item.id), 220);
    return () => window.clearTimeout(t);
  }, [leaving, item.id, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto relative w-[min(100vw-1.5rem,380px)] overflow-hidden",
        "rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl",
        "shadow-xl shadow-slate-900/10",
        style.glow,
        leaving ? "toast-item-out" : "toast-item-in"
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", style.bar)} />
      <div className="flex gap-3 p-3.5 pl-4">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            style.icon
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold tracking-tight text-slate-900">{item.title}</p>
          {item.description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {item.duration > 0 && (
        <div className="h-0.5 bg-slate-100">
          <div
            className={cn("h-full bg-gradient-to-r toast-progress", style.bar)}
            style={{ animationDuration: `${item.duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    idRef.current += 1;
    const id = `toast-${idRef.current}`;
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant || "info",
      duration: input.duration ?? 4200,
    };
    setItems((prev) => [...prev.slice(-4), item]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ title, description, variant: "success" }),
      error: (title, description) => push({ title, description, variant: "error" }),
      info: (title, description) => push({ title, description, variant: "info" }),
      warning: (title, description) => push({ title, description, variant: "warning" }),
    }),
    [push, dismiss]
  );

  useEffect(() => {
    externalApi = api;
    return () => {
      if (externalApi === api) externalApi = null;
    };
  }, [api]);

  return (
    <ToastContext.Provider value={api}>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2.5 px-3 pt-4 sm:items-end sm:px-5 sm:pt-5"
        aria-label="Notifications"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return toast;
  return ctx;
}
