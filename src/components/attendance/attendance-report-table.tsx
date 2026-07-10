"use client";

import type { AttendanceStudentReport } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function percentClass(p: number) {
  if (p >= 75) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (p >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export function AttendanceReportTable({
  students,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  students: AttendanceStudentReport[];
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (student: AttendanceStudentReport) => void;
}) {
  const t = useT();

  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          s.grNumber.toLowerCase().includes(q)
      )
    : students;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{t("attendance.reportStudentList")}</h3>
          <p className="text-xs text-slate-500">{t("attendance.reportSearchHint")}</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={t("attendance.reportSearchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{t("attendance.roll")}</th>
              <th className="px-4 py-3">{t("attendance.student")}</th>
              <th className="px-4 py-3">GR</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">A</th>
              <th className="px-4 py-3 text-center">H</th>
              <th className="px-4 py-3 text-center">{t("attendance.monthTotal")}</th>
              <th className="px-4 py-3 text-center">%</th>
              <th className="px-4 py-3 text-center">{t("attendance.reportStatus")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.studentId}
                className={cn(
                  "border-b border-slate-50 transition-colors cursor-pointer hover:bg-blue-50/40",
                  selectedId === s.studentId && "bg-blue-50"
                )}
                onClick={() => onSelect(s)}
              >
                <td className="px-4 py-3 text-slate-500">{s.serial}</td>
                <td className="px-4 py-3 font-medium">{s.rollNumber || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.grNumber || "—"}</td>
                <td className="px-4 py-3 text-center font-semibold text-emerald-700">{s.present}</td>
                <td className="px-4 py-3 text-center font-semibold text-red-600">{s.absent}</td>
                <td className="px-4 py-3 text-center font-semibold text-amber-600">{s.half}</td>
                <td className="px-4 py-3 text-center font-bold text-blue-700">{s.monthTotal}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-bold", percentClass(s.percent))}>
                    {s.hasData ? `${s.percent}%` : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {s.hasData ? (
                    <span className="text-xs font-medium text-emerald-700">{t("attendance.reportMarked")}</span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">{t("attendance.reportNotMarked")}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(s);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("attendance.reportView")}
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                  {q ? t("attendance.reportNoSearchResults") : t("attendance.noStudents")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        {t("attendance.reportShowing", { shown: filtered.length, total: students.length })}
      </div>
    </div>
  );
}

export function AttendanceStudentDayGrid({
  attendance,
  monthLabel,
}: {
  attendance: (string | null)[];
  monthLabel: string;
}) {
  const t = useT();

  function cellClass(mark: string | null) {
    if (mark === "P") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (mark === "A") return "bg-red-100 text-red-800 border-red-200";
    if (mark === "H") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-50 text-slate-300 border-slate-100";
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{monthLabel}</p>
      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-1">
        {DAYS.map((d, i) => (
          <div key={d} className="text-center">
            <div className="mb-0.5 text-[10px] text-slate-400">{d}</div>
            <div
              className={cn(
                "mx-auto flex h-7 w-7 items-center justify-center rounded border text-[10px] font-bold",
                cellClass(attendance[i] ?? null)
              )}
            >
              {attendance[i] || "·"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span><span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300 mr-1" />P = {t("attendance.present")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300 mr-1" />A = {t("attendance.absent")}</span>
        <span><span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300 mr-1" />H = {t("attendance.halfDay")}</span>
      </div>
    </div>
  );
}
