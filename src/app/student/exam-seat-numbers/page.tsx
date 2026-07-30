"use client";

import { Armchair, CalendarDays, GraduationCap } from "lucide-react";
import {
  StudentEmptyState,
  StudentError,
  StudentLoading,
  StudentPageHeader,
  StudentStatusPill,
  useStudentData,
} from "@/components/student-portal/student-portal-ui";
import { useT } from "@/i18n/locale-provider";

type SeatAssignment = {
  id: string;
  seatNumber: string;
  termLabelEn: string;
  termLabelGu: string;
  examDate?: string | null;
  academicYear: string;
  className: string;
  standard: string;
  section: string;
};

export default function StudentExamSeatNumbersPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading label={t("common.loadingPortal")} />;
  if (error || !student) {
    return <StudentError message={error || t("studentPortal.loadError")} />;
  }

  const assignments =
    (student.examSeatAssignments as SeatAssignment[] | undefined) || [];

  return (
    <div className="space-y-5">
      <StudentPageHeader
        title={t("examSeats.myTitle")}
        subtitle={t("examSeats.mySubtitle")}
        icon={Armchair}
      />

      {!assignments.length ? (
        <StudentEmptyState
          icon={Armchair}
          title={t("examSeats.notAssigned")}
          description={t("examSeats.notAssignedDesc")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
            >
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-indigo-100 to-transparent" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      {assignment.termLabelEn}
                    </p>
                    {assignment.termLabelGu !== assignment.termLabelEn ? (
                      <p className="mt-0.5 text-sm text-slate-500">
                        {assignment.termLabelGu}
                      </p>
                    ) : null}
                  </div>
                  <StudentStatusPill>
                    {assignment.academicYear}
                  </StudentStatusPill>
                </div>

                <div className="my-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-5 text-center">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {t("examSeats.seatNumber")}
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black tracking-wider text-indigo-800">
                    {assignment.seatNumber}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {assignment.className ||
                      `${assignment.standard}-${assignment.section}`}
                  </span>
                  {assignment.examDate ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(assignment.examDate).toLocaleDateString("en-IN")}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
