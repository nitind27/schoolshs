"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Optional accent color class for the left border, e.g. "border-blue-500" */
  accentColor?: string;
  /** Optional icon shown beside title */
  icon?: React.ReactNode;
  /** Portal theme variant */
  variant?: "default" | "teacher";
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  accentColor = "border-blue-500",
  icon,
  variant = "default",
}: PageShellProps) {
  const heroClass = variant === "teacher" ? "teacher-page-hero" : "page-hero";
  const resolvedAccent =
    variant === "teacher" && accentColor === "border-blue-500"
      ? "border-teal-500"
      : accentColor;

  return (
    <div className="space-y-4 animate-fade-in" data-ft-anchor="main">
      <div className={cn(heroClass, "p-4 md:p-5")}>
        {breadcrumbs.length > 0 && (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
            <Link
              href={variant === "teacher" ? "/teacher" : "/dashboard"}
              className="flex items-center gap-1 hover:text-slate-700 transition-colors"
            >
              <Home className="h-3 w-3" />
            </Link>
            {breadcrumbs.map((item, idx) => (
              <span key={`${item.label}-${idx}`} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                {item.href ? (
                  <Link href={item.href} className="min-w-0 break-words transition-colors hover:text-slate-700 hover:underline underline-offset-2">
                    {item.label}
                  </Link>
                ) : (
                  <span className="min-w-0 break-words font-medium text-slate-700">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className={cn("flex min-w-0 items-start gap-2.5 border-l-4 pl-3 sm:items-center", resolvedAccent)}>
            {icon && <span className="mt-0.5 shrink-0 text-slate-600 sm:mt-0">{icon}</span>}
            <div className="min-w-0">
              <h1 className="break-words text-lg font-bold leading-tight text-slate-900 md:text-xl">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 break-words text-xs leading-snug text-slate-500 sm:text-sm">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center [&_a]:min-w-0 [&_button]:min-w-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4", className)}>
      <div className="min-w-0">
        <h2 className="break-words text-base font-semibold leading-snug text-slate-800">{title}</h2>
        {subtitle && <p className="mt-0.5 break-words text-sm leading-snug text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
