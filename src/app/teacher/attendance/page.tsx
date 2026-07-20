"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TeacherAttendanceFilters,
  type TeacherClassOption,
} from "@/components/attendance/teacher-attendance-filters";
import { AttendanceEntryGrid } from "@/components/attendance/attendance-entry-grid";
import { AttendanceViewToolbar } from "@/components/attendance/attendance-view-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import type { AttendanceRow } from "@/lib/attendance";
import { countMonthPresent, compareRollNumbers } from "@/lib/attendance";
import {
  EMPTY_ATTENDANCE_VIEW_FILTERS,
  filterAttendanceRows,
  mergeAttendanceRows,
  parseDayRange,
  resolveVisibleDayIndices,
  type AttendanceViewFilters,
} from "@/lib/attendance-view-filters";
import { ClipboardList, Loader2, Printer, Save, CheckCircle2 } from "lucide-react";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";

function TeacherAttendanceContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [filters, setFilters] = useState({
    classId: searchParams.get("classId") || "",
    month: searchParams.get("month") || String(new Date().getMonth() + 1),
    year: searchParams.get("year") || String(new Date().getFullYear()),
  });
  const [viewFilters, setViewFilters] = useState<AttendanceViewFilters>(EMPTY_ATTENDANCE_VIEW_FILTERS);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState({ standard: "", section: "", className: "" });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  const monthNum = parseInt(filters.month, 10) || new Date().getMonth() + 1;
  const yearNum = parseInt(filters.year, 10) || new Date().getFullYear();

  const dayIndices = useMemo(
    () => resolveVisibleDayIndices(viewFilters, monthNum, yearNum),
    [viewFilters, monthNum, yearNum]
  );

  const filteredRows = useMemo(
    () => filterAttendanceRows(rows, viewFilters, monthNum, yearNum),
    [rows, viewFilters, monthNum, yearNum]
  );

  const highlightDayIndex = useMemo(() => {
    const { from, to, isCustom } = parseDayRange(viewFilters, monthNum, yearNum);
    return isCustom && from === to ? from - 1 : null;
  }, [viewFilters, monthNum, yearNum]);

  useEffect(() => {
    fetch("/api/teacher")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.classes || []).map((c: TeacherClassOption & { students?: unknown[] }) => ({
          id: c.id,
          name: c.name,
          standard: c.standard,
          section: c.section,
        }));
        setClasses(list);
        if (!filters.classId && list.length === 1) {
          setFilters((f) => ({ ...f, classId: list[0]!.id }));
        }
      })
      .finally(() => setClassesLoading(false));
  }, []);

  const load = useCallback(async (opts?: { resetViewFilters?: boolean }) => {
    if (!filters.classId) {
      setError(t("attendance.chooseClass"));
      return;
    }
    setLoading(true);
    setError("");
    setSaved(false);
    if (opts?.resetViewFilters !== false) {
      setViewFilters(EMPTY_ATTENDANCE_VIEW_FILTERS);
    }
    const params = new URLSearchParams({
      month: filters.month,
      year: filters.year,
      classId: filters.classId,
    });

    const res = await fetch(`/api/attendance?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    const cls = classes.find((c) => c.id === filters.classId);
    setRows(data.rows || []);
    setMeta({
      standard: data.standard || cls?.standard || "",
      section: data.section || cls?.section || "",
      className: cls?.name || "",
    });
    setLoaded(true);
    setLoading(false);
  }, [filters, classes, t]);

  const save = async () => {
    if (!filters.classId) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: filters.classId,
        month: monthNum,
        year: yearNum,
        rows: rows.map((r) => ({
          studentId: r.studentId,
          rollNumber: r.rollNumber,
          attendance: r.attendance,
          schoolFee: r.schoolFee,
          termFee: r.termFee,
          admissionFee: r.admissionFee,
          otherFee: r.otherFee,
          note: r.note,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      setSaving(false);
      return;
    }
    setSaved(true);
    setSaving(false);
    await load({ resetViewFilters: false });
  };

  const markAllPresent = () => {
    const ids = new Set(filteredRows.map((r) => r.studentId));
    setRows((prev) =>
      prev.map((row) => {
        if (!ids.has(row.studentId)) return row;
        const attendance = row.attendance.map(() => "P" as const);
        const mt = countMonthPresent(attendance);
        const prevT = parseInt(row.prevTotal || "0", 10) || 0;
        return {
          ...row,
          attendance,
          monthTotal: String(mt),
          cumulative: String(prevT + mt),
        };
      })
    );
  };

  const onGridChange = (nextFiltered: AttendanceRow[]) => {
    setRows((prev) => mergeAttendanceRows(prev, nextFiltered));
  };

  const saveRoll = async (studentId: string, rollNumber: string) => {
    if (!filters.classId) return;
    const res = await fetch("/api/attendance/rolls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: filters.classId,
        updates: [{ studentId, rollNumber }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update roll");
      throw new Error(data.error || "Failed to update roll");
    }
    setRows((prev) => {
      const next = prev.map((r) =>
        r.studentId === studentId ? { ...r, rollNumber } : r
      );
      next.sort((a, b) => compareRollNumbers(a.rollNumber, b.rollNumber));
      return next.map((r, i) => ({ ...r, serial: i + 1 }));
    });
  };

  const downloadExport = async (format: "pdf" | "xlsx") => {
    if (!filters.classId) return;
    setExporting(format);
    try {
      const params = new URLSearchParams({
        type: "attendance",
        format,
        classId: filters.classId,
        month: filters.month,
        year: filters.year,
      });
      const res = await fetch(`/api/teacher/export?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${meta.className || "class"}_${yearNum}-${String(monthNum).padStart(2, "0")}.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  const printRegisterUrl = () => {
    const p = new URLSearchParams({
      month: filters.month,
      year: filters.year,
      classId: filters.classId,
      auto: "1",
    });
    return `/certificates/class-register?${p}`;
  };

  const classLabel = meta.className || `${meta.standard}-${meta.section}`;

  if (classesLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className={`h-8 w-8 animate-spin ${tp.icon}`} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 md:text-xl">
            <ClipboardList className={`h-5 w-5 ${tp.icon}`} />
            {t("attendance.teacherPageTitle")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{t("attendance.teacherPageSubtitle")}</p>
        </div>
        {loaded && rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              {t("attendance.markAllStudentsPresent")}
            </Button>
            <Link href={printRegisterUrl()} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" />
                {t("attendance.printRegister")}
              </Button>
            </Link>
            <Button size="sm" className={tp.btn} onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("attendance.save")}
            </Button>
          </div>
        )}
      </div>

      {!classes.length ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-12 text-center text-amber-900">
            {t("teacherPortal.noClassAssigned")}
          </CardContent>
        </Card>
      ) : (
        <TeacherAttendanceFilters
          classes={classes}
          value={filters}
          onChange={setFilters}
          onLoad={load}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <CheckCircle2 className="h-4 w-4" />
          {t("attendance.savedOk")}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className={`h-8 w-8 animate-spin ${tp.icon}`} />
        </div>
      ) : !loaded ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>{t("attendance.teacherSelectClass")}</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">{t("attendance.noStudents")}</CardContent>
        </Card>
      ) : (
        <>
          <AttendanceViewToolbar
            value={viewFilters}
            onChange={setViewFilters}
            month={monthNum}
            year={yearNum}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
            onDownload={downloadExport}
            downloading={exporting}
          />

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{classLabel}</span>
            <span>·</span>
            <span>{t("attendance.studentCount", { count: filteredRows.length })}</span>
          </div>

          {filteredRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                {t("attendance.reportNoSearchResults")}
              </CardContent>
            </Card>
          ) : (
            <AttendanceEntryGrid
              rows={filteredRows}
              onChange={onGridChange}
              onRollSave={saveRoll}
              visibleDayIndices={dayIndices}
              highlightDayIndex={highlightDayIndex}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className={`h-8 w-8 animate-spin ${tp.icon}`} />
        </div>
      }
    >
      <TeacherAttendanceContent />
    </Suspense>
  );
}
