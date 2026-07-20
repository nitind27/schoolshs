"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Clock,
  Printer,
  BookOpen,
  GraduationCap,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/card";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { TimetableScheduleEditor } from "@/components/timetable/timetable-schedule-editor";
import { TimetablePrintTable } from "@/components/timetable/timetable-print-table";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { formatTime12h, type DayScheduleConfig, type TimetableCell } from "@/lib/timetable";
import { useT } from "@/i18n/locale-provider";
import "@/components/timetable/timetable.css";

type ClassOption = {
  id: string;
  name: string;
  standard: string;
  section: string;
  academicYear: string;
  classTeacher?: { firstName: string; lastName: string } | null;
};

type StaffOption = { id: string; firstName: string; lastName: string; designation: string };

export default function TimetablePage() {
  const t = useT();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [entries, setEntries] = useState<TimetableCell[]>([]);
  const [schedule, setSchedule] = useState<DayScheduleConfig[]>([]);
  const [allDays, setAllDays] = useState<DayScheduleConfig[]>([]);
  const [classId, setClassId] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [isReleased, setIsReleased] = useState(false);
  const [releasedAt, setReleasedAt] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [totalSlotCount, setTotalSlotCount] = useState(40);
  const [releasing, setReleasing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ academicYear });
    if (classId) params.set("classId", classId);
    const res = await fetch(`/api/timetable?${params}`);
    const data = await res.json();
    if (res.ok) {
      setClasses(data.classes || []);
      setStaff(data.staff || []);
      setEntries(data.entries || []);
      setSchedule(data.days || []);
      setAllDays(data.allDays || data.days || []);
      setSelectedClass(data.selectedClass || null);
      setIsReleased(data.isReleased ?? false);
      setReleasedAt(data.releasedAt ?? null);
      setSchoolName(data.schoolName || "");
      setTotalSlotCount(data.totalSlots ?? 40);
      if (!classId && data.classes?.length) {
        setClassId(data.classes[0].id);
      }
    }
    setLoading(false);
  }, [classId, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCell = async (data: {
    dayOfWeek: number;
    periodIndex: number;
    subject: string;
    teacherId: string;
    room: string;
  }) => {
    const res = await fetch("/api/timetable", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        academicYear,
        ...data,
        teacherId: data.teacherId || null,
        room: data.room || null,
      }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Save failed");

    setEntries((prev) => {
      const key = `${data.dayOfWeek}-${data.periodIndex}`;
      const filtered = prev.filter((e) => `${e.dayOfWeek}-${e.periodIndex}` !== key);
      if (payload.cleared || !data.subject) return filtered;
      const teacher = staff.find((s) => s.id === data.teacherId);
      return [
        ...filtered,
        {
          dayOfWeek: data.dayOfWeek,
          periodIndex: data.periodIndex,
          subject: data.subject,
          teacherId: data.teacherId || null,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : null,
          room: data.room || null,
        },
      ];
    });
  };

  const handleSaveSchedule = async (days: DayScheduleConfig[]) => {
    const res = await fetch("/api/timetable/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYear, days }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    setAllDays(data.days);
    setSchedule(data.days.filter((d: DayScheduleConfig) => d.enabled));
    await load();
  };

  const handleRelease = async (release: boolean) => {
    setReleasing(true);
    try {
      const res = await fetch("/api/timetable/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, academicYear, release }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setIsReleased(data.isReleased);
      setReleasedAt(data.releasedAt);
    } finally {
      setReleasing(false);
    }
  };

  const filledCount = entries.filter((e) => e.subject).length;
  const weekday = schedule.find((d) => d.dayOfWeek === 1);
  const saturday = schedule.find((d) => d.dayOfWeek === 6);

  return (
    <PageShell
      title={t("timetable.title")}
      subtitle={t("timetable.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("timetable.title") },
      ]}
      icon={<CalendarClock className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
          {classId && (
            <Button
              variant={isReleased ? "outline" : "default"}
              size="sm"
              disabled={releasing}
              onClick={() => void handleRelease(!isReleased)}
            >
              <Send className="h-4 w-4" />
              {isReleased ? t("timetable.unrelease") : t("timetable.release")}
            </Button>
          )}
        </div>
      }
    >
      <div className="print:hidden space-y-4">
        <TimetableScheduleEditor days={allDays} onSave={handleSaveSchedule} />

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-[200px]">
              <Select
                label={t("timetable.selectClass")}
                emptyLabel={t("common.selectClass")}
                options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` }))}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              />
            </div>
            <div className="min-w-[140px]">
              <Select
                label={t("classes.academicYear")}
                emptyLabel={t("common.select")}
                options={[...FINANCIAL_YEARS]}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-sm">{t("timetable.clickHint")}</p>
        </div>

        {classId && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
              isReleased
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {isReleased ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>
              {isReleased ? t("timetable.releasedHint") : t("timetable.draftHint")}
              {releasedAt && (
                <span className="text-xs opacity-75 ml-1">
                  ({new Date(releasedAt).toLocaleString("en-IN")})
                </span>
              )}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={t("timetable.weekdayHours")}
            value={weekday ? `${formatTime12h(weekday.start)} – ${formatTime12h(weekday.end)}` : "—"}
            sub={`${weekday?.periods.length ?? 8} ${t("timetable.periodsPerDay")}`}
            accent="blue"
            icon={<Clock className="h-5 w-5" />}
          />
          <MetricCard
            label={t("timetable.saturdayHours")}
            value={
              saturday?.enabled
                ? `${formatTime12h(saturday.start)} – ${formatTime12h(saturday.end)}`
                : t("timetable.off")
            }
            sub={saturday?.enabled ? `${saturday.periods.length} ${t("timetable.periodsPerDay")}` : undefined}
            accent="violet"
            icon={<BookOpen className="h-5 w-5" />}
          />
          <MetricCard
            label={t("timetable.slotsFilled")}
            value={`${filledCount}/${totalSlotCount}`}
            accent="emerald"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <MetricCard
            label={t("timetable.selectedClass")}
            value={selectedClass?.name || "—"}
            sub={
              selectedClass?.classTeacher
                ? `${selectedClass.classTeacher.firstName} ${selectedClass.classTeacher.lastName}`
                : undefined
            }
            accent="indigo"
            icon={<GraduationCap className="h-5 w-5" />}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : !classId ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center print:hidden">
          <CalendarClock className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-500">{t("timetable.selectClassHint")}</p>
        </div>
      ) : (
        <>
          <div className="print:hidden">
            <TimetableGrid
              schedule={schedule}
              entries={entries}
              staff={staff}
              onSaveCell={handleSaveCell}
            />
          </div>
          <TimetablePrintTable
            title={t("timetable.classTimetable")}
            subtitle={selectedClass?.name}
            schoolName={schoolName}
            academicYear={academicYear}
            schedule={schedule}
            entries={entries}
            footerNote={t("timetable.printFooter")}
          />
        </>
      )}
    </PageShell>
  );
}
