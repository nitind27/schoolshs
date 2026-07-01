"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useT();
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    ready: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    submitted: "bg-green-100 text-green-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  const label = t(`status.${status}`);
  const displayLabel = label === `status.${status}` ? status : label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[status] || "bg-gray-100 text-gray-700",
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const t = useT();
  const colors: Record<string, string> = {
    SC: "bg-purple-100 text-purple-700",
    ST: "bg-indigo-100 text-indigo-700",
    OBC: "bg-orange-100 text-orange-700",
    SEBC: "bg-amber-100 text-amber-700",
    EWS: "bg-teal-100 text-teal-700",
    Open: "bg-slate-100 text-slate-700",
    Minority: "bg-emerald-100 text-emerald-700",
    NTDNT: "bg-rose-100 text-rose-700",
  };

  const label = t(`category.${category}`);
  const displayLabel = label === `category.${category}` ? category : label;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[category] || "bg-gray-100 text-gray-700",
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
