"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Printer, User } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";
import { Button } from "@/components/ui/button";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { TimetablePrintTable } from "@/components/timetable/timetable-print-table";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { Select } from "@/components/ui/select";
import type { DayScheduleConfig, TimetableCell } from "@/lib/timetable";
import { periodForDay } from "@/lib/timetable";
import { useT } from "@/i18n/locale-provider";
import "@/components/timetable/timetable.css";

export default function TeacherTimetablePage() {
  const t = useT();
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<DayScheduleConfig[]>([]);
  const [entries, setEntries] = useState<TimetableCell[]>([]);
  const [staffName, setStaffName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/timetable/my?academicYear=${academicYear}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSchedule(data.days || []);
      setEntries(data.entries || []);
      setStaffName(
        data.staff ? `${data.staff.firstName} ${data.staff.lastName}`.trim() : "",
      );
      setSchoolName(data.schoolName || "");
      setEmpty(!data.entries?.length);
    } else {
      setSchedule([]);
      setEntries([]);
      setStaffName("");
      setEmpty(true);
      setError(data.error || t("timetable.loadFailed"));
    }
    setLoading(false);
  }, [academicYear, t]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const periods = entries.length;
    const classes = new Set(entries.map((e) => e.classId).filter(Boolean)).size;
    const subjects = new Set(entries.map((e) => e.subject).filter(Boolean)).size;
    let minutes = 0;
    for (const e of entries) {
      const p = periodForDay(schedule, e.dayOfWeek, e.periodIndex);
      if (p?.durationMin) minutes += p.durationMin;
      else if (p) {
        const [sh, sm] = p.start.split(":").map(Number);
        const [eh, em] = p.end.split(":").map(Number);
        minutes += eh * 60 + em - (sh * 60 + sm);
      }
    }
    const hours = Math.round((minutes / 60) * 10) / 10;
    return { periods, classes, subjects, hours };
  }, [entries, schedule]);

  return (
    <PageShell
      variant="teacher"
      title={t("timetable.myTimetable")}
      subtitle={staffName ? `${t("timetable.teacherSchedule")} — ${staffName}` : t("timetable.myTimetableSub")}
      breadcrumbs={[
        { label: t("teacherNav.dashboard"), href: "/teacher" },
        { label: t("timetable.myTimetable") },
      ]}
      icon={<CalendarClock className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4" />
          {t("certificates.print")}
        </Button>
      }
    >
      <div className="print:hidden mb-4 max-w-xs">
        <Select
          label={t("classes.academicYear")}
          options={[...FINANCIAL_YEARS]}
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className={`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-teal-600`} />
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center print:hidden">
          <User className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">{t("timetable.noReleasedYet")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("timetable.noReleasedYetHint")}</p>
        </div>
      ) : (
        <>
          <div className="print:hidden mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("timetable.statPeriods")}
              </p>
              <p className="text-lg font-bold text-slate-900">{stats.periods}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("timetable.statHours")}
              </p>
              <p className="flex items-center gap-1 text-lg font-bold text-slate-900">
                <Clock3 className={`h-4 w-4 ${tp.icon}`} />
                {stats.hours}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("timetable.statClasses")}
              </p>
              <p className="text-lg font-bold text-slate-900">{stats.classes}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("timetable.statSubjects")}
              </p>
              <p className="text-lg font-bold text-slate-900">{stats.subjects}</p>
            </div>
          </div>

          <div className="print:hidden">
            <TimetableGrid schedule={schedule} entries={entries} staff={[]} readOnly showClassInCell />
          </div>
          <TimetablePrintTable
            title={t("timetable.myTimetable")}
            subtitle={staffName}
            schoolName={schoolName}
            academicYear={academicYear}
            schedule={schedule}
            entries={entries}
            footerNote={t("timetable.teacherPrintFooter")}
          />
        </>
      )}
    </PageShell>
  );
}
