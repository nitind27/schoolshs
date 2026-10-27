"use client";

import { Armchair, Printer, ShieldCheck } from "lucide-react";
import {
  StudentEmptyState,
  StudentError,
  StudentLoading,
  StudentPageHeader,
  useStudentData,
} from "@/components/student-portal/student-portal-ui";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameEn, studentFullNameGu } from "@/lib/student-names";

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

  const fullName = studentFullNameEn(student);
  const fullNameGu = studentFullNameGu(student);

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <StudentPageHeader
        title={t("examSeats.myTitle") || "Exam Seat Numbers & Hall Tickets"}
        subtitle={
          t("examSeats.mySubtitle") ||
          "Official Examination Seating Allocation & Digital Admit Cards"
        }
        icon={Armchair}
        backHref="/student"
        backLabel="Back to Dashboard"
        action={
          assignments.length > 0 ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Hall Tickets</span>
            </button>
          ) : undefined
        }
      />

      {!assignments.length ? (
        <StudentEmptyState
          icon={Armchair}
          title={t("examSeats.notAssigned") || "No Exam Seats Assigned"}
          description={
            t("examSeats.notAssignedDesc") ||
            "Exam seat numbers and hall tickets will be published prior to scheduled term examinations."
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              {/* Ticket Top Strip */}
              <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300">
                      <Armchair className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black tracking-wider uppercase text-indigo-200">
                      Examination Hall Ticket
                    </span>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-indigo-100">
                    {assignment.academicYear}
                  </span>
                </div>
              </div>

              {/* Perforated Divider simulation */}
              <div className="relative flex items-center justify-between px-2 py-1 bg-indigo-50/50 border-y border-dashed border-indigo-200">
                <div className="-ml-4 h-4 w-4 rounded-full bg-slate-100 border-r border-indigo-200" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600">
                  {assignment.termLabelEn}
                </span>
                <div className="-mr-4 h-4 w-4 rounded-full bg-slate-100 border-l border-indigo-200" />
              </div>

              {/* Ticket Content */}
              <div className="p-5">
                {/* Student Mini Meta */}
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{fullName}</h3>
                    {fullNameGu && fullNameGu !== fullName && (
                      <p className="text-xs text-indigo-600 font-semibold">{fullNameGu}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Class / Sec</p>
                    <p className="text-xs font-bold text-slate-800">
                      {assignment.className || `${assignment.standard}-${assignment.section}`}
                    </p>
                  </div>
                </div>

                {/* Seat Number Display */}
                <div className="my-4 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/70 p-5 text-center shadow-inner">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">
                    {t("examSeats.seatNumber") || "OFFICIAL SEAT NUMBER"}
                  </p>
                  <p className="mt-1 font-mono text-4xl font-black tracking-widest text-indigo-950">
                    {assignment.seatNumber}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    Seat allocated for {assignment.termLabelGu || assignment.termLabelEn}
                  </p>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Roll No</span>
                    <span className="font-bold text-slate-900 font-mono">{student.rollNumber || "—"}</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Exam Date</span>
                    <span className="font-bold text-indigo-700">
                      {assignment.examDate
                        ? new Date(assignment.examDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "As per Time-table"}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Hall Ticket
                  </span>
                  <span className="font-mono text-slate-400">GR: {student.grNumber || "—"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
