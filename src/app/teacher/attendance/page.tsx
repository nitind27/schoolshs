"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  TeacherAttendanceFilters,
  type TeacherClassOption,
} from "@/components/attendance/teacher-attendance-filters";
import { AttendanceEntryGrid } from "@/components/attendance/attendance-entry-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import type { AttendanceRow } from "@/lib/attendance";
import { countMonthPresent } from "@/lib/attendance";
import { ClipboardList, Loader2, Printer, Save, CheckCircle2 } from "lucide-react";

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
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState({ standard: "", section: "", className: "" });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

  const load = useCallback(async () => {
    if (!filters.classId) {
      setError(t("attendance.chooseClass"));
      return;
    }
    setLoading(true);
    setError("");
    setSaved(false);
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
        month: parseInt(filters.month, 10),
        year: parseInt(filters.year, 10),
        rows: rows.map((r) => ({
          studentId: r.studentId,
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
    await load();
  };

  const markAllPresent = () => {
    setRows((prev) =>
      prev.map((row) => {
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

  const printRegisterUrl = () => {
    const p = new URLSearchParams({
      month: filters.month,
      year: filters.year,
      classId: filters.classId,
      auto: "1",
    });
    return `/certificates/class-register?${p}`;
  };

  if (classesLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardList className="h-7 w-7 text-emerald-600" />
            {t("attendance.teacherPageTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("attendance.teacherPageSubtitle")}</p>
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
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={save} disabled={saving}>
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
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {t("attendance.savedOk")}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {meta.className || `${meta.standard}-${meta.section}`}
            </span>
            <span>·</span>
            <span>{t("attendance.studentCount", { count: rows.length })}</span>
          </div>
          <AttendanceEntryGrid rows={rows} onChange={setRows} />
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
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <TeacherAttendanceContent />
    </Suspense>
  );
}
