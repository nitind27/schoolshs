import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-6 py-5", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-800 leading-tight", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 px-6 py-4 border-t border-slate-100", className)}
      {...props}
    />
  );
}

/* ── Stat card variant (gradient) ───────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  icon,
  gradient,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  gradient?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 text-white shadow-md",
        gradient || "bg-gradient-to-br from-blue-600 to-blue-700",
        className
      )}
    >
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/70 mb-1">{label}</p>
          <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
        </div>
        {icon && (
          <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Professional light metric card ──────────────────────── */
const METRIC_ACCENTS = {
  blue:    { bar: "bg-blue-600",    icon: "bg-blue-600 shadow-blue-600/25",    text: "text-blue-600"    },
  emerald: { bar: "bg-emerald-600", icon: "bg-emerald-600 shadow-emerald-600/25", text: "text-emerald-600" },
  teal:    { bar: "bg-teal-600",    icon: "bg-teal-600 shadow-teal-600/25",    text: "text-teal-600"    },
  cyan:    { bar: "bg-cyan-600",    icon: "bg-cyan-600 shadow-cyan-600/25",    text: "text-cyan-600"    },
  violet:  { bar: "bg-violet-600",  icon: "bg-violet-600 shadow-violet-600/25",  text: "text-violet-600"  },
  amber:   { bar: "bg-amber-500",   icon: "bg-amber-500 shadow-amber-500/25",   text: "text-amber-600"   },
  indigo:  { bar: "bg-indigo-600",  icon: "bg-indigo-600 shadow-indigo-600/25",  text: "text-indigo-600"  },
  rose:    { bar: "bg-rose-600",    icon: "bg-rose-600 shadow-rose-600/25",    text: "text-rose-600"    },
} as const;

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "blue",
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: keyof typeof METRIC_ACCENTS;
  className?: string;
}) {
  const a = METRIC_ACCENTS[accent];
  return (
    <div className={cn("dashboard-metric group", className)}>
      <div className={cn("dashboard-metric-bar", a.bar)} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-105", a.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dashboard section wrapper ───────────────────────────── */
export function DashboardSection({
  icon,
  title,
  description,
  action,
  children,
  className,
  iconClassName = "bg-blue-600 shadow-blue-600/20",
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("dashboard-section-card", className)}>
      <div className="dashboard-section-head">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md", iconClassName)}>
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
