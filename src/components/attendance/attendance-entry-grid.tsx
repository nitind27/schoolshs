"use client";

import { useCallback, useRef } from "react";
import type { AttendanceRow } from "@/lib/attendance";
import { cycleMark, countMonthPresent } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface Props {
  rows: AttendanceRow[];
  onChange: (rows: AttendanceRow[]) => void;
}

function cellClass(mark: string | null) {
  if (mark === "P") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (mark === "A") return "bg-red-100 text-red-800 border-red-300";
  if (mark === "H") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";
}

export function AttendanceEntryGrid({ rows, onChange }: Props) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement>(null);

  const updateRow = (index: number, patch: Partial<AttendanceRow>) => {
    const next = [...rows];
    const row = { ...next[index]!, ...patch };
    if (patch.attendance) {
      const mt = countMonthPresent(patch.attendance);
      const prev = parseInt(row.prevTotal || "0", 10) || 0;
      row.monthTotal = String(mt);
      row.cumulative = String(prev + mt);
    }
    next[index] = row;
    onChange(next);
  };

  const setDayForAll = (dayIndex: number, mark: "P" | "A" | null) => {
    onChange(
      rows.map((row) => {
        const attendance = [...row.attendance];
        attendance[dayIndex] = mark;
        const mt = countMonthPresent(attendance);
        const prev = parseInt(row.prevTotal || "0", 10) || 0;
        return { ...row, attendance, monthTotal: String(mt), cumulative: String(prev + mt) };
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, dayIdx: number) => {
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      const att = [...rows[rowIdx]!.attendance];
      att[dayIdx] = "P";
      updateRow(rowIdx, { attendance: att });
    } else if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      const att = [...rows[rowIdx]!.attendance];
      att[dayIdx] = "A";
      updateRow(rowIdx, { attendance: att });
    } else if (e.key === "ArrowRight" && dayIdx < 30) {
      e.preventDefault();
      const next = gridRef.current?.querySelector(`[data-cell="${rowIdx}-${dayIdx + 1}"]`) as HTMLElement;
      next?.focus();
    } else if (e.key === "ArrowLeft" && dayIdx > 0) {
      e.preventDefault();
      const prev = gridRef.current?.querySelector(`[data-cell="${rowIdx}-${dayIdx - 1}"]`) as HTMLElement;
      prev?.focus();
    } else if (e.key === "ArrowDown" && rowIdx < rows.length - 1) {
      e.preventDefault();
      const down = gridRef.current?.querySelector(`[data-cell="${rowIdx + 1}-${dayIdx}"]`) as HTMLElement;
      down?.focus();
    } else if (e.key === "ArrowUp" && rowIdx > 0) {
      e.preventDefault();
      const up = gridRef.current?.querySelector(`[data-cell="${rowIdx - 1}-${dayIdx}"]`) as HTMLElement;
      up?.focus();
    }
  };

  return (
    <div ref={gridRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-xs">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="sticky left-0 z-20 bg-slate-800 px-2 py-2 text-left w-8">{t("attendance.serial")}</th>
            <th className="sticky left-8 z-20 bg-slate-800 px-2 py-2 text-left w-12">{t("attendance.roll")}</th>
            <th className="sticky left-20 z-20 bg-slate-800 px-2 py-2 text-left min-w-[140px]">{t("attendance.student")}</th>
            {DAYS.map((d, di) => (
              <th key={d} className="px-0.5 py-1 text-center w-7 font-medium">
                <button
                  type="button"
                  className="w-full rounded hover:bg-slate-700 py-0.5"
                  title={t("attendance.markAllPresent")}
                  onClick={() => setDayForAll(di, "P")}
                >
                  {d}
                </button>
              </th>
            ))}
            <th className="px-2 py-2 w-12">{t("attendance.monthTotal")}</th>
            <th className="px-2 py-2 w-12">{t("attendance.prevMonth")}</th>
            <th className="px-2 py-2 w-12">{t("attendance.cumulative")}</th>
            <th className="px-2 py-2 min-w-[80px]">{t("attendance.note")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.studentId} className={cn("border-t border-slate-100", ri % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
              <td className="sticky left-0 z-10 bg-inherit px-2 py-1 font-medium text-slate-600">{row.serial}</td>
              <td className="sticky left-8 z-10 bg-inherit px-2 py-1 text-slate-600">{row.rollNumber}</td>
              <td className="sticky left-20 z-10 bg-inherit px-2 py-1 font-medium text-slate-900 truncate max-w-[140px]" title={row.name}>
                {row.name}
              </td>
              {row.attendance.map((mark, di) => (
                <td key={di} className="p-0.5">
                  <button
                    type="button"
                    data-cell={`${ri}-${di}`}
                    className={cn(
                      "w-7 h-7 rounded border text-[10px] font-bold transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none",
                      cellClass(mark)
                    )}
                    onClick={() => {
                      const att = [...row.attendance];
                      att[di] = cycleMark(mark);
                      updateRow(ri, { attendance: att });
                    }}
                    onKeyDown={(e) => handleKeyDown(e, ri, di)}
                  >
                    {mark || "·"}
                  </button>
                </td>
              ))}
              <td className="px-2 py-1 text-center font-bold text-emerald-700">{row.monthTotal}</td>
              <td className="px-2 py-1 text-center text-slate-600">{row.prevTotal}</td>
              <td className="px-2 py-1 text-center font-semibold text-blue-700">{row.cumulative}</td>
              <td className="px-1 py-1">
                <input
                  className="w-full rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                  value={row.note}
                  onChange={(e) => updateRow(ri, { note: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
        <span><span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300 mr-1" />P = {t("attendance.present")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300 mr-1" />A = {t("attendance.absent")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300 mr-1" />H = {t("attendance.halfDay")}</span>
        <span>{t("attendance.clickHint")}</span>
      </div>
    </div>
  );
}
