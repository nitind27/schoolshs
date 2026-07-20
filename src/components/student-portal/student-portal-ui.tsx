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
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--sp-accent,#0d7377)]" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function StudentError({ message }: { message: string }) {
  const { reload } = useStudentData();
  const t = useT();
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-500" />
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
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="sp-header-icon">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.7rem]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-[0.95rem]">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function StudentMetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="student-metric-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="sp-metric-label">{label}</p>
          <p className="sp-metric-value truncate">{value}</p>
          {sub && <p className="sp-metric-sub">{sub}</p>}
        </div>
        {Icon && (
          <div className="sp-metric-icon shrink-0">
            <Icon className="h-4 w-4" />
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="student-quick-link group">
      <div className="sp-ql-icon">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h3>{label}</h3>
        <p className="truncate">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--sp-accent,#0d7377)]" />
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
          <h2 className="student-section-title">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
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
      <Icon className="mx-auto mb-3 h-11 w-11 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function StudentStatusPill({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "muted";
}) {
  return (
    <span
      className={cn(
        "student-status-pill",
        variant === "muted" && "student-status-pill--muted",
        variant === "success" && "student-status-pill--success",
        variant === "warning" && "student-status-pill--warning"
      )}
    >
      {children}
    </span>
  );
}
