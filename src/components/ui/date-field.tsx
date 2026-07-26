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
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import "./date-picker.css";

export type DateOutputFormat = "dmy-slash" | "dmy-dash" | "iso";

export type DateFieldProps = {
  id?: string;
  label?: string;
  value?: string | null;
  onChange: (value: string) => void;
  outputFormat?: DateOutputFormat;
  showHint?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  /** Align popover to the right edge */
  align?: "left" | "right";
  name?: string;
};

const PANEL_MIN_W = 280;
const PANEL_EST_H = 320;
const PANEL_GAP = 6;
const VIEWPORT_PAD = 8;

export function parseToDate(raw?: string | null): Date | null {
  if (!raw?.trim()) return null;
  const v = raw.trim();

  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) return dt;
    return null;
  }

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) return dt;
    return null;
  }

  return null;
}

export function formatDateOut(dt: Date, format: DateOutputFormat): string {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  if (format === "iso") return `${yyyy}-${mm}-${dd}`;
  if (format === "dmy-dash") return `${dd}-${mm}-${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}

function hintFor(format: DateOutputFormat): string {
  if (format === "iso") return "YYYY-MM-DD";
  if (format === "dmy-dash") return "DD-MM-YYYY";
  return "DD/MM/YYYY";
}

function placeholderFor(format: DateOutputFormat): string {
  return hintFor(format);
}

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
  // Monday-first: Sun=0 → 6
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { date: Date; outside: boolean }[] = [];
  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({
      date: new Date(viewYear, viewMonth - 1, prevDays - i),
      outside: true,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), outside: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = cells.length - (startPad + daysInMonth) + 1;
    cells.push({
      date: new Date(viewYear, viewMonth + 1, next),
      outside: true,
    });
  }
  return cells.slice(0, 42);
}

type PanelCoords = {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
};

/**
 * Global custom date picker — used everywhere instead of native browser calendar.
 * Calendar panel is portaled to document.body so it is not clipped by card overflow.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  outputFormat = "dmy-slash",
  showHint = false,
  required,
  disabled,
  error,
  className,
  placeholder,
  min,
  max,
  align = "left",
  name,
}: DateFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const { locale } = useLocale();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = parseToDate(value);
  const minDate = parseToDate(min);
  const maxDate = parseToDate(max);
  const today = startOfDay(new Date());

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [view, setView] = useState(() => {
    const base = selected || today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const base = selected || today;
    setView({ y: base.getFullYear(), m: base.getMonth() });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePosition = useCallback(() => {
    const el = controlRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(
      Math.max(rect.width, PANEL_MIN_W),
      window.innerWidth - VIEWPORT_PAD * 2,
    );
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const placeTop = spaceBelow < PANEL_EST_H && spaceAbove > spaceBelow;

    let left =
      align === "right" ? rect.right - width : rect.left;
    left = Math.max(
      VIEWPORT_PAD,
      Math.min(left, window.innerWidth - width - VIEWPORT_PAD),
    );

    const top = placeTop ? rect.top - PANEL_GAP : rect.bottom + PANEL_GAP;
    setCoords({
      top,
      left,
      width,
      placement: placeTop ? "top" : "bottom",
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    // capture scroll from nested overflow containers (cards, main, sidebar)
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
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
    // Monday → Sunday labels
    const base = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(intlLocale, { weekday: "narrow" }).format(d);
    });
  }, [intlLocale]);

  const years = useMemo(() => {
    const nowY = today.getFullYear();
    const from = Math.min(minDate?.getFullYear() ?? nowY - 80, nowY - 80);
    const to = Math.max(maxDate?.getFullYear() ?? nowY + 20, nowY + 20);
    const list: number[] = [];
    for (let y = to; y >= from; y--) list.push(y);
    return list;
  }, [minDate, maxDate, today]);

  const cells = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);

  const isDisabledDay = (d: Date) => {
    const day = startOfDay(d);
    if (minDate && day < startOfDay(minDate)) return true;
    if (maxDate && day > startOfDay(maxDate)) return true;
    return false;
  };

  const commit = (d: Date | null) => {
    if (!d) {
      onChange("");
      setDraft("");
      return;
    }
    const out = formatDateOut(d, outputFormat);
    onChange(out);
    setDraft(out);
  };

  const onBlurInput = () => {
    const typed = draft.trim();
    if (!typed) {
      commit(null);
      return;
    }
    const parsed = parseToDate(typed);
    if (parsed && !isDisabledDay(parsed)) {
      commit(parsed);
    } else {
      setDraft(value || "");
    }
  };

  const onKeyDownInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onBlurInput();
      setOpen(false);
    }
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const displayValue = selected ? formatDateOut(selected, outputFormat) : draft;

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
            className="shs-dp__panel shs-dp__panel--portal"
            data-align={align}
            data-placement={coords.placement}
            role="dialog"
            aria-modal="false"
            aria-label={label || t("dateField.calendar")}
            style={panelStyle}
            onMouseDown={(e) => {
              // Keep input from blurring when picking days; allow native <select> focus
              const tag = (e.target as HTMLElement).tagName;
              if (tag === "SELECT" || tag === "OPTION") return;
              e.preventDefault();
            }}
          >
            <div className="shs-dp__head">
              <button
                type="button"
                className="shs-dp__nav"
                aria-label="Previous month"
                onClick={() =>
                  setView((v) => {
                    const m = v.m - 1;
                    return m < 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m };
                  })
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="shs-dp__selectors">
                <select
                  className="shs-dp__select"
                  value={view.m}
                  onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
                  aria-label="Month"
                >
                  {monthNames.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className="shs-dp__select"
                  value={view.y}
                  onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
                  aria-label="Year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="shs-dp__nav"
                aria-label="Next month"
                onClick={() =>
                  setView((v) => {
                    const m = v.m + 1;
                    return m > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m };
                  })
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="shs-dp__week">
              {weekdays.map((d) => (
                <div key={d} className="shs-dp__weekday">
                  {d}
                </div>
              ))}
            </div>

            <div className="shs-dp__grid">
              {cells.map(({ date, outside }) => {
                const disabledDay = isDisabledDay(date);
                const selectedDay = selected ? sameDay(date, selected) : false;
                const isToday = sameDay(date, today);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className="shs-dp__day"
                    disabled={disabledDay}
                    data-outside={outside ? "true" : "false"}
                    data-selected={selectedDay ? "true" : "false"}
                    data-today={isToday ? "true" : "false"}
                    onClick={() => {
                      commit(date);
                      setOpen(false);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="shs-dp__footer">
              <button
                type="button"
                className="shs-dp__foot-btn shs-dp__foot-btn--muted"
                onClick={() => {
                  commit(null);
                  setOpen(false);
                }}
              >
                {t("dateField.clear")}
              </button>
              <button
                type="button"
                className="shs-dp__foot-btn"
                onClick={() => {
                  if (!isDisabledDay(today)) {
                    commit(today);
                    setView({ y: today.getFullYear(), m: today.getMonth() });
                    setOpen(false);
                  }
                }}
              >
                {t("dateField.today")}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("shs-dp", className)} ref={rootRef}>
      {label ? (
        <label htmlFor={fieldId} className="shs-dp__label">
          {label}
          {required ? <span className="shs-dp__req">*</span> : null}
        </label>
      ) : null}

      <div
        ref={controlRef}
        className="shs-dp__control"
        data-open={open ? "true" : "false"}
        data-error={error ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
      >
        <input
          id={fieldId}
          name={name}
          className="shs-dp__input"
          value={open ? draft : displayValue}
          disabled={disabled}
          required={required}
          placeholder={placeholder || placeholderFor(outputFormat)}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={onBlurInput}
          onKeyDown={onKeyDownInput}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
        <button
          type="button"
          className="shs-dp__icon-btn"
          disabled={disabled}
          aria-label={t("dateField.openCalendar")}
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>

      {panel}

      {error ? <p className="shs-dp__error">{error}</p> : null}
      {showHint && selected ? (
        <p className="shs-dp__hint">
          {formatDateOut(selected, outputFormat)} ({hintFor(outputFormat)})
        </p>
      ) : null}
    </div>
  );
}
