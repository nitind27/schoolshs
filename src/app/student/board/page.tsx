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
  accent,
}: {
  title: string;
  board: string;
  percentage: number | string | null | undefined;
  year: string | null | undefined;
  marksheetPath?: string | null;
  accent: "blue" | "violet";
}) {
  const t = useT();
  const pct = Number(percentage) > 0 ? `${percentage}%` : "—";
  const gradient = accent === "blue" ? "from-blue-500 to-indigo-600" : "from-violet-500 to-purple-600";
  const lightBg = accent === "blue" ? "bg-blue-50 border-blue-100" : "bg-violet-50 border-violet-100";
  const linkColor = accent === "blue" ? "text-blue-700 hover:bg-blue-100" : "text-violet-700 hover:bg-violet-100";

  return (
    <div className="student-board-card">
      <div className={`flex items-center gap-3 border-b border-slate-100 px-5 py-4 ${lightBg}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          <GraduationCap className="h-5 w-5" />
        </div>
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("boardRecords.board")}</p>
          <p className="mt-1 font-semibold text-slate-900">{board || "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Percent className="h-3 w-3" />
            {t("boardRecords.percentage")}
          </p>
          <p className={`mt-1 text-2xl font-bold ${accent === "blue" ? "text-blue-700" : "text-violet-700"}`}>{pct}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("boardRecords.year")}</p>
          <p className="mt-1 font-semibold text-slate-900">{year || "—"}</p>
        </div>
        {marksheetPath ? (
          <a
            href={marksheetPath}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-xl border border-slate-100 p-4 flex items-center gap-2 font-medium transition-colors ${linkColor}`}
          >
            <FileText className="h-5 w-5" />
            {t("boardRecords.viewMarksheet")}
            <ExternalLink className="h-4 w-4 ml-auto" />
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 flex items-center justify-center text-sm text-slate-400">
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
    <div className="space-y-6 max-w-3xl">
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
          accent="blue"
        />
      ) : null}

      {has12 ? (
        <BoardExamCard
          title={t("boardRecords.board12Title")}
          board={student.board12th as string}
          percentage={student.percentage12th as number}
          year={student.year12th as string}
          marksheetPath={student.marksheet12Path as string}
          accent="violet"
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
