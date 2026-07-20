"use client";

import { useCallback, useMemo, useState, Fragment } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import {
  cellKey,
  entriesToGroupedMap,
  entriesToMap,
  formatTime12h,
  hasAnyBreakAfter,
  maxPeriodCount,
  periodForDay,
  periodRowTimeLabel,
  breakAfterPeriod,
  subjectColors,
  type DayScheduleConfig,
  type TimetableCell,
} from "@/lib/timetable";
import { TimetableCellEditor } from "@/components/timetable/timetable-cell-editor";
import { Coffee, Plus } from "lucide-react";

type StaffOption = { id: string; firstName: string; lastName: string; designation: string };

type EditTarget = {
  dayOfWeek: number;
  periodIndex: number;
  dayLabel: string;
  periodLabel: string;
  timeLabel: string;
};

export function TimetableGrid({
  schedule,
  entries,
  staff,
  onSaveCell,
  readOnly = false,
  showClassInCell = false,
}: {
  schedule: DayScheduleConfig[];
  entries: TimetableCell[];
  staff: StaffOption[];
  onSaveCell?: (data: {
    dayOfWeek: number;
    periodIndex: number;
    subject: string;
    teacherId: string;
    room: string;
  }) => Promise<void>;
  readOnly?: boolean;
  showClassInCell?: boolean;
}) {
  const { locale, t } = useLocale();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const enabled = useMemo(() => schedule.filter((d) => d.enabled), [schedule]);
  const maxPeriods = useMemo(() => maxPeriodCount(schedule), [schedule]);
  const cellMap = useMemo(() => entriesToMap(entries), [entries]);
  const groupedMap = useMemo(() => entriesToGroupedMap(entries), [entries]);

  const openEditor = (dayOfWeek: number, periodIndex: number) => {
    if (readOnly || !onSaveCell) return;
    const day = enabled.find((d) => d.dayOfWeek === dayOfWeek);
    const period = periodForDay(schedule, dayOfWeek, periodIndex);
    if (!day || !period) return;
    setEditTarget({
      dayOfWeek,
      periodIndex,
      dayLabel: locale === "gu" ? day.labelGu : day.labelEn,
      periodLabel: t("timetable.periodN", { n: periodIndex }),
      timeLabel: `${formatTime12h(period.start)} – ${formatTime12h(period.end)}`,
    });
  };

  const currentCell = editTarget ? cellMap.get(cellKey(editTarget.dayOfWeek, editTarget.periodIndex)) : null;

  const handleSave = useCallback(
    async (data: { subject: string; teacherId: string; room: string }) => {
      if (!editTarget || !onSaveCell) return;
      await onSaveCell({
        dayOfWeek: editTarget.dayOfWeek,
        periodIndex: editTarget.periodIndex,
        ...data,
      });
    },
    [editTarget, onSaveCell],
  );

  const periodIndices = Array.from({ length: maxPeriods }, (_, i) => i + 1);

  return (
    <>
      <div className="timetable-grid-wrap overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="timetable-grid w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <th className="tt-corner-cell sticky left-0 z-20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("timetable.periodTime")}
                </span>
              </th>
              {enabled.map((day) => (
                <th key={day.dayOfWeek} className="tt-day-head">
                  <span className="block text-sm font-bold text-white">
                    {locale === "gu" ? day.labelGu : day.labelEn}
                  </span>
                  <span className="block text-[10px] font-medium text-blue-100 mt-0.5">
                    {day.short} · {formatTime12h(day.start)}–{formatTime12h(day.end)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodIndices.map((periodIndex) => {
              const rowTime = periodRowTimeLabel(schedule, periodIndex);
              return (
                <Fragment key={periodIndex}>
                  <tr>
                    <td className="tt-period-cell sticky left-0 z-10">
                      <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm">
                          {periodIndex}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-700">
                          {t("timetable.periodN", { n: periodIndex })}
                        </span>
                        {rowTime && (
                          <span className="text-center text-[10px] font-medium leading-tight text-slate-500">
                            {rowTime}
                          </span>
                        )}
                      </div>
                    </td>
                    {enabled.map((day) => {
                      const period = periodForDay(schedule, day.dayOfWeek, periodIndex);
                      const cells = groupedMap.get(cellKey(day.dayOfWeek, periodIndex)) || [];
                      const cell = cells[0];
                      const colors = cell?.subject ? subjectColors(cell.subject) : null;

                      if (!period) {
                        return (
                          <td key={`${day.dayOfWeek}-${periodIndex}`} className="tt-slot-cell p-1">
                            <div className="tt-slot-btn flex min-h-[72px] items-center justify-center rounded-xl border border-slate-100 bg-slate-100/50">
                              <span className="text-xs text-slate-300">—</span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={`${day.dayOfWeek}-${periodIndex}`} className="tt-slot-cell p-1">
                          <button
                            type="button"
                            disabled={readOnly || !onSaveCell}
                            onClick={() => openEditor(day.dayOfWeek, periodIndex)}
                            className={cn(
                              "tt-slot-btn group h-full min-h-[72px] w-full rounded-xl border-2 border-dashed transition-all",
                              cell?.subject
                                ? cn(colors!.bg, colors!.border, colors!.text, "border-solid shadow-sm hover:shadow-md")
                                : "border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/50",
                              !readOnly && onSaveCell && "cursor-pointer",
                            )}
                          >
                            <div className="flex w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-center">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {formatTime12h(period.start)}–{formatTime12h(period.end)}
                              </span>
                              {cell?.subject ? (
                                showClassInCell && cells.length > 1 ? (
                                  <div className="flex w-full flex-col gap-1">
                                    {cells.map((c) => {
                                      const cc = subjectColors(c.subject);
                                      return (
                                        <div
                                          key={`${c.classId}-${c.subject}`}
                                          className={cn("rounded-md border px-1 py-0.5", cc.bg, cc.border, cc.text)}
                                        >
                                          <span className="block text-[10px] font-bold leading-tight line-clamp-1">
                                            {c.subject}
                                          </span>
                                          {c.className && (
                                            <span className="block text-[9px] font-semibold opacity-80">
                                              {c.className}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <>
                                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colors!.dot)} />
                                    <span className="text-xs font-bold leading-tight line-clamp-2">{cell.subject}</span>
                                    {showClassInCell && cell.className && (
                                      <span className="text-[10px] font-semibold opacity-80">{cell.className}</span>
                                    )}
                                    {cell.teacherName && !showClassInCell && (
                                      <span className="text-[10px] opacity-75 line-clamp-1">{cell.teacherName}</span>
                                    )}
                                    {cell.room && <span className="text-[9px] opacity-60">Rm {cell.room}</span>}
                                  </>
                                )
                              ) : !readOnly && onSaveCell ? (
                                <Plus className="mt-1 h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {hasAnyBreakAfter(schedule, periodIndex) && (
                    <tr>
                      <td className="tt-lunch-label sticky left-0 z-10">
                        <div className="flex flex-col items-center gap-0.5 py-1">
                          <Coffee className="h-4 w-4 text-amber-600" />
                          <span className="text-[9px] font-medium text-amber-800">{t("timetable.lunchBreak")}</span>
                        </div>
                      </td>
                      {enabled.map((day) => {
                        const br = breakAfterPeriod(schedule, day.dayOfWeek, periodIndex);
                        return (
                          <td key={`br-${day.dayOfWeek}-${periodIndex}`} className="tt-lunch-row p-0">
                            {br ? (
                              <div className="flex items-center justify-center gap-2 px-1 py-2 text-center">
                                <span className="text-xs font-bold text-amber-900">{t("timetable.lunchBreak")}</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                                  {formatTime12h(br.start)} – {formatTime12h(br.end)}
                                </span>
                              </div>
                            ) : (
                              <div className="bg-slate-50/50 py-2" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          {Array.from(new Set(entries.map((e) => e.subject).filter(Boolean))).map((subject) => {
            const c = subjectColors(subject);
            return (
              <span
                key={subject}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  c.bg,
                  c.border,
                  c.text,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                {subject}
              </span>
            );
          })}
        </div>
      )}

      {onSaveCell && (
        <TimetableCellEditor
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          dayLabel={editTarget?.dayLabel || ""}
          periodLabel={editTarget?.periodLabel || ""}
          timeLabel={editTarget?.timeLabel || ""}
          initialSubject={currentCell?.subject || ""}
          initialTeacherId={currentCell?.teacherId || ""}
          initialRoom={currentCell?.room || ""}
          staff={staff}
          onSave={handleSave}
        />
      )}
    </>
  );
}
