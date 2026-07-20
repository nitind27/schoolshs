"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE, pageRange } from "@/lib/pagination";
import { useT } from "@/i18n/locale-provider";

export function TablePagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onPageChange,
  className = "",
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const t = useT();
  const { from, to, totalPages: pages } = pageRange(page, pageSize, total);

  if (total === 0) return null;

  return (
    <div
      className={`flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs text-slate-500">
        {t("common.showingRange", { from, to, total })}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[4.5rem] text-center text-xs font-medium text-slate-600">
            {t("common.pageOf", { page, total: pages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("common.next")}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
