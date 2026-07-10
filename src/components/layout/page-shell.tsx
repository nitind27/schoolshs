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
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  accentColor = "border-blue-500",
  icon,
}: PageShellProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page hero */}
      <div className="page-hero p-5 md:p-6">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-slate-700 transition-colors">
              <Home className="h-3 w-3" />
            </Link>
            {breadcrumbs.map((item, idx) => (
              <span key={`${item.label}-${idx}`} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-slate-400" />
                {item.href ? (
                  <Link href={item.href} className="hover:text-slate-700 hover:underline underline-offset-2 transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className={cn("flex items-center gap-3 pl-4 border-l-4", accentColor)}>
            {icon && (
              <span className="shrink-0 text-slate-600">{icon}</span>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 text-sm text-slate-500 leading-snug">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}

/* ── Section header for use within page content ─── */
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
      <div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
