"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentEmptyState,
} from "@/components/student-portal/student-portal-ui";
import { GraduationCap, FileText, ExternalLink, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

function BoardExamCard({
  title,
  board,
  percentage,
  year,
  marksheetPath,
}: {
  title: string;
  board: string;
  percentage: number | string | null | undefined;
  year: string | null | undefined;
  marksheetPath?: string | null;
}) {
  const t = useT();
  const pctNum = Number(percentage) || 0;
  const pct = pctNum > 0 ? `${pctNum}%` : "—";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-slate-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">{title}</h2>
            <p className="text-xs text-slate-500">Official State Board Certificate Record</p>
          </div>
        </div>
        <span className="rounded-full bg-teal-100/80 px-3 py-1 text-xs font-bold text-teal-800">
          {board || "GSEB"}
        </span>
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("boardRecords.board") || "Examination Board"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">{board || "GSEB Gandhinagar"}</p>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
            {t("boardRecords.percentage") || "Final Percentage"}
          </p>
          <p className="mt-1 text-2xl font-black text-teal-900">{pct}</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("boardRecords.year") || "Passing Year"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">{year || "—"}</p>
        </div>

        <div className="sm:col-span-3 pt-2">
          {marksheetPath ? (
            <a
              href={marksheetPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-sm"
            >
              <FileText className="h-4 w-4 text-teal-600" />
              <span>{t("boardRecords.viewMarksheet") || "View & Download Marksheet"}</span>
              <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-70" />
            </a>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 bg-slate-50/50">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <span>Marksheet verified via school admission records.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentBoardPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const has10 = !!(student.board10th || student.percentage10th);
  const has12 = !!(student.board12th || student.percentage12th);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <StudentPageHeader
        icon={GraduationCap}
        title={t("studentPortal.boardRecordsGseb") || "GSEB Board Examination Records"}
        subtitle={
          t("studentPortal.boardSubtitle") ||
          "State Board 10th (SSC) & 12th (HSC) Marksheets and Passing Credentials"
        }
        backHref="/student"
        backLabel="Back to Dashboard"
      />

      {has10 && (
        <BoardExamCard
          title={t("boardRecords.board10Title") || "10th Standard (SSC) Board Record"}
          board={student.board10th as string}
          percentage={student.percentage10th as number}
          year={student.year10th as string}
          marksheetPath={student.marksheet10Path as string}
        />
      )}

      {has12 && (
        <BoardExamCard
          title={t("boardRecords.board12Title") || "12th Standard (HSC) Board Record"}
          board={student.board12th as string}
          percentage={student.percentage12th as number}
          year={student.year12th as string}
          marksheetPath={student.marksheet12Path as string}
        />
      )}

      {!has10 && !has12 && (
        <StudentEmptyState
          icon={GraduationCap}
          title={t("studentPortal.noBoardRecords") || "No Board Records on File"}
          description={
            t("studentPortal.noBoardRecordsHint") ||
            "Board records for 10th (SSC) or 12th (HSC) will be displayed once entered by the school clerk."
          }
        />
      )}
    </div>
  );
}
