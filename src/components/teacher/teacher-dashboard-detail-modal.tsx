"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Search } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";

export type TeacherDetailKind =
  "classes" | "students" | "attendance" | "schedule";

type ClassRow = {
  id: string;
  name: string;
  studentCount: number;
  boys: number;
  girls: number;
  markedToday: number;
  unmarkedToday: number;
  attendancePct: number;
};

type StudentRow = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  rollNumber?: string | null;
  grNumber?: string | null;
  gender?: string | null;
  category?: string | null;
  className: string;
  boardSeatNumber?: string;
};

type PeriodRow = {
  periodIndex: number;
  subject: string;
  classId: string;
  className: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  label: string;
};

export function TeacherDashboardDetailModal({
  open,
  kind,
  onClose,
  classes,
  students,
  schedule,
  month,
  year,
}: {
  open: boolean;
  kind: TeacherDetailKind;
  onClose: () => void;
  classes: ClassRow[];
  students: StudentRow[];
  schedule: PeriodRow[];
  month: number;
  year: number;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const titles: Record<TeacherDetailKind, string> = {
    classes: t("teacherPortal.detailClasses"),
    students: t("teacherPortal.detailStudents"),
    attendance: t("teacherPortal.detailAttendance"),
    schedule: t("teacherPortal.detailSchedule"),
  };

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [
        student.firstName,
        student.middleName,
        student.surname,
        student.rollNumber,
        student.grNumber,
        student.className,
        student.boardSeatNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, students]);

  const exportType =
    kind === "students"
      ? "roster"
      : kind === "attendance"
        ? "attendance"
        : kind === "schedule"
          ? "schedule"
          : "dashboard";

  const download = async (format: "xlsx" | "pdf") => {
    setExporting(format);
    setError("");
    try {
      const params = new URLSearchParams({
        type: exportType,
        format,
        month: String(month),
        year: String(year),
      });
      const response = await fetch(`/api/teacher/export?${params}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t("common.exportFailed"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = match?.[1] || `teacher-${kind}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("common.exportFailed"),
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <InfoModal isOpen={open} onClose={onClose} title={titles[kind]} size="xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          {kind === "students" ? (
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("teacherPortal.studentSearch")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-700">
              {t("teacherPortal.clickCardHint")}
            </p>
          )}
          <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto">
            {(["xlsx", "pdf"] as const).map((format) => (
              <Button
                key={format}
                type="button"
                variant="outline"
                size="sm"
                disabled={!!exporting}
                onClick={() => void download(format)}
                className={
                  format === "xlsx"
                    ? "w-full border-emerald-200 bg-emerald-50 text-emerald-800 sm:w-auto"
                    : "w-full border-red-200 bg-red-50 text-red-800 sm:w-auto"
                }
              >
                {exporting === format ? (
                  <Spinner size="sm" />
                ) : format === "xlsx" ? (
                  <FileSpreadsheet className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {format === "xlsx"
                  ? t("dashboard.exportExcel")
                  : t("dashboard.exportPdf")}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="max-h-[62dvh] max-w-full overflow-auto rounded-xl border border-slate-200">
          {kind === "students" ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  {[
                    t("fields.roll"),
                    t("common.name"),
                    t("fields.grNumber"),
                    t("nav.classes"),
                    t("fields.gender"),
                    t("fields.category"),
                    t("teacherPortal.boardSeatNumber"),
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono">
                      {student.rollNumber || "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {[student.firstName, student.middleName, student.surname]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {student.grNumber || "—"}
                    </td>
                    <td className="px-3 py-2">{student.className}</td>
                    <td className="px-3 py-2">{student.gender || "—"}</td>
                    <td className="px-3 py-2">{student.category || "—"}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-indigo-700">
                      {student.boardSeatNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : kind === "schedule" ? (
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  {[
                    t("teacherPortal.period"),
                    t("results.subject"),
                    t("nav.classes"),
                    t("teacherPortal.time"),
                    t("teacherPortal.room"),
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((period) => (
                  <tr key={`${period.classId}-${period.periodIndex}`}>
                    <td className="px-3 py-2 font-semibold">{period.label}</td>
                    <td className="px-3 py-2">{period.subject}</td>
                    <td className="px-3 py-2">{period.className}</td>
                    <td className="px-3 py-2">
                      {period.startTime && period.endTime
                        ? `${period.startTime} – ${period.endTime}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{period.room || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  {[
                    t("nav.classes"),
                    t("teacherPortal.totalStudents"),
                    t("teacherPortal.statBoys"),
                    t("teacherPortal.statGirls"),
                    t("teacherPortal.markedToday"),
                    t("teacherPortal.pendingToday"),
                    t("teacherPortal.monthAttendance"),
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-semibold">{item.name}</td>
                    <td className="px-3 py-2">{item.studentCount}</td>
                    <td className="px-3 py-2">{item.boys}</td>
                    <td className="px-3 py-2">{item.girls}</td>
                    <td className="px-3 py-2 text-emerald-700">
                      {item.markedToday}
                    </td>
                    <td className="px-3 py-2 text-amber-700">
                      {item.unmarkedToday}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {item.attendancePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </InfoModal>
  );
}
