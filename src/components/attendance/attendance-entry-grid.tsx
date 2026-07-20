"use client";

import { useRef, type CSSProperties } from "react";
import type { AttendanceRow } from "@/lib/attendance";
import { cycleMark, countMonthPresent } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Fixed widths so sticky `left` offsets never leave a gap for day cells to bleed through */
const W_SERIAL = 40;
const W_ROLL = 72;
const W_NAME = 160;
const LEFT_SERIAL = 0;
const LEFT_ROLL = W_SERIAL;
const LEFT_NAME = W_SERIAL + W_ROLL;

interface Props {
  rows: AttendanceRow[];
  onChange: (rows: AttendanceRow[]) => void;
  /** Persist a single roll number immediately (blur). */
  onRollSave?: (studentId: string, rollNumber: string) => Promise<void> | void;
  /** 0-based day indices to show (default all 31). */
  visibleDayIndices?: number[];
  /** 0-based day to highlight (focus date). */
  highlightDayIndex?: number | null;
  /** Allow editing roll numbers (default true). */
  editableRoll?: boolean;
}

function cellClass(mark: string | null) {
  if (mark === "P") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (mark === "A") return "bg-red-100 text-red-800 border-red-300";
  if (mark === "H") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";
}

function stickyStyle(left: number, width: number, zIndex: number, bg: string): CSSProperties {
  return {
    position: "sticky",
    left,
    width,
    minWidth: width,
    maxWidth: width,
    zIndex,
    backgroundColor: bg,
    boxSizing: "border-box",
  };
}

