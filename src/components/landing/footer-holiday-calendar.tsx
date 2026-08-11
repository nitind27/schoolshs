"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  buildMonthGrid,
  getCalendarMarkedHolidays,
  getPublicHolidays,
  isoOf,
  isoToday,
  type HolidayEntry,
} from "@/lib/holidays/public-holidays";

const MONTH_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_GU = [
  "જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન",
  "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર",
];
const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_GU = ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"];

type Props = {
  extraHolidays?: HolidayEntry[];
  className?: string;
};

export function FooterHolidayCalendar({ extraHolidays = [], className }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const todayIso = isoToday(now);
  const months = locale === "gu" ? MONTH_GU : MONTH_EN;
  const days = locale === "gu" ? DAY_GU : DAY_EN;

  const holidayByDate = useMemo(() => {
    const map = new Map<string, HolidayEntry>();
    for (const h of getCalendarMarkedHolidays(cursor.y)) map.set(h.date, h);
    for (const h of extraHolidays) {
      if (h.date.startsWith(`${cursor.y}-`) && (h.type === "public" || h.type === "school")) {
        map.set(h.date, h);
      }
    }
    return map;
  }, [cursor.y, extraHolidays]);

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor.y, cursor.m]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const downloadList = () => {
    const rows = getPublicHolidays(cursor.y);
    const csvCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const gu = locale === "gu";
    const typeLabel: Record<string, string> = gu
      ? { public: "જાહેર રજા", school: "શાળા રજા", optional: "વૈકલ્પિક રજા" }
      : { public: "public", school: "school", optional: "optional" };
    const header = gu
      ? ["તારીખ", "નામ", "ગુજરાતી નામ", "પ્રકાર"]
      : ["Date", "Name", "Name (Gujarati)", "Type"];
    const body = rows
      .map((h) => {
        const [y, m, d] = h.date.split("-");
        const displayDate = d && m && y ? `${d}-${m}-${y}` : h.date;
        return [displayDate, h.name, h.nameGu, typeLabel[h.type] || h.type].map(csvCell).join(",");
      })
      .join("\r\n");
    // UTF-8 BOM so Excel (Windows) shows Gujarati correctly
    const blob = new Blob([`\uFEFF${header.map(csvCell).join(",")}\r\n${body}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = gu ? `રજાઓની-સૂચિ-${cursor.y}.csv` : `holidays-${cursor.y}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={["lp-cal", className].filter(Boolean).join(" ")}>
      <div className="lp-cal-nav">
        <button type="button" className="lp-cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label={t("landing.calPrev")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="lp-cal-title">
          {months[cursor.m]} {cursor.y}
        </h3>
        <button type="button" className="lp-cal-nav-btn" onClick={() => shiftMonth(1)} aria-label={t("landing.calNext")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="lp-cal-dow" aria-hidden>
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="lp-cal-grid" role="grid" aria-label={t("landing.calTitle")}>
        {grid.map((day, i) => {
          if (day == null) {
            return <span key={`e-${i}`} className="lp-cal-cell lp-cal-empty" />;
          }
          const iso = isoOf(cursor.y, cursor.m, day);
          const dow = new Date(cursor.y, cursor.m, day).getDay();
          const hol = holidayByDate.get(iso);
          const isToday = iso === todayIso;
          const isSunday = dow === 0;
          const classes = [
            "lp-cal-cell",
            isSunday && "lp-cal-sunday",
            hol && "lp-cal-holiday",
            isToday && "lp-cal-today",
          ]
            .filter(Boolean)
            .join(" ");

          const label = hol
            ? `${day} — ${locale === "gu" ? hol.nameGu || hol.name : hol.name}`
            : isSunday
              ? `${day} — ${t("landing.calWeeklyHoliday")}`
              : String(day);

          return (
            <span
              key={iso}
              className={classes}
              title={label}
              aria-label={label}
              role="gridcell"
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className="lp-cal-footer">
        <div className="lp-cal-legend">
          <span className="lp-cal-leg">
            <i className="lp-cal-swatch lp-cal-swatch-green" aria-hidden />
            {t("landing.calPublicHoliday")}
          </span>
          <span className="lp-cal-leg">
            <i className="lp-cal-swatch lp-cal-swatch-red" aria-hidden />
            {t("landing.calWeeklyHoliday")}
          </span>
        </div>
        <button type="button" className="lp-cal-download" onClick={downloadList}>
          <span className="lp-cal-download-icon" aria-hidden>
            <Download className="h-3.5 w-3.5" />
          </span>
          {t("landing.calHolidayList")}
        </button>
      </div>
    </div>
  );
}
