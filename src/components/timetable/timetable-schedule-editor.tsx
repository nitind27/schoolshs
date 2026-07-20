"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";
import {
  rebuildDayPeriods,
  formatTime12h,
  type DayScheduleConfig,
} from "@/lib/timetable";
import { Save, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TimetableScheduleEditor({
  days,
  onSave,
}: {
  days: DayScheduleConfig[];
  onSave: (days: DayScheduleConfig[]) => Promise<void>;
}) {
  const t = useT();
  const [local, setLocal] = useState(days);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const updateDay = (dayOfWeek: number, patch: Partial<DayScheduleConfig>) => {
    setLocal((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const next = { ...d, ...patch };
        if ("start" in patch || "end" in patch || "periods" in patch || "breaks" in patch) {
          const count = patch.periods?.length ?? d.periods.length;
          return rebuildDayPeriods({
            ...next,
            periods: Array.from({ length: count }, (_, i) => ({
              index: i + 1,
              start: next.start,
              end: next.end,
              durationMin: 0,
            })),
          });
        }
        return next;
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => { setLocal(days); setOpen(true); }}>
        <Clock className="h-4 w-4" />
        {t("timetable.editSchedule")}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t("timetable.scheduleSettings")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t("timetable.scheduleSettingsHint")}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {local.map((day) => (
          <div
            key={day.dayOfWeek}
            className={cn(
              "rounded-xl border p-3 transition-all",
              day.enabled ? "border-slate-200 bg-white shadow-sm" : "border-dashed border-slate-200 bg-slate-50 opacity-70",
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-bold text-slate-900">{day.labelEn}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(day.dayOfWeek, { enabled: e.target.checked })}
                  className="rounded border-slate-300"
                />
                {t("timetable.enabled")}
              </label>
            </div>
            {day.enabled && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">{t("timetable.startTime")}</label>
                    <Input
                      type="time"
                      value={day.start}
                      onChange={(e) => updateDay(day.dayOfWeek, { start: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">{t("timetable.endTime")}</label>
                    <Input
                      type="time"
                      value={day.end}
                      onChange={(e) => updateDay(day.dayOfWeek, { end: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">{t("timetable.periodCount")}</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={day.periods.length}
                    onChange={(e) => {
                      const count = Math.max(1, Math.min(12, Number(e.target.value) || 1));
                      updateDay(day.dayOfWeek, {
                        periods: Array.from({ length: count }, (_, i) => ({
                          index: i + 1,
                          start: day.start,
                          end: day.end,
                          durationMin: 0,
                        })),
                      });
                    }}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                {day.dayOfWeek <= 5 && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">{t("timetable.lunchStart")}</label>
                      <Input
                        type="time"
                        value={day.breaks[0]?.start || "12:00"}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            breaks: [
                              {
                                afterPeriod: 3,
                                start: e.target.value,
                                end: day.breaks[0]?.end || "12:45",
                                label: "Lunch Break",
                              },
                            ],
                          })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">{t("timetable.lunchEnd")}</label>
                      <Input
                        type="time"
                        value={day.breaks[0]?.end || "12:45"}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            breaks: [
                              {
                                afterPeriod: 3,
                                start: day.breaks[0]?.start || "12:00",
                                end: e.target.value,
                                label: "Lunch Break",
                              },
                            ],
                          })
                        }
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  {day.periods.length} {t("timetable.periodsPerDay")} · {formatTime12h(day.start)} – {formatTime12h(day.end)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("common.saving") : t("timetable.saveSchedule")}
        </Button>
      </div>
    </div>
  );
}
