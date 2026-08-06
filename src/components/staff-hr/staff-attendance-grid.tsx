"use client";

import { useMemo, useState } from "react";
import type { StaffAttendanceRow } from "@/lib/staff-hr";
import {
  cycleStaffMark,
  countStaffAbsent,
  countStaffHalf,
  countStaffLeave,
  countStaffPresent,
  daysInMonth,
} from "@/lib/staff-hr";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { parseToDate } from "@/components/ui/date-field";
import { DateRangeField } from "@/components/ui/date-range-field";
import { Button } from "@/components/ui/button";
import { CheckCheck, Eraser, UserX, CalendarDays } from "lucide-react";

function cellClass(mark: string | null) {
  if (mark === "P") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (mark === "A") return "bg-red-100 text-red-800 border-red-300";
  if (mark === "H") return "bg-amber-100 text-amber-800 border-amber-300";
  if (mark === "L") return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";
}

function dayInScope(day: number, scope: Set<number> | null) {
  if (!scope) return true;
  return scope.has(day);
}

export function StaffAttendanceGrid({
  rows,
  onChange,
  month,
  year,
}: {
  rows: StaffAttendanceRow[];
  onChange: (rows: StaffAttendanceRow[]) => void;
  month: number;
  year: number;
}) {
  const t = useT();
  const totalDays = daysInMonth(month, year);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const minIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const maxIso = `${year}-${String(month).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

  /** null = full month; Set = scoped days */
  const activeDays = useMemo(() => {
    const from = parseToDate(range.from);
    if (!from) return null;

    const to = parseToDate(range.to) || from;
    let start = from.getDate();
    let end = to.getDate();

    if (from.getMonth() + 1 !== month || from.getFullYear() !== year) return new Set<number>();
    if (to.getMonth() + 1 !== month || to.getFullYear() !== year) {
      end = start;
    }
    if (start > end) { const tmp = start; start = end; end = tmp; }

    const set = new Set<number>();
    for (let d = Math.max(1, start); d <= Math.min(totalDays, end); d++) set.add(d);
    return set;
  }, [range, month, year, totalDays]);

  const scopeLabel = useMemo(() => {
    if (!activeDays) return t("staffHr.scopeAllMonth");
    if (activeDays.size === 0) return t("staffHr.scopePickDate");
    if (activeDays.size === 1) {
      const d = [...activeDays][0];
      return t("staffHr.scopeSingleDay", { day: d });
    }
    const sorted = [...activeDays].sort((a, b) => a - b);
    return t("staffHr.scopeRange", { from: sorted[0], to: sorted[sorted.length - 1] });
  }, [activeDays, t]);

  const updateRow = (index: number, patch: Partial<StaffAttendanceRow>) => {
    const next = [...rows];
    const row = { ...next[index]!, ...patch };
    if (patch.attendance) {
      row.presentDays = countStaffPresent(patch.attendance);
      row.absentDays = countStaffAbsent(patch.attendance);
      row.leaveDays = countStaffLeave(patch.attendance);
      row.halfDays = countStaffHalf(patch.attendance);
    }
    next[index] = row;
    onChange(next);
  };

  const cycleDay = (rowIdx: number, dayIdx: number) => {
    const dayNum = dayIdx + 1;
    if (!dayInScope(dayNum, activeDays)) return;
    const att = [...rows[rowIdx]!.attendance];
    att[dayIdx] = cycleStaffMark(att[dayIdx]);
    updateRow(rowIdx, { attendance: att });
  };

  const applyMark = (mark: "P" | "A" | null) => {
    if (activeDays && activeDays.size === 0) return;
    onChange(
      rows.map((row) => {
        const attendance = row.attendance.map((cur, idx) => {
          const dayNum = idx + 1;
          if (dayNum > totalDays) return null;
          if (!dayInScope(dayNum, activeDays)) return cur;
          return mark;
        });
        return {
          ...row,
          attendance,
          presentDays: countStaffPresent(attendance),
          absentDays: countStaffAbsent(attendance),
          leaveDays: countStaffLeave(attendance),
          halfDays: countStaffHalf(attendance),
        };
      })
    );
  };

  const isScoped = activeDays !== null && activeDays.size > 0;
  const scopeDisabled = !!activeDays && activeDays.size === 0;

  return (
    <div className="space-y-3">

      {/* ── Controls card ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Legend row */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">P = {t("staffHr.present")}</span>
          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold border border-red-200">A = {t("staffHr.absent")}</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">H = {t("staffHr.halfDay")}</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">L = {t("staffHr.leave")}</span>
          <span className="ml-auto text-slate-400 hidden sm:block">{t("staffHr.clickToMark")}</span>
        </div>

        {/* Date range picker row */}
        <div className="px-3 py-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {t("staffHr.selectRange")}
            </div>
            <div className="flex-1">
              <DateRangeField
                value={range}
                onChange={setRange}
                outputFormat="iso"
                min={minIso}
                max={maxIso}
                className="w-full"
                allowSingle
              />
            </div>
            {activeDays !== null && (
              <button
                type="button"
                onClick={() => setRange({ from: "", to: "" })}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 shrink-0 self-end sm:self-auto pb-1"
              >
                {t("staffHr.clearRange")}
              </button>
            )}
          </div>
        </div>

        {/* Scope label + bulk action buttons */}
        <div className="px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Scope badge */}
          <div className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border self-start",
            isScoped
              ? "bg-violet-50 border-violet-200 text-violet-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          )}>
            <CalendarDays className="h-3 w-3 shrink-0" />
            {scopeLabel}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
            <Button
              type="button"
              size="sm"
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto text-xs"
              onClick={() => applyMark("P")}
              disabled={scopeDisabled}
            >
              <CheckCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("staffHr.markAllPresent")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer border-red-200 text-red-700 hover:bg-red-50 w-full sm:w-auto text-xs"
              onClick={() => applyMark("A")}
              disabled={scopeDisabled}
            >
              <UserX className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("staffHr.markAllAbsent")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-100 w-full sm:w-auto text-xs"
              onClick={() => applyMark(null)}
              disabled={scopeDisabled}
            >
              <Eraser className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("staffHr.clearMarks")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Attendance table ───────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs" style={{ minWidth: `${140 + 80 + totalDays * 30 + 80}px` }}>
          <thead>
            <tr className="bg-slate-800 text-white">
              {/* Sticky name column */}
              <th className="p-2 text-left sticky left-0 z-20 bg-slate-800 min-w-[130px] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-600">
                {t("staffHr.staffName")}
              </th>
              {/* Designation — hidden on very small, shown from sm */}
              <th className="p-2 text-left hidden sm:table-cell min-w-[90px] max-w-[110px]">
                {t("staffPage.designation")}
              </th>
              {/* Day columns */}
              {days.map((d) => {
                const inScope = dayInScope(d, activeDays);
                return (
                  <th
                    key={d}
                    className={cn(
                      "p-0.5 w-7 text-center font-mono text-[11px]",
                      inScope && activeDays ? "bg-violet-600" : "",
                      !inScope && activeDays ? "opacity-30" : ""
                    )}
                  >
                    {d}
                  </th>
                );
              })}
              {/* Summary columns */}
              <th className="p-2 text-center min-w-[36px] bg-emerald-900/80">P</th>
              <th className="p-2 text-center min-w-[36px] bg-red-900/80">A</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.staffId} className="border-t border-slate-100 hover:bg-violet-50/30 transition-colors">
                {/* Sticky name */}
                <td className="p-2 sticky left-0 z-10 bg-white font-medium after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-slate-200">
                  <div className="leading-tight">{row.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.employeeId}</div>
                </td>
                {/* Designation */}
                <td className="p-2 text-slate-500 text-[11px] hidden sm:table-cell max-w-[110px]">
                  <span className="block truncate">{row.designation}</span>
                </td>
                {/* Day cells */}
                {days.map((d) => {
                  const di = d - 1;
                  const inScope = dayInScope(d, activeDays);
                  return (
                    <td key={d} className={cn("p-0.5", !inScope && activeDays && "opacity-25")}>
                      <button
                        type="button"
                        onClick={() => cycleDay(ri, di)}
                        disabled={!inScope}
                        title={`Day ${d}: ${row.attendance[di] || "—"}`}
                        className={cn(
                          "w-7 h-7 rounded border text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed select-none",
                          cellClass(row.attendance[di]),
                          inScope && activeDays && "ring-1 ring-violet-300"
                        )}
                      >
                        {row.attendance[di] || "·"}
                      </button>
                    </td>
                  );
                })}
                {/* Summary */}
                <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/60">{row.presentDays}</td>
                <td className="p-2 text-center font-bold text-red-600 bg-red-50/60">{row.absentDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile hint */}
      <p className="text-xs text-slate-400 text-center sm:hidden">
        ← {t("staffHr.scrollHint")} →
      </p>
    </div>
  );
}
