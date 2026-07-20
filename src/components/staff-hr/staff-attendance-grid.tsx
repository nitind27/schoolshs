"use client";

import type { StaffAttendanceRow } from "@/lib/staff-hr";
import {
  cycleStaffMark,
  countStaffAbsent,
  countStaffHalf,
  countStaffLeave,
  countStaffPresent,
} from "@/lib/staff-hr";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function cellClass(mark: string | null) {
  if (mark === "P") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (mark === "A") return "bg-red-100 text-red-800 border-red-300";
  if (mark === "H") return "bg-amber-100 text-amber-800 border-amber-300";
  if (mark === "L") return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";
}

export function StaffAttendanceGrid({
  rows,
  onChange,
}: {
  rows: StaffAttendanceRow[];
  onChange: (rows: StaffAttendanceRow[]) => void;
}) {
  const t = useT();

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
    const att = [...rows[rowIdx]!.attendance];
    att[dayIdx] = cycleStaffMark(att[dayIdx]);
    updateRow(rowIdx, { attendance: att });
  };

  const markAll = (mark: "P" | "A") => {
    onChange(
      rows.map((row) => {
        const attendance = row.attendance.map(() => mark);
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
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">P = {t("staffHr.present")}</span>
        <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-bold">A = {t("staffHr.absent")}</span>
        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">H = {t("staffHr.halfDay")}</span>
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold">L = {t("staffHr.leave")}</span>
        <button type="button" onClick={() => markAll("P")} className="ml-auto px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
          {t("staffHr.markAllPresent")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2 text-left sticky left-0 bg-slate-800 z-10 min-w-[140px]">{t("staffHr.staffName")}</th>
              <th className="p-2 text-left">{t("staffPage.designation")}</th>
              {DAYS.map((d) => (
                <th key={d} className="p-1 w-7 text-center font-mono">{d}</th>
              ))}
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
                {DAYS.map((_, di) => (
                  <td key={di} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => cycleDay(ri, di)}
                      className={cn(
                        "w-7 h-7 rounded border text-[10px] font-bold transition-colors",
                        cellClass(row.attendance[di])
                      )}
                    >
                      {row.attendance[di] || "·"}
                    </button>
                  </td>
                ))}
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
