"use client";

import { useLocale } from "@/i18n/locale-provider";
import {
  cellKey,
  entriesToGroupedMap,
  formatTime12h,
  hasAnyBreakAfter,
  maxPeriodCount,
  periodForDay,
  periodRowTimeLabel,
  breakAfterPeriod,
  type DayScheduleConfig,
  type TimetableCell,
} from "@/lib/timetable";
import { Fragment, useMemo, type CSSProperties } from "react";

export function TimetablePrintTable({
  title,
  subtitle,
  schoolName,
  academicYear,
  schedule,
  entries,
  footerNote,
}: {
  title: string;
  subtitle?: string;
  schoolName?: string;
  academicYear?: string;
  schedule: DayScheduleConfig[];
  entries: TimetableCell[];
  footerNote?: string;
}) {
  const { locale, t } = useLocale();
  const enabled = schedule.filter((d) => d.enabled);
  const maxPeriods = maxPeriodCount(schedule);
  const groupedMap = entriesToGroupedMap(entries);
  const periodIndices = Array.from({ length: maxPeriods }, (_, i) => i + 1);

  const hasLunch = useMemo(
    () => periodIndices.some((p) => hasAnyBreakAfter(schedule, p)),
    [periodIndices, schedule]
  );

  /** Fill A4 landscape printable height (~198mm) evenly across period rows */
  const rowHeightMm = useMemo(() => {
    const usable = 198 - 16 - 8 - 12 - (hasLunch ? 8 : 0); // page − header − footer − thead − lunch
    const n = Math.max(maxPeriods, 1);
    return Math.max(14, Math.min(22, Math.floor((usable / n) * 10) / 10));
  }, [maxPeriods, hasLunch]);

  return (
    <div className="tt-print-root">
      <div
        className="tt-print-sheet"
        style={
          {
            ["--tt-row-h" as string]: `${rowHeightMm}mm`,
            ["--tt-lunch-h" as string]: hasLunch ? "8mm" : "0mm",
          } as CSSProperties
        }
      >
        <div className="tt-print-header">
          {schoolName && <p className="tt-print-school">{schoolName}</p>}
          <div className="tt-print-title-row">
            <h1>{title}</h1>
            {subtitle && <span className="tt-print-sub">— {subtitle}</span>}
            {academicYear && (
              <span className="tt-print-year">
                | {t("classes.academicYear")}: {academicYear}
              </span>
            )}
          </div>
        </div>

        <table className="tt-print-table">
          <colgroup>
            <col className="tt-col-period" />
            {enabled.map((day) => (
              <col key={day.dayOfWeek} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="tt-print-period-col">{t("timetable.periodTime")}</th>
              {enabled.map((day) => (
                <th key={day.dayOfWeek}>
                  <div className="tt-print-day">
                    {locale === "gu" ? day.labelGu : day.labelEn}
                  </div>
                  <div className="tt-print-day-hours">
                    {formatTime12h(day.start)} – {formatTime12h(day.end)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodIndices.map((periodIndex) => {
              const rowTime = periodRowTimeLabel(schedule, periodIndex);
              return (
                <Fragment key={periodIndex}>
                  <tr className="tt-period-row">
                    <td className="tt-print-period-col">
                      <div className="tt-print-pnum">P{periodIndex}</div>
                      {rowTime && <div className="tt-print-ptime">{rowTime}</div>}
                    </td>
                    {enabled.map((day) => {
                      const period = periodForDay(schedule, day.dayOfWeek, periodIndex);
                      const cells = groupedMap.get(cellKey(day.dayOfWeek, periodIndex)) || [];
                      if (!period) {
                        return (
                          <td key={`${day.dayOfWeek}-${periodIndex}`} className="tt-print-empty">
                            —
                          </td>
                        );
                      }
                      return (
                        <td key={`${day.dayOfWeek}-${periodIndex}`}>
                          {cells.length ? (
                            <div className="tt-print-cell">
                              {cells.slice(0, 2).map((cell) => (
                                <div key={`${cell.classId}-${cell.subject}`} className="tt-print-slot">
                                  <div className="tt-print-subject">{cell.subject}</div>
                                  {cell.className && (
                                    <div className="tt-print-meta">{cell.className}</div>
                                  )}
                                  {cell.teacherName && !cell.className && (
                                    <div className="tt-print-meta">{cell.teacherName}</div>
                                  )}
                                  {cell.room && <div className="tt-print-room">{cell.room}</div>}
                                </div>
                              ))}
                              {cells.length > 2 && (
                                <div className="tt-print-meta">+{cells.length - 2} more</div>
                              )}
                            </div>
                          ) : (
                            <div className="tt-print-empty">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {hasAnyBreakAfter(schedule, periodIndex) && (
                    <tr className="tt-lunch-row">
                      <td className="tt-print-period-col tt-print-lunch-label">
                        {t("timetable.lunchBreak")}
                      </td>
                      {enabled.map((day) => {
                        const br = breakAfterPeriod(schedule, day.dayOfWeek, periodIndex);
                        return (
                          <td key={`br-${day.dayOfWeek}`} className="tt-print-lunch-cell">
                            {br ? `${formatTime12h(br.start)} – ${formatTime12h(br.end)}` : ""}
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

        {footerNote && <p className="tt-print-footer">{footerNote}</p>}
      </div>
    </div>
  );
}
