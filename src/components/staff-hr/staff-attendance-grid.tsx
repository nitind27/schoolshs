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
import { CheckCheck, Eraser, UserX } from "lucide-react";

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

    // One click = single day; two clicks = range (to may equal from)
    const to = parseToDate(range.to) || from;

    let start = from.getDate();
    let end = to.getDate();

    if (from.getMonth() + 1 !== month || from.getFullYear() !== year) return new Set<number>();
    if (to.getMonth() + 1 !== month || to.getFullYear() !== year) {
      end = start;
    }
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

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

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            P = {t("staffHr.present")}
          </span>
          <span className="px-2 py-1 rounded-md bg-red-100 text-red-800 font-bold border border-red-200">
            A = {t("staffHr.absent")}
          </span>
          <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
            H = {t("staffHr.halfDay")}
          </span>
          <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">
            L = {t("staffHr.leave")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <DateRangeField
            value={range}
            onChange={setRange}
            outputFormat="iso"
            min={minIso}
            max={maxIso}
            className="w-full sm:w-72"
            allowSingle
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
              {scopeLabel}
            </span>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              onClick={() => applyMark("P")}
              disabled={!!activeDays && activeDays.size === 0}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("staffHr.markAllPresent")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => applyMark("A")}
              disabled={!!activeDays && activeDays.size === 0}
            >
              <UserX className="h-3.5 w-3.5" />
              {t("staffHr.markAllAbsent")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-100"
              onClick={() => applyMark(null)}
              disabled={!!activeDays && activeDays.size === 0}
            >
              <Eraser className="h-3.5 w-3.5" />
              {t("staffHr.clearMarks")}
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2 text-left sticky left-0 bg-slate-800 z-10 min-w-[140px]">
                {t("staffHr.staffName")}
              </th>
              <th className="p-2 text-left">{t("staffPage.designation")}</th>
              {days.map((d) => {
                const inScope = dayInScope(d, activeDays);
                return (
                  <th
                    key={d}
                    className={cn(
                      "p-1 w-7 text-center font-mono",
                      inScope && activeDays ? "bg-violet-600" : "",
                      !inScope && activeDays ? "opacity-35" : ""
                    )}
                  >
                    {d}
                  </th>
                );
              })}
              <th className="p-2 text-center">{t("staffHr.present")}</th>
              <th className="p-2 text-center">{t("staffHr.absent")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.staffId} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="p-2 sticky left-0 bg-white z-10 font-medium">
                  <div>{row.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{row.employeeId}</div>
                </td>
                <td className="p-2 text-slate-600">{row.designation}</td>
                {days.map((d) => {
                  const di = d - 1;
                  const inScope = dayInScope(d, activeDays);
                  return (
                    <td key={d} className={cn("p-0.5", !inScope && activeDays && "opacity-30")}>
                      <button
                        type="button"
                        onClick={() => cycleDay(ri, di)}
                        disabled={!inScope}
                        className={cn(
                          "w-7 h-7 rounded border text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-not-allowed",
                          cellClass(row.attendance[di]),
                          inScope && activeDays && "ring-1 ring-violet-300"
                        )}
                      >
                        {row.attendance[di] || "·"}
                      </button>
                    </td>
                  );
                })}
                <td className="p-2 text-center font-bold text-emerald-700">{row.presentDays}</td>
                <td className="p-2 text-center font-bold text-red-600">{row.absentDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
