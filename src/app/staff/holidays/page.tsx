"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Plus, List, CheckCircle2, AlertCircle,
  Edit, Trash2, X, ChevronLeft, ChevronRight, Printer, Download,
} from "lucide-react";
import "./holidays.css";
import type { Holiday } from "@/generated/prisma/client";
import { getPublicHolidays, type HolidayKind } from "@/lib/holidays/public-holidays";

// ─── Types ───────────────────────────────────────────────────────────────────
type HolidayRow = Pick<Holiday,"id"|"date"|"name"|"nameGu"|"type"|"academicYear"|"description">;
type ViewMode = "calendar" | "list";
type HolType = HolidayKind;

interface Festival { date: string; name: string; nameGu: string; type: HolType; isSuggestion: true }
type ListEntry = HolidayRow | Festival;
function isSuggestion(e: ListEntry): e is Festival { return "isSuggestion" in e; }

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTH_FULL  = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CUR_YEAR    = new Date().getFullYear();
const YEAR_OPTS   = [String(CUR_YEAR-1), String(CUR_YEAR), String(CUR_YEAR+1)];

function getFestivals(year: number): Festival[] {
  return getPublicHolidays(year).map((h) => ({
    date: h.date,
    name: h.name,
    nameGu: h.nameGu,
    type: h.type,
    isSuggestion: true as const,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function deriveAY(iso: string) {
  const d = new Date(iso); const y = d.getFullYear(); const m = d.getMonth()+1;
  return m >= 4 ? `${y}-${String(y+1).slice(2)}` : `${y-1}-${String(y).slice(2)}`;
}
function buildGrid(year: number, month: number): (number | null)[] {
  const startDow = new Date(year, month, 1).getDay(); // 0=Sun
  const days = new Date(year, month+1, 0).getDate();
  const cells: (number|null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function isoOf(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function dateStatus(iso: string, today: string): "today"|"upcoming"|"past" {
  if (iso === today) return "today";
  return iso > today ? "upcoming" : "past";
}
function typeCap(t: string) { return t.charAt(0).toUpperCase()+t.slice(1); }

// ─── Add / Edit Modal ────────────────────────────────────────────────────────
interface ModalProps {
  initial?: Partial<HolidayRow> & { name?: string; nameGu?: string; type?: HolType };
  onSave: (d: Omit<HolidayRow,"id">) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  error: string;
  t: (k: string, p?: Record<string,string|number>) => string;
}

function HolidayModal({ initial, onSave, onClose, saving, error, t }: ModalProps) {
  const [date,   setDate]   = useState(initial?.date   ?? "");
  const [name,   setName]   = useState(initial?.name   ?? "");
  const [nameGu, setNameGu] = useState(initial?.nameGu ?? "");
  const [type,   setType]   = useState<HolType>((initial?.type as HolType) ?? "public");
  const [desc,   setDesc]   = useState(initial?.description ?? "");
  const [fe,     setFe]     = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = t("holidays.validDateRequired");
    if (!name.trim()) e.name = t("holidays.nameRequired");
    setFe(e); return !Object.keys(e).length;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSave({ date, name: name.trim(), nameGu: nameGu.trim()||null, type,
      description: desc.trim()||null, academicYear: deriveAY(date) } as Omit<HolidayRow,"id">);
  };

  return (
    <div className="hol-modal-overlay hol-no-print"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hol-modal" role="dialog" aria-modal="true">
        <div className="hol-modal__header">
          <div className="flex items-center gap-2.5">
            <div className="hol-modal__icon"><CalendarDays className="h-4 w-4"/></div>
            <div>
              <p className="hol-modal__title">
                {initial?.id ? t("holidays.editHoliday") : t("holidays.addHoliday")}
              </p>
              <p className="hol-modal__subtitle">
                {initial?.date ? initial.date : t("holidays.festivalPickerHint")}
              </p>
            </div>
          </div>
          <button type="button" className="hol-modal__close" onClick={onClose}><X className="h-4 w-4"/></button>
        </div>

        <form onSubmit={submit}>
          <div className="hol-modal__body">
            {error && (
              <div className="hol-msg hol-msg--err">
                <AlertCircle className="h-4 w-4 shrink-0"/><span>{error}</span>
              </div>
            )}
            {/* Date */}
            <div className="hol-field">
              <label className="hol-label">{t("holidays.fieldDate")} <span className="req">*</span></label>
              <input type="date" className={cn("hol-input", fe.date && "err")}
                value={date} onChange={e => setDate(e.target.value)} required />
              {fe.date && <p className="hol-err">{fe.date}</p>}
            </div>
            {/* Names side by side */}
            <div className="hol-field-row">
              <div className="hol-field">
                <label className="hol-label">{t("holidays.fieldName")} <span className="req">*</span></label>
                <input type="text" className={cn("hol-input", fe.name && "err")}
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Republic Day" maxLength={120}/>
                {fe.name && <p className="hol-err">{fe.name}</p>}
              </div>
              <div className="hol-field">
                <label className="hol-label">{t("holidays.fieldNameGu")}</label>
                <input type="text" className="hol-input"
                  value={nameGu} onChange={e => setNameGu(e.target.value)}
                  placeholder="પ્રજાસત્તાક દિન" maxLength={120}/>
              </div>
            </div>
            {/* Type */}
            <div className="hol-field">
              <label className="hol-label">{t("holidays.fieldType")}</label>
              <select className="hol-input" value={type} onChange={e => setType(e.target.value as HolType)}>
                <option value="public">{t("holidays.typePublic")}</option>
                <option value="school">{t("holidays.typeSchool")}</option>
                <option value="optional">{t("holidays.typeOptional")}</option>
              </select>
            </div>
            {/* Notes */}
            <div className="hol-field">
              <label className="hol-label">{t("holidays.fieldDescription")}</label>
              <textarea className="hol-textarea" value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Optional note…" maxLength={300} rows={2}/>
            </div>
          </div>
          <div className="hol-modal__footer">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Spinner size="sm"/> : <CheckCircle2 className="h-4 w-4"/>}
              {saving ? t("holidays.saving") : t("holidays.saveHoliday")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Big Single Calendar ─────────────────────────────────────────────────────
interface BigCalProps {
  year: number; month: number;
  holMap: Map<string, HolidayRow>;
  festMap: Map<string, Festival>;
  today: string;
  onPrev: () => void; onNext: () => void;
  onDayClick: (iso: string, hol?: HolidayRow, fest?: Festival) => void;
  readOnly?: boolean;
}

function BigCalendar({ year, month, holMap, festMap, today, onPrev, onNext, onDayClick, readOnly }: BigCalProps) {
  const cells = buildGrid(year, month);
  const monthHols = cells.filter(d => d !== null && holMap.has(isoOf(year, month, d!))).length;
  const monthSugg = cells.filter(d => d !== null && !holMap.has(isoOf(year, month, d!)) && festMap.has(isoOf(year, month, d!))).length;

  return (
    <div className="hol-cal-wrap">
      {/* Nav bar */}
      <div className="hol-cal-nav">
        <button type="button" className="hol-cal-nav__btn" onClick={onPrev} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4"/>
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="hol-cal-nav__title">{MONTH_FULL[month]} {year}</span>
          {monthHols > 0 && (
            <span className="hol-cal-nav__count">{monthHols} {monthHols === 1 ? "holiday" : "holidays"}</span>
          )}
          {monthSugg > 0 && monthHols === 0 && (
            <span className="hol-cal-nav__count" style={{background:"rgba(251,191,36,0.25)",color:"#fde68a"}}>{monthSugg} suggested</span>
          )}
        </div>
        <button type="button" className="hol-cal-nav__btn" onClick={onNext} aria-label="Next month">
          <ChevronRight className="h-4 w-4"/>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="hol-cal-wd-row">
        {DAY_SHORT.map((d, i) => (
          <div key={d} className={cn("hol-cal-wd", i===0&&"sun", i===6&&"sat")}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="hol-cal-grid">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} className="hol-cal-cell hol-cal-cell--pad"/>;
          }
          const iso = isoOf(year, month, day);
          const hol  = holMap.get(iso);
          const fest = !hol ? festMap.get(iso) : undefined;
          const dow = new Date(year, month, day).getDay();
          const isToday = iso === today;
          return (
            <div
              key={iso}
              className={cn(
                "hol-cal-cell",
                isToday   && "hol-cal-cell--today",
                dow === 0 && "hol-cal-cell--sun",
                dow === 6 && "hol-cal-cell--sat",
                fest && !hol && "hol-cal-cell--suggest",
              )}
              onClick={() => !readOnly && onDayClick(iso, hol, fest)}
              title={hol ? hol.name : fest ? fest.name : undefined}
            >
              <span className="hol-cal-cell__num">{day}</span>

              {/* Added holiday — solid pill */}
              {hol && (
                <span className={`hol-cal-pill hol-cal-pill--${hol.type}`} title={hol.name}>
                  {hol.nameGu || hol.name}
                </span>
              )}

              {/* Festival suggestion — dashed faded pill */}
              {!hol && fest && (
                <span className={`hol-cal-pill hol-cal-pill--suggest hol-cal-pill--${fest.type}`}
                  title={`${fest.name} (click to add)`}>
                  {fest.nameGu || fest.name}
                </span>
              )}

              {/* Empty cell hover hint */}
              {!hol && !fest && !readOnly && (
                <span className="hol-cal-cell__add-hint">
                  <Plus className="h-2.5 w-2.5"/> add
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="hol-cal-legend">
        {(["public","school","optional"] as HolType[]).map(tp => (
          <span key={tp} className="hol-cal-legend__item">
            <span className={`hol-cal-legend__dot hol-cal-legend__dot--${tp}`}/>
            {tp === "public" ? "Public Holiday" : tp === "school" ? "School Holiday" : "Optional"}
          </span>
        ))}
        <span className="hol-cal-legend__item">
          <span className="hol-cal-legend__dot hol-cal-legend__dot--today"/>
          Today
        </span>
        {!readOnly && (
          <span className="hol-cal-legend__item">
            <span className="hol-cal-legend__dot" style={{background:"transparent",border:"2px dashed #fbbf24"}}/>
            Suggested
          </span>
        )}
        {!readOnly && (
          <span className="text-xs text-slate-400 ml-auto hidden sm:block">
            Click any day to add / edit
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HolidaysPage() {
  const t = useT();
  const today = isoToday();

  const [year,       setYear]    = useState(String(CUR_YEAR));
  const [viewMode,   setView]    = useState<ViewMode>("list");
  const [calMonth,   setCalMon]  = useState(new Date().getMonth());
  const [calYear,    setCalYr]   = useState(CUR_YEAR);
  const [holidays,   setHols]    = useState<HolidayRow[]>([]);
  const [loading,    setLoading] = useState(false);
  const [msg,        setMsg]     = useState<{text:string;tone:"ok"|"err"}|null>(null);
  const [modalOpen,  setModal]   = useState(false);
  const [editTarget, setEdit]    = useState<HolidayRow|null>(null);
  const [prefill,    setPrefill] = useState<Partial<HolidayRow>&{name?:string;nameGu?:string;type?:HolType}>({});
  const [saving,     setSaving]  = useState(false);
  const [modalErr,   setMErr]    = useState("");
  const [deletingId, setDelId]   = useState<string|null>(null);
  const [readOnly,   setRO]      = useState(false);

  const showMsg = (text: string, tone: "ok"|"err" = "ok") => {
    setMsg({text, tone}); setTimeout(() => setMsg(null), 4000);
  };

  // Detect teacher → read-only
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json())
      .then((d:{user?:{role?:string}}) => { if (d.user?.role==="teacher") setRO(true); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    // Try teacher-scoped path first (Flutter / teacher middleware), then shared API.
    const endpoints = [
      `/api/teacher/holidays?year=${year}`,
      `/api/holidays?year=${year}`,
      `/api/staff/holidays?year=${year}`,
    ];

    let loaded: HolidayRow[] = [];
    let lastErr = "";
    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        const data = (await res.json()) as {
          holidays?: HolidayRow[];
          error?: string;
        };
        if (res.ok) {
          loaded = data.holidays || [];
          lastErr = "";
          break;
        }
        lastErr = data.error || `HTTP ${res.status}`;
      } catch {
        lastErr = "Network error";
      }
    }
    if (lastErr && !loaded.length) {
      setMsg({ text: lastErr, tone: "err" });
      setTimeout(() => setMsg(null), 4000);
    }
    setHols(loaded);
    setLoading(false);
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  // When year selector changes, sync calendar year too
  useEffect(() => { setCalYr(parseInt(year, 10)); setCalMon(new Date().getMonth()); }, [year]);

  const holMap = useMemo(() => {
    const m = new Map<string, HolidayRow>();
    holidays.forEach(h => m.set(h.date, h));
    return m;
  }, [holidays]);

  // All festivals for the year, mark which are already added
  const allFestivals = useMemo(() => getFestivals(parseInt(year, 10)), [year]);

  // festMap — only un-added festival suggestions keyed by date
  const festMap = useMemo(() => {
    const m = new Map<string, Festival>();
    allFestivals.forEach(f => { if (!holMap.has(f.date)) m.set(f.date, f); });
    return m;
  }, [allFestivals, holMap]);

  // Merged list: actual holidays + un-added festival suggestions, all sorted by date
  const mergedList = useMemo((): ListEntry[] => {
    const suggestions = allFestivals.filter(f => !holMap.has(f.date));
    const combined: ListEntry[] = [...holidays, ...suggestions];
    combined.sort((a, b) => a.date.localeCompare(b.date));
    return combined;
  }, [holidays, allFestivals, holMap]);

  // Group merged list by month
  const byMonth = useMemo(() => {
    const groups: { month: number; list: ListEntry[] }[] = [];
    for (let m = 0; m < 12; m++) {
      const list = mergedList.filter(e => parseInt(e.date.slice(5,7), 10)-1 === m);
      if (list.length) groups.push({ month: m, list });
    }
    return groups;
  }, [mergedList]);

  // Open add modal (optionally pre-fill date / festival data)
  const openAdd = (date?: string, fest?: Festival) => {
    setEdit(null);
    setPrefill(fest ? { date: fest.date, name: fest.name, nameGu: fest.nameGu, type: fest.type }
                    : { date: date ?? "" });
    setMErr(""); setModal(true);
  };
  const openEdit = (h: HolidayRow) => {
    setEdit(h); setPrefill({}); setMErr(""); setModal(true);
  };
  const onDayClick = (iso: string, hol?: HolidayRow, fest?: Festival) => {
    if (hol) openEdit(hol);
    else if (fest) openAdd(iso, fest);
    else openAdd(iso);
  };

  const handleSave = async (data: Omit<HolidayRow,"id">) => {
    setSaving(true); setMErr("");
    const body = editTarget
      ? { action:"update", id: editTarget.id, ...data }
      : { action:"create", ...data };
    const res = await fetch("/api/holidays", {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body),
    });
    const json = await res.json() as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setMErr(json.error || (editTarget ? t("holidays.updateFailed") : t("holidays.addFailed")));
      return;
    }
    setModal(false);
    showMsg(editTarget ? t("holidays.holidayUpdated") : t("holidays.holidayAdded"));
    void load();
  };

  const handleDelete = async (h: HolidayRow) => {
    if (!confirm(t("holidays.deleteConfirm", { name: h.name, date: h.date }))) return;
    setDelId(h.id);
    const res = await fetch("/api/holidays", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"delete", id: h.id }),
    });
    setDelId(null);
    if (res.ok) { showMsg(t("holidays.holidayDeleted")); void load(); }
    else showMsg(t("holidays.deleteFailed"), "err");
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMon(11); setCalYr(y => y-1); }
    else setCalMon(m => m-1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMon(0); setCalYr(y => y+1); }
    else setCalMon(m => m+1);
  };

  const handleDownload = () => {
    const rows = [["Sr","Date","Day","Name","Gujarati Name","Type","Description","Status"]];
    let sr = 1;
    mergedList.forEach(e => {
      if (isSuggestion(e)) return; // skip un-added suggestions from CSV
      const d = new Date(e.date+"T00:00:00");
      rows.push([String(sr++), e.date, DAY_SHORT[d.getDay()], e.name, e.nameGu||"", e.type, e.description||"", "Added"]);
    });
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    a.download = `holiday-list-${year}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    showMsg("CSV downloaded");
  };

  const totalAdded    = holidays.length;
  const upcoming      = holidays.filter(h => h.date >= today).length;
  const past          = holidays.filter(h => h.date < today).length;

  return (
    <PageShell
      title={t("holidays.title")}
      subtitle={readOnly ? "View school holidays for the year" : t("holidays.subtitle")}
      icon={<CalendarDays className="h-6 w-6"/>}
      accentColor="border-orange-400"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: readOnly ? "/teacher" : "/dashboard" },
        { label: t("holidays.title") },
      ]}
      actions={
        <div className="flex flex-wrap gap-2 hol-no-print">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={loading || totalAdded===0}>
            <Download className="h-4 w-4"/> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={loading || totalAdded===0}>
            <Printer className="h-4 w-4"/> Print
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => openAdd()}>
              <Plus className="h-4 w-4"/> {t("holidays.addHoliday")}
            </Button>
          )}
        </div>
      }
    >
      <div className="hol-page">
        {/* print header */}
        <div className="hol-print-header">
          <h1>{t("holidays.title")} — {year}</h1>
          <p>{totalAdded} holidays · Printed {new Date().toLocaleDateString("en-IN")}</p>
        </div>

        {/* ── Toolbar ── */}
        <div className="hol-toolbar hol-no-print">
          <div className="hol-toolbar__left">
            <Select label={t("holidays.yearFilter")} className="w-28"
              options={YEAR_OPTS} value={year} onChange={e => setYear(e.target.value)}/>
            {loading && <Spinner size="sm"/>}
          </div>
          <div className="hol-toolbar__right">
            <div className="hol-view-toggle">
              <button type="button"
                className={cn("hol-view-btn", viewMode==="list" && "active")}
                onClick={() => setView("list")}>
                <List className="h-3.5 w-3.5"/> {t("holidays.listView")}
              </button>
              <button type="button"
                className={cn("hol-view-btn", viewMode==="calendar" && "active")}
                onClick={() => setView("calendar")}>
                <CalendarDays className="h-3.5 w-3.5"/> {t("holidays.calendarView")}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="hol-stats hol-no-print">
          <div className="hol-stat hol-stat--total">
            <div className="hol-stat__icon"><CalendarDays className="h-4 w-4"/></div>
            <div><p className="hol-stat__val">{totalAdded}</p><p className="hol-stat__lbl">Total Added</p></div>
          </div>
          <div className="hol-stat hol-stat--upcoming">
            <div className="hol-stat__icon"><CheckCircle2 className="h-4 w-4"/></div>
            <div><p className="hol-stat__val">{upcoming}</p><p className="hol-stat__lbl">{t("holidays.upcoming")}</p></div>
          </div>
          <div className="hol-stat hol-stat--past">
            <div className="hol-stat__icon"><List className="h-4 w-4"/></div>
            <div><p className="hol-stat__val">{past}</p><p className="hol-stat__lbl">{t("holidays.past")}</p></div>
          </div>
        </div>

        {/* ── Message ── */}
        {msg && (
          <div className={cn("hol-msg hol-no-print", msg.tone==="ok"?"hol-msg--ok":"hol-msg--err")}>
            {msg.tone==="ok" ? <CheckCircle2 className="h-4 w-4 shrink-0"/> : <AlertCircle className="h-4 w-4 shrink-0"/>}
            <span>{msg.text}</span>
          </div>
        )}

        {/* loading */}
        {loading && <div className="flex justify-center py-16 hol-no-print"><Spinner size="lg"/></div>}

        {/* ═══ CALENDAR VIEW ═══ */}
        {!loading && viewMode==="calendar" && (
          <BigCalendar
            year={calYear} month={calMonth}
            holMap={holMap} festMap={festMap} today={today}
            onPrev={prevMonth} onNext={nextMonth}
            onDayClick={onDayClick}
            readOnly={readOnly}
          />
        )}

        {/* ═══ LIST VIEW ═══ */}
        {!loading && viewMode==="list" && (
          <div className="hol-list-panel">
            <div className="hol-list-panel__head hol-no-print">
              <div>
                <p className="hol-list-panel__title">{t("holidays.title")} — {year}</p>
                <p className="hol-list-panel__sub">
                  {totalAdded} added · {allFestivals.filter(f=>!holMap.has(f.date)).length} suggestions
                </p>
              </div>
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={() => openAdd()}>
                  <Plus className="h-4 w-4"/> {t("holidays.addHoliday")}
                </Button>
              )}
            </div>

            {mergedList.length === 0 ? (
              <div className="hol-empty">
                <div className="hol-empty__icon"><CalendarDays className="h-7 w-7"/></div>
                <p className="text-base font-semibold text-slate-800">{t("holidays.noHolidays")}</p>
                <p className="text-sm text-slate-500 max-w-xs">{t("holidays.noHolidaysHint")}</p>
                {!readOnly && (
                  <Button size="sm" className="mt-3" onClick={() => openAdd()}>
                    <Plus className="h-4 w-4"/> {t("holidays.addHoliday")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="hol-tbl">
                    <thead>
                      <tr>
                        <th className="center" style={{width:"3rem"}}>#</th>
                        <th style={{width:"9rem"}}>{t("holidays.colDate")}</th>
                        <th>{t("holidays.colName")}</th>
                        <th style={{width:"9rem"}}>{t("holidays.colType")}</th>
                        {!readOnly && <th className="center" style={{width:"7rem"}}>{t("holidays.colActions")}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {byMonth.map(({ month, list }) => (
                        <Fragment key={`grp-${month}`}>
                          {/* Month header row */}
                          <tr className="hol-month-row">
                            <td colSpan={readOnly ? 4 : 5}>
                              <span className="hol-month-label">{MONTH_FULL[month]} {year}</span>
                            </td>
                          </tr>
                          {/* Holiday + suggestion rows */}
                          {list.map((entry, li) => {
                            const d   = new Date(entry.date+"T00:00:00");
                            const dow = d.getDay();
                            const isSug = isSuggestion(entry);
                            const st  = isSug ? "suggest" : dateStatus(entry.date, today);
                            const sr  = isSug ? null
                              : holidays.filter(h => h.date <= entry.date).length;
                            return (
                              <tr key={`${entry.date}-${li}`}
                                className={cn(isSug && "hol-row-suggestion")}>
                                {/* Sr # */}
                                <td className="center">
                                  {isSug
                                    ? <span className="text-amber-400 text-base leading-none">·</span>
                                    : <span className="hol-sr">{sr}</span>}
                                </td>
                                {/* Date + day */}
                                <td>
                                  <div className="hol-date-cell">
                                    <div className={cn("hol-date-num",
                                      st==="today"    && "hol-date-num--today",
                                      st==="upcoming" && "hol-date-num--upcoming",
                                      st==="past"     && "hol-date-num--past",
                                      st==="suggest"  && "hol-date-num--suggest",
                                    )}>
                                      <span className="hol-date-num__d">{d.getDate()}</span>
                                      <span className="hol-date-num__m">{MONTH_SHORT[d.getMonth()]}</span>
                                    </div>
                                    <span className={cn("hol-day-chip",
                                      (dow===0||dow===6) && "hol-day-chip--sun")}>
                                      {DAY_SHORT[dow]}
                                    </span>
                                  </div>
                                </td>
                                {/* Name */}
                                <td>
                                  <div className="flex items-start gap-2">
                                    <div className="min-w-0">
                                      <p className={cn("font-semibold text-sm",
                                        isSug ? "text-slate-500" : "text-slate-900")}>
                                        {entry.name}
                                      </p>
                                      {entry.nameGu && (
                                        <p className="text-xs text-slate-400 mt-0.5">{entry.nameGu}</p>
                                      )}
                                      {!isSug && (entry as HolidayRow).description && (
                                        <p className="text-xs text-slate-400 mt-0.5 italic">
                                          {(entry as HolidayRow).description}
                                        </p>
                                      )}
                                    </div>
                                    {isSug && (
                                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                                        suggestion
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {/* Type */}
                                <td>
                                  <span className={`hol-type-badge hol-type-badge--${entry.type}`}>
                                    {t(`holidays.type${typeCap(entry.type)}` as never)}
                                  </span>
                                </td>
                                {/* Actions */}
                                {!readOnly && (
                                  <td className="center">
                                    {isSug ? (
                                      <button type="button" className="hol-add-btn"
                                        onClick={() => openAdd(entry.date, entry as Festival)}>
                                        <Plus className="h-3 w-3"/> Add
                                      </button>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1">
                                        <Button size="icon" variant="ghost"
                                          className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                          onClick={() => openEdit(entry as HolidayRow)}>
                                          <Edit className="h-3.5 w-3.5"/>
                                        </Button>
                                        <Button size="icon" variant="ghost"
                                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                                          onClick={() => handleDelete(entry as HolidayRow)}
                                          disabled={deletingId===(entry as HolidayRow).id}>
                                          {deletingId===(entry as HolidayRow).id
                                            ? <Spinner size="sm"/>
                                            : <Trash2 className="h-3.5 w-3.5"/>}
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="block sm:hidden p-3 space-y-4 hol-no-print">
                  {byMonth.map(({ month, list }) => (
                    <div key={`mob-${month}`}>
                      <p className="hol-month-label px-1 mb-2">{MONTH_FULL[month]} {year}</p>
                      <div className="space-y-2">
                        {list.map((entry, li) => {
                          const d   = new Date(entry.date+"T00:00:00");
                          const dow = d.getDay();
                          const isSug = isSuggestion(entry);
                          const st = isSug ? "suggest" : dateStatus(entry.date, today);
                          return (
                            <div key={`mob-${entry.date}-${li}`}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border bg-white p-3 shadow-sm",
                                isSug ? "border-dashed border-amber-200 opacity-75" : "border-slate-200",
                              )}>
                              <div className={cn("hol-date-num shrink-0",
                                st==="today"    && "hol-date-num--today",
                                st==="upcoming" && "hol-date-num--upcoming",
                                st==="past"     && "hol-date-num--past",
                                st==="suggest"  && "hol-date-num--suggest",
                              )}>
                                <span className="hol-date-num__d">{d.getDate()}</span>
                                <span className="hol-date-num__m">{MONTH_SHORT[d.getMonth()]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-semibold text-sm",
                                  isSug ? "text-slate-500" : "text-slate-900")}>{entry.name}</p>
                                {entry.nameGu && <p className="text-xs text-slate-400">{entry.nameGu}</p>}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className={`hol-type-badge hol-type-badge--${entry.type}`}>
                                    {t(`holidays.type${typeCap(entry.type)}` as never)}
                                  </span>
                                  <span className={cn("hol-day-chip",(dow===0||dow===6)&&"hol-day-chip--sun")}>
                                    {DAY_SHORT[dow]}
                                  </span>
                                  {isSug && (
                                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      suggestion
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!readOnly && (
                                <div className="flex flex-col gap-1 shrink-0">
                                  {isSug ? (
                                    <button type="button" className="hol-add-btn"
                                      onClick={() => openAdd(entry.date, entry as Festival)}>
                                      <Plus className="h-3 w-3"/> Add
                                    </button>
                                  ) : (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400"
                                        onClick={() => openEdit(entry as HolidayRow)}>
                                        <Edit className="h-3.5 w-3.5"/>
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400"
                                        onClick={() => handleDelete(entry as HolidayRow)}
                                        disabled={deletingId===(entry as HolidayRow).id}>
                                        {deletingId===(entry as HolidayRow).id
                                          ? <Spinner size="sm"/> : <Trash2 className="h-3.5 w-3.5"/>}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Modal ── */}
        {modalOpen && (
          <HolidayModal
            initial={editTarget
              ? {
                  ...editTarget,
                  type: editTarget.type as HolType,
                  nameGu: editTarget.nameGu ?? undefined,
                  description: editTarget.description ?? undefined,
                }
              : prefill}
            onSave={handleSave}
            onClose={() => setModal(false)}
            saving={saving}
            error={modalErr}
            t={t}
          />
        )}
      </div>
    </PageShell>
  );
}