export function AttendanceEntryGrid({
  rows,
  onChange,
  onRollSave,
  visibleDayIndices,
  highlightDayIndex = null,
  editableRoll = true,
}: Props) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement>(null);
  const dayIndices = visibleDayIndices?.length
    ? visibleDayIndices
    : DAYS.map((_, i) => i);

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
    const colPos = dayIndices.indexOf(dayIdx);
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
    } else if (e.key === "ArrowRight" && colPos >= 0 && colPos < dayIndices.length - 1) {
      e.preventDefault();
      const nextDi = dayIndices[colPos + 1]!;
      const next = gridRef.current?.querySelector(`[data-cell="${rowIdx}-${nextDi}"]`) as HTMLElement;
      next?.focus();
    } else if (e.key === "ArrowLeft" && colPos > 0) {
      e.preventDefault();
      const prevDi = dayIndices[colPos - 1]!;
      const prev = gridRef.current?.querySelector(`[data-cell="${rowIdx}-${prevDi}"]`) as HTMLElement;
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
      {/* border-separate fixes sticky bleed; fixed left/width prevents gaps between sticky cols */}
      <table
        className="w-full border-separate border-spacing-0 text-xs"
        style={{ minWidth: Math.max(640, 256 + dayIndices.length * 28 + 200) }}
      >
        <thead>
          <tr className="text-white">
            <th
              className="px-2 py-2 text-left font-medium"
              style={stickyStyle(LEFT_SERIAL, W_SERIAL, 40, "#1e293b")}
            >
              {t("attendance.serial")}
            </th>
            <th
              className="px-2 py-2 text-left font-medium"
              style={stickyStyle(LEFT_ROLL, W_ROLL, 41, "#1e293b")}
            >
              {t("attendance.roll")}
            </th>
            <th
              className="px-2 py-2 text-left font-medium border-r border-slate-600"
              style={{
                ...stickyStyle(LEFT_NAME, W_NAME, 42, "#1e293b"),
                boxShadow: "4px 0 8px -2px rgba(0,0,0,0.35)",
              }}
            >
              {t("attendance.student")}
            </th>
            {dayIndices.map((di) => {
              const d = di + 1;
              const highlighted = highlightDayIndex === di;
              return (
                <th
                  key={d}
                  className={cn(
                    "px-0.5 py-1 text-center w-7 font-medium",
                    highlighted ? "bg-teal-700" : "bg-slate-800"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded py-0.5",
                      highlighted ? "hover:bg-teal-600" : "hover:bg-slate-700"
                    )}
                    title={t("attendance.markAllPresent")}
                    onClick={() => setDayForAll(di, "P")}
                  >
                    {d}
                  </button>
                </th>
              );
            })}
            <th className="bg-slate-800 px-2 py-2 w-12">{t("attendance.monthTotal")}</th>
            <th className="bg-slate-800 px-2 py-2 w-12">{t("attendance.prevMonth")}</th>
            <th className="bg-slate-800 px-2 py-2 w-12">{t("attendance.cumulative")}</th>
            <th className="bg-slate-800 px-2 py-2 min-w-[80px]">{t("attendance.note")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const odd = ri % 2 === 1;
            const bg = odd ? "#f8fafc" : "#ffffff";
            return (
              <tr key={row.studentId}>
                <td
                  className="px-2 py-1.5 font-medium text-slate-600 border-t border-slate-100"
                  style={stickyStyle(LEFT_SERIAL, W_SERIAL, 20, bg)}
                >
                  {row.serial}
                </td>
                <td
                  className="px-1 py-1 border-t border-slate-100"
                  style={stickyStyle(LEFT_ROLL, W_ROLL, 21, bg)}
                >
                  {editableRoll ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full h-7 rounded-md border border-slate-200 bg-white px-1.5 text-center text-[11px] font-semibold text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                      value={row.rollNumber}
                      title={t("attendance.rollEditHint")}
                      aria-label={t("attendance.roll")}
                      onChange={(e) => {
                        const rollNumber = e.target.value.replace(/[^\dA-Za-z\-]/g, "").slice(0, 8);
                        updateRow(ri, { rollNumber });
                      }}
                      onBlur={async (e) => {
                        const rollNumber = e.target.value.trim();
                        if (onRollSave) {
                          try {
                            await onRollSave(row.studentId, rollNumber);
                          } catch {
                            // parent shows error
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  ) : (
                    <span className="block px-1 text-slate-600">{row.rollNumber}</span>
                  )}
                </td>
                <td
                  className="px-2 py-1.5 font-medium text-slate-900 truncate border-t border-slate-100 border-r border-slate-200"
                  style={{
                    ...stickyStyle(LEFT_NAME, W_NAME, 22, bg),
                    boxShadow: "4px 0 8px -2px rgba(15,23,42,0.14)",
                  }}
                  title={row.name}
                >
                  {row.name}
                </td>
                {dayIndices.map((di) => {
                  const mark = row.attendance[di] ?? null;
                  const highlighted = highlightDayIndex === di;
                  return (
                    <td
                      key={di}
                      className={cn(
                        "p-0.5 border-t border-slate-100 relative z-0",
                        highlighted && "bg-teal-50"
                      )}
                      style={{ backgroundColor: highlighted ? undefined : bg }}
                    >
                      <button
                        type="button"
                        data-cell={`${ri}-${di}`}
                        className={cn(
                          "w-7 h-7 rounded border text-[10px] font-bold transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none",
                          cellClass(mark),
                          highlighted && "ring-2 ring-teal-400"
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
                  );
                })}
                <td className="px-2 py-1 text-center font-bold text-emerald-700 border-t border-slate-100" style={{ backgroundColor: bg }}>
                  {row.monthTotal}
                </td>
                <td className="px-2 py-1 text-center text-slate-600 border-t border-slate-100" style={{ backgroundColor: bg }}>
                  {row.prevTotal}
                </td>
                <td className="px-2 py-1 text-center font-semibold text-blue-700 border-t border-slate-100" style={{ backgroundColor: bg }}>
                  {row.cumulative}
                </td>
                <td className="px-1 py-1 border-t border-slate-100" style={{ backgroundColor: bg }}>
                  <input
                    className="w-full rounded border border-slate-200 px-1 py-0.5 text-[10px] bg-white"
                    value={row.note}
                    onChange={(e) => updateRow(ri, { note: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
        <span><span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300 mr-1" />P = {t("attendance.present")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300 mr-1" />A = {t("attendance.absent")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300 mr-1" />H = {t("attendance.halfDay")}</span>
        <span>{t("attendance.clickHint")}</span>
        {editableRoll && (
          <span className="text-blue-700 font-medium">{t("attendance.rollEditHint")}</span>
        )}
      </div>
    </div>
  );
}
