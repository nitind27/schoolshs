"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { daysInMonth, parseDayRange } from "@/lib/attendance-view-filters";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  month: number;
  year: number;
  dayFrom: string;
  dayTo: string;
  onChange: (range: { dayFrom: string; dayTo: string }) => void;
  onRangeComplete?: () => void;
  compact?: boolean;
}

export function AttendanceDateRangeCalendar({
  month,
  year,
  dayFrom,
  dayTo,
  onChange,
  onRangeComplete,
  compact = false,
}: Props) {
  const t = useT();
  const maxDay = daysInMonth(month, year);
  const { from, to, isCustom } = parseDayRange(
    { search: "", status: "", dayFrom, dayTo },
    month,
    year
  );
  const [anchor, setAnchor] = useState<number | null>(null);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: maxDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (day: number) => {
    if (anchor === null) {
      setAnchor(day);
      onChange({ dayFrom: String(day), dayTo: String(day) });
      return;
    }
    const start = Math.min(anchor, day);
    const end = Math.max(anchor, day);
    onChange({ dayFrom: String(start), dayTo: String(end) });
    setAnchor(null);
    onRangeComplete?.();
  };

  const clearRange = () => {
    setAnchor(null);
    onChange({ dayFrom: "", dayTo: "" });
  };

  const inRange = (day: number) => isCustom && day >= from && day <= to;
  const isEdge = (day: number) => isCustom && (day === from || day === to);

  const summary = !isCustom
    ? t("attendance.dateRangeAllMonth")
    : from === to
      ? t("attendance.dateRangeSingle", { day: from })
      : t("attendance.dateRangeSelected", { from, to });

  return (
    <div className={cn(compact ? "p-2" : "rounded-xl border border-slate-200 bg-white p-3")}>
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold text-slate-800">
          {ENGLISH_MONTHS[month - 1]} {year}
        </p>
        <p className="text-[11px] font-medium text-emerald-700">{summary}</p>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 text-[9px] font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-7" />;
          const selected = inRange(day);
          const edge = isEdge(day);
          const pending = anchor === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-7 rounded-md text-[11px] font-semibold transition-colors",
                selected
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "text-slate-700 hover:bg-emerald-50",
                edge && "ring-1 ring-emerald-300",
                pending && !selected && "bg-emerald-100 text-emerald-900"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 px-0.5 pt-1.5">
        <p className="text-[10px] text-slate-500">
          {anchor !== null ? t("attendance.dateRangePickEnd") : t("attendance.dateRangeHint")}
        </p>
        {isCustom && (
          <button
            type="button"
            onClick={clearRange}
            className="text-[10px] font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            {t("attendance.dateRangeClear")}
          </button>
        )}
      </div>
    </div>
  );
}
