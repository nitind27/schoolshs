"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AttendanceDateRangeCalendar } from "@/components/attendance/attendance-date-range-calendar";
import { useT } from "@/i18n/locale-provider";
import {
  EMPTY_ATTENDANCE_VIEW_FILTERS,
  formatDayRangeLabel,
  hasActiveViewFilters,
  type AttendanceViewFilters,
} from "@/lib/attendance-view-filters";
import { CalendarRange, FileSpreadsheet, FileText, FilterX, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttendanceExportFormat = "pdf" | "xlsx";

interface Props {
  value: AttendanceViewFilters;
  onChange: (v: AttendanceViewFilters) => void;
  month: number;
  year: number;
  filteredCount: number;
  totalCount: number;
  onDownload?: (format: AttendanceExportFormat) => void;
  downloading?: AttendanceExportFormat | null;
}

export function AttendanceViewToolbar({
  value,
  onChange,
  month,
  year,
  filteredCount,
  totalCount,
  onDownload,
  downloading = null,
}: Props) {
  const t = useT();
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<AttendanceViewFilters>) => onChange({ ...value, ...patch });
  const rangeActive = Boolean(value.dayFrom || value.dayTo);
  const filtersActive = hasActiveViewFilters(value);
  const busy = downloading !== null;

  const rangeLabel = formatDayRangeLabel(
    value,
    month,
    year,
    t("attendance.dateRangeAllMonth")
  );

  useEffect(() => {
    if (!calOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [calOpen]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={t("attendance.searchStudentPlaceholder")}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-label={t("attendance.searchStudent")}
          />
        </div>

        <select
          value={value.status}
          onChange={(e) => set({ status: e.target.value as AttendanceViewFilters["status"] })}
          className="h-9 min-w-[130px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          aria-label={t("attendance.statusFilter")}
        >
          <option value="">{t("attendance.statusAll")}</option>
          <option value="P">{t("attendance.present")}</option>
          <option value="A">{t("attendance.absent")}</option>
          <option value="H">{t("attendance.halfDay")}</option>
          <option value="marked">{t("attendance.statusMarked")}</option>
          <option value="unmarked">{t("attendance.statusUnmarked")}</option>
        </select>

        <div className="relative" ref={calRef}>
          <button
            type="button"
            onClick={() => setCalOpen((o) => !o)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors",
              rangeActive
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[120px] truncate">{rangeLabel}</span>
            {rangeActive && (
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 hover:bg-emerald-100"
                onClick={(e) => {
                  e.stopPropagation();
                  set({ dayFrom: "", dayTo: "" });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    set({ dayFrom: "", dayTo: "" });
                  }
                }}
                aria-label={t("attendance.dateRangeClear")}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>

          {calOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[260px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg sm:left-auto sm:right-0">
              <AttendanceDateRangeCalendar
                month={month}
                year={year}
                dayFrom={value.dayFrom}
                dayTo={value.dayTo}
                onChange={(range) => set(range)}
                onRangeComplete={() => setCalOpen(false)}
                compact
              />
            </div>
          )}
        </div>

        <p className="hidden text-xs text-slate-500 sm:block">
          {t("attendance.reportShowing", { shown: filteredCount, total: totalCount })}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5"
              onClick={() => {
                onChange(EMPTY_ATTENDANCE_VIEW_FILTERS);
                setCalOpen(false);
              }}
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("attendance.clearFilters")}</span>
            </Button>
          )}
          {onDownload && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-2.5"
                onClick={() => onDownload("pdf")}
                disabled={busy || filteredCount === 0}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {downloading === "pdf" ? "…" : t("attendance.downloadPdf")}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 bg-emerald-600 px-2.5 hover:bg-emerald-700"
                onClick={() => onDownload("xlsx")}
                disabled={busy || filteredCount === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {downloading === "xlsx" ? "…" : t("attendance.downloadExcel")}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
