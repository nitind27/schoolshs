"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

export type StudentPortalData = Record<string, unknown> & {
  firstName?: string;
  surname?: string;
  middleName?: string | null;
  standard?: string;
  section?: string;
  rollNumber?: string | null;
  status?: string;
  category?: string;
  reportCards?: unknown[];
  examResults?: unknown[];
};

type StudentCtx = {
  student: StudentPortalData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const StudentDataContext = createContext<StudentCtx | null>(null);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/student-portal")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load");
        setStudent(data.student);
      })
      .catch((e: unknown) => {
        setStudent(null);
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <StudentDataContext.Provider value={{ student, loading, error, reload: load }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used within StudentPortalProvider");
  return ctx;
}

export function StudentLoading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] gap-3">
      <Loader2 className="h-9 w-9 animate-spin text-sky-600" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function StudentError({ message }: { message: string }) {
  const { reload } = useStudentData();
  const t = useT();
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={reload}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        {t("common.loading")}
      </button>
    </div>
  );
}

export function StudentPageHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="student-portal-header">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/25">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function StudentMetricCard({
  label,
  value,
  sub,
  accent = "sky",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "sky" | "blue" | "emerald" | "amber" | "violet";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const accents = {
    sky: "from-sky-500 to-cyan-600 shadow-sky-500/20",
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/20",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    amber: "from-amber-500 to-orange-500 shadow-amber-500/20",
    violet: "from-violet-500 to-purple-600 shadow-violet-500/20",
  };

  return (
    <div className="student-metric-card group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-105", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StudentQuickLink({
  href,
  icon: Icon,
  label,
  desc,
  accent = "sky",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  accent?: "sky" | "blue" | "emerald" | "amber" | "violet";
}) {
  const iconColors = {
    sky: "text-sky-600 bg-sky-100",
    blue: "text-blue-600 bg-blue-100",
    emerald: "text-emerald-600 bg-emerald-100",
    amber: "text-amber-600 bg-amber-100",
    violet: "text-violet-600 bg-violet-100",
  };

  return (
    <Link href={href} className="student-quick-link">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconColors[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">{label}</h3>
        <p className="text-sm text-slate-500 truncate">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function StudentSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="student-section">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StudentField({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("student-field", fullWidth && "sm:col-span-2")}>
      <p className="student-field-label">{label}</p>
      <p className="student-field-value">{value || "—"}</p>
    </div>
  );
}

export function StudentEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="student-empty">
      <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

export function StudentStatusPill({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "muted" }) {
  const styles = {
    default: "bg-sky-100 text-sky-800 border-sky-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    muted: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", styles[variant])}>
      {children}
    </span>
  );
}
