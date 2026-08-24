"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  formatDateOut,
  parseToDate,
  type DateOutputFormat,
} from "@/components/ui/date-field";
import "./date-picker.css";

const PANEL_W = 300;
const PANEL_EST_H = 360;
const VIEWPORT_PAD = 8;
const PANEL_GAP = 6;

type PanelCoords = {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(viewYear: number, viewMonth: number) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = (first.getDay() + 6) % 7;
  const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth - 1, prevDays - i), outside: true });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), outside: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = cells.length - (startPad + dim) + 1;
    cells.push({ date: new Date(viewYear, viewMonth + 1, next), outside: true });
  }
  return cells.slice(0, 42);
}

export type DateRangeValue = {
  from: string;
  to: string;
};

export type DateRangeFieldProps = {
  label?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  outputFormat?: DateOutputFormat;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  /** Allow picking one day only (from === to) */
  allowSingle?: boolean;
};

/**
 * One calendar for date OR date-range.
 * 1st click = start, 2nd click = end (range highlight / slide between).
 * Same-day second click (or allowSingle) keeps a single date.
 */
export function DateRangeField({
  label,
  value,
  onChange,
  outputFormat = "iso",
  min,
  max,
  className,
  disabled,
  allowSingle = true,
}: DateRangeFieldProps) {
  const autoId = useId();
  const t = useT();
  const { locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fromDate = parseToDate(value.from);
  const toDate = parseToDate(value.to);
  const minDate = parseToDate(min);
  const maxDate = parseToDate(max);
  const today = startOfDay(new Date());

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [headPick, setHeadPick] = useState<"month" | "year" | null>(null);
  const [view, setView] = useState(() => {
    const base = fromDate || today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setHeadPick(null);
      return;
    }
    const base = fromDate || today;
    setView({ y: base.getFullYear(), m: base.getMonth() });
    setPickingEnd(false);
    setDraftStart(null);
    setHoverDay(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePosition = useCallback(() => {
    const el = controlRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportWidth = vv?.width ?? window.innerWidth;
    const viewportHeight = vv?.height ?? window.innerHeight;
    const viewportTop = vv?.offsetTop ?? 0;
    const viewportLeft = vv?.offsetLeft ?? 0;
    // Always use a compact fixed calendar width — never stretch to the input.
    const width = Math.min(PANEL_W, Math.max(0, viewportWidth - VIEWPORT_PAD * 2));
    const spaceBelow = viewportTop + viewportHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - viewportTop - VIEWPORT_PAD;
    const placeTop = spaceBelow < PANEL_EST_H && spaceAbove > spaceBelow;
    let left = rect.left;
    left = Math.max(
      viewportLeft + VIEWPORT_PAD,
      Math.min(left, viewportLeft + viewportWidth - width - VIEWPORT_PAD),
    );
    setCoords({
      top: placeTop ? rect.top - PANEL_GAP : rect.bottom + PANEL_GAP,
      left,
      width,
      placement: placeTop ? "top" : "bottom",
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onReposition);
    vv?.addEventListener("scroll", onReposition);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      vv?.removeEventListener("resize", onReposition);
      vv?.removeEventListener("scroll", onReposition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("select.shs-dp__select") || el?.tagName === "OPTION") return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const intlLocale = locale === "gu" ? "gu-IN" : "en-IN";
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(intlLocale, { month: "short" }).format(new Date(2024, i, 1)),
      ),
    [intlLocale],
  );
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(intlLocale, { weekday: "narrow" }).format(d);
    });
  }, [intlLocale]);

  const years = useMemo(() => {
    const nowY = today.getFullYear();
    const list: number[] = [];
    for (let y = nowY + 2; y >= nowY - 15; y--) list.push(y);
    return list;
  }, [today]);

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);

  const isDisabledDay = (d: Date) => {
    const day = startOfDay(d);
    if (minDate && day < startOfDay(minDate)) return true;
    if (maxDate && day > startOfDay(maxDate)) return true;
    return false;
  };

  const rangeEnds = useMemo(() => {
    const start = pickingEnd ? draftStart : fromDate;
    const end = pickingEnd ? hoverDay : toDate;
    if (!start) return { start: null as Date | null, end: null as Date | null };
    if (!end) return { start, end: null as Date | null };
    return start <= end ? { start, end } : { start: end, end: start };
  }, [pickingEnd, draftStart, fromDate, toDate, hoverDay]);

  const inRange = (d: Date) => {
    if (!rangeEnds.start || !rangeEnds.end) return false;
    const day = startOfDay(d);
    return day >= startOfDay(rangeEnds.start) && day <= startOfDay(rangeEnds.end);
  };

  const pickDay = (d: Date) => {
    if (isDisabledDay(d)) return;
    const day = startOfDay(d);

    if (!pickingEnd) {
      setDraftStart(day);
      setPickingEnd(true);
      setHoverDay(day);
      onChange({
        from: formatDateOut(day, outputFormat),
        to: "",
      });
      return;
    }

    const start = draftStart || day;
    const a = start <= day ? start : day;
    const b = start <= day ? day : start;

    if (!allowSingle && sameDay(a, b)) {
      // keep waiting for a different end day
      setHoverDay(day);
      return;
    }

    onChange({
      from: formatDateOut(a, outputFormat),
      to: formatDateOut(b, outputFormat),
    });
    setPickingEnd(false);
    setDraftStart(null);
    setHoverDay(null);
    setOpen(false);
  };

  const clear = () => {
    onChange({ from: "", to: "" });
    setPickingEnd(false);
    setDraftStart(null);
    setHoverDay(null);
  };

  const displayText = useMemo(() => {
    if (fromDate && toDate) {
      if (sameDay(fromDate, toDate)) return formatDateOut(fromDate, "dmy-slash");
      return `${formatDateOut(fromDate, "dmy-slash")}  →  ${formatDateOut(toDate, "dmy-slash")}`;
    }
    if (fromDate && pickingEnd) {
      return `${formatDateOut(fromDate, "dmy-slash")}  →  …`;
    }
    if (fromDate) return formatDateOut(fromDate, "dmy-slash");
    return "";
  }, [fromDate, toDate, pickingEnd]);

  const panelStyle: CSSProperties | undefined = coords
    ? {
        top: coords.top,
        left: coords.left,
        width: coords.width,
        transform: coords.placement === "top" ? "translateY(-100%)" : undefined,
      }
    : undefined;

  const panel =
    open && !disabled && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            className="shs-dp__panel shs-dp__panel--portal shs-dp__panel--range"
            data-placement={coords.placement}
            role="dialog"
            aria-label={label || t("staffHr.dateFilter")}
            style={panelStyle}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <div className="shs-dp__head">
              <button
                type="button"
                className="shs-dp__nav"
                aria-label="Previous month"
                onClick={() => {
                  setHeadPick(null);
                  setView((v) => {
                    const m = v.m - 1;
                    return m < 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m };
                  });
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="shs-dp__selectors">
                <button
                  type="button"
                  className="shs-dp__select"
                  data-open={headPick === "month" ? "true" : "false"}
                  aria-label="Month"
                  aria-expanded={headPick === "month"}
                  onClick={() => setHeadPick((cur) => (cur === "month" ? null : "month"))}
                >
                  {monthNames[view.m]}
                </button>
                <button
                  type="button"
                  className="shs-dp__select"
                  data-open={headPick === "year" ? "true" : "false"}
                  aria-label="Year"
                  aria-expanded={headPick === "year"}
                  onClick={() => setHeadPick((cur) => (cur === "year" ? null : "year"))}
                >
                  {view.y}
                </button>
              </div>
              <button
                type="button"
                className="shs-dp__nav"
                aria-label="Next month"
                onClick={() => {
                  setHeadPick(null);
                  setView((v) => {
                    const m = v.m + 1;
                    return m > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m };
                  });
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {headPick === "month" ? (
              <div className="shs-dp__pick-grid" role="listbox" aria-label="Month">
                {monthNames.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={i === view.m}
                    data-selected={i === view.m ? "true" : "false"}
                    onClick={() => {
                      setView((v) => ({ ...v, m: i }));
                      setHeadPick(null);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : headPick === "year" ? (
              <div className="shs-dp__year-list" role="listbox" aria-label="Year">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    role="option"
                    aria-selected={y === view.y}
                    data-selected={y === view.y ? "true" : "false"}
                    onClick={() => {
                      setView((v) => ({ ...v, y }));
                      setHeadPick(null);
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            ) : (
              <>
            <p className="shs-dp__range-hint">
              {pickingEnd ? t("staffHr.rangePickEnd") : t("staffHr.rangePickStart")}
            </p>

            <div className="shs-dp__week">
              {weekdays.map((w) => (
                <div key={w} className="shs-dp__weekday">
                  {w}
                </div>
              ))}
            </div>

            <div className="shs-dp__grid">
              {cells.map(({ date, outside }) => {
                const disabledDay = isDisabledDay(date) || outside;
                const isStart = rangeEnds.start ? sameDay(date, rangeEnds.start) : false;
                const isEnd = rangeEnds.end ? sameDay(date, rangeEnds.end) : false;
                const mid = inRange(date) && !isStart && !isEnd;
                const preview =
                  pickingEnd &&
                  draftStart &&
                  hoverDay &&
                  !isStart &&
                  !isEnd &&
                  inRange(date);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className="shs-dp__day"
                    disabled={disabledDay}
                    data-outside={outside ? "true" : undefined}
                    data-today={sameDay(date, today) ? "true" : undefined}
                    data-range-start={isStart ? "true" : undefined}
                    data-range-end={isEnd ? "true" : undefined}
                    data-has-start={rangeEnds.start ? "true" : undefined}
                    data-has-end={rangeEnds.end ? "true" : undefined}
                    data-in-range={mid ? "true" : undefined}
                    data-range-preview={preview ? "true" : undefined}
                    data-selected={isStart || isEnd ? "true" : undefined}
                    onMouseEnter={() => {
                      if (pickingEnd && !disabledDay) setHoverDay(startOfDay(date));
                    }}
                    onClick={() => pickDay(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
              </>
            )}

            <div className="shs-dp__footer">
              <button type="button" className="shs-dp__foot-btn shs-dp__foot-btn--muted" onClick={clear}>
                {t("dateField.clear")}
              </button>
              <button type="button" className="shs-dp__foot-btn" onClick={() => setOpen(false)}>
                OK
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("shs-dp shs-dp--inline", className)} id={autoId}>
      {label ? <label className="shs-dp__label">{label}</label> : null}
      <div
        ref={controlRef}
        className="shs-dp__control"
        data-open={open ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
      >
        <button
          type="button"
          className="shs-dp__input text-left cursor-pointer"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          {displayText || (
            <span className="text-slate-400">{t("staffHr.rangePlaceholder")}</span>
          )}
        </button>
        {(value.from || value.to) && !disabled ? (
          <button
            type="button"
            className="shs-dp__icon-btn"
            aria-label={t("common.cancel")}
            onClick={clear}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          className="shs-dp__icon-btn"
          aria-label={t("staffHr.dateFilter")}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarRange className="h-4 w-4" />
        </button>
      </div>
      {panel}
    </div>
  );
}
