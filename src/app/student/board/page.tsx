"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentEmptyState,
} from "@/components/student-portal/student-portal-ui";
import { GraduationCap, FileText, ExternalLink, Percent } from "lucide-react";
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
  const pct = Number(percentage) > 0 ? `${percentage}%` : "—";

  return (
    <div className="student-board-card">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-[#f7f9fb] px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sp-ink,#0c1e2e)] text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="student-field">
          <p className="student-field-label">{t("boardRecords.board")}</p>
          <p className="student-field-value">{board || "—"}</p>
        </div>
        <div className="student-field">
          <p className="student-field-label flex items-center gap-1">
            <Percent className="h-3 w-3" />
            {t("boardRecords.percentage")}
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--sp-accent,#0d7377)]">{pct}</p>
        </div>
        <div className="student-field">
          <p className="student-field-label">{t("boardRecords.year")}</p>
          <p className="student-field-value">{year || "—"}</p>
        </div>
        {marksheetPath ? (
          <a
            href={marksheetPath}
            target="_blank"
            rel="noopener noreferrer"
            className="student-field flex items-center gap-2 font-semibold text-[var(--sp-accent,#0d7377)] transition-colors hover:bg-[#e6f4f4]"
          >
            <FileText className="h-5 w-5" />
            {t("boardRecords.viewMarksheet")}
            <ExternalLink className="ml-auto h-4 w-4" />
          </a>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
            {t("studentPortal.noMarksheet")}
          </div>
        )}
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
    <div className="mx-auto max-w-3xl space-y-5">
      <StudentPageHeader
        icon={GraduationCap}
        title={t("studentPortal.boardRecordsGseb")}
        subtitle={t("studentPortal.boardSubtitle")}
      />

      {has10 ? (
        <BoardExamCard
          title={t("boardRecords.board10Title")}
          board={student.board10th as string}
          percentage={student.percentage10th as number}
          year={student.year10th as string}
          marksheetPath={student.marksheet10Path as string}
        />
      ) : null}

      {has12 ? (
        <BoardExamCard
          title={t("boardRecords.board12Title")}
          board={student.board12th as string}
          percentage={student.percentage12th as number}
          year={student.year12th as string}
          marksheetPath={student.marksheet12Path as string}
        />
      ) : null}

      {!has10 && !has12 && (
        <StudentEmptyState
          icon={GraduationCap}
          title={t("studentPortal.noBoardRecords")}
          description={t("studentPortal.noBoardRecordsHint")}
        />
      )}
    </div>
  );
}
