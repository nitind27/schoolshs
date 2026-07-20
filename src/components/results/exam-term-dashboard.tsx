"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Lock,
  Pencil,
  Send,
  Unlock,
  Calendar,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { ExamTermKey } from "@/lib/results/exam-terms";

export type TermStat = {
  key: ExamTermKey;
  labelEn: string;
  labelGu: string;
  maxMarks: number;
  published: boolean;
  locked: boolean;
  examDate: string | null;
  complete: number;
  partial: number;
  pending: number;
  total: number;
  percent: number;
};

const TERM_COLORS: Record<ExamTermKey, string> = {
  mid1: "from-violet-500 to-purple-600",
  mid2: "from-blue-500 to-cyan-600",
  final: "from-amber-500 to-orange-600",
};

export function ExamTermDashboard({
  classId,
  examId,
  termStats,
  midExamCount,
  isAdmin,
  onPublish,
  onUnpublish,
  busyTerm,
}: {
  classId: string;
  examId: string;
  termStats: TermStat[];
  midExamCount: 1 | 2;
  isAdmin?: boolean;
  onPublish?: (term: ExamTermKey) => void;
  onUnpublish?: (term: ExamTermKey) => void;
  busyTerm?: ExamTermKey | null;
}) {
  const t = useT();
  const visible = termStats.filter((ts) => ts.key !== "mid2" || midExamCount === 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t("examTerms.title")}</h2>
          <p className="text-sm text-slate-500">{t("examTerms.subtitle")}</p>
        </div>
        {isAdmin && (
          <Link href={`/results/exams/settings?classId=${classId}`}>
            <Button variant="outline" size="sm">{t("examTerms.settings")}</Button>
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {visible.map((ts) => {
          const color = TERM_COLORS[ts.key];
          return (
            <Card key={ts.key} className="overflow-hidden border-slate-200">
              <div className={cn("h-1.5 bg-gradient-to-r", color)} />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {t(`examTerms.${ts.key}`)}
                    </p>
                    <h3 className="font-bold text-slate-900 mt-0.5">{ts.labelEn}</h3>
                    <p className="text-xs text-slate-400 gu-text">{ts.labelGu}</p>
                  </div>
                  {ts.published ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> {t("examTerms.published")}
                    </span>
                  ) : ts.locked ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      <Lock className="h-3 w-3" /> {t("examTerms.locked")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" /> {t("examTerms.inProgress")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>{t("examTerms.maxMarks", { marks: ts.maxMarks })}</span>
                  {ts.examDate && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" /> {ts.examDate}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t("examTerms.marksEntry")}</span>
                    <span>{ts.percent}% ({ts.complete}/{ts.total})</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full bg-gradient-to-r transition-all", color)}
                      style={{ width: `${ts.percent}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-2 text-[11px] text-slate-500">
                    <span className="text-emerald-600">{ts.complete} {t("examTerms.done")}</span>
                    <span className="text-amber-600">{ts.partial} {t("examTerms.partial")}</span>
                    <span>{ts.pending} {t("examTerms.pending")}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/results/term?classId=${classId}&term=${ts.key}`} className="flex-1 min-w-[120px]">
                    <Button size="sm" className="w-full gap-1" variant={ts.published ? "outline" : "default"}>
                      <Pencil className="h-3.5 w-3.5" />
                      {ts.published ? t("examTerms.viewMarks") : t("examTerms.enterMarks")}
                    </Button>
                  </Link>
                  {!ts.published && onPublish && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={busyTerm === ts.key || ts.complete === 0}
                      onClick={() => onPublish(ts.key)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {busyTerm === ts.key ? "..." : t("examTerms.publish")}
                    </Button>
                  )}
                  {ts.published && onUnpublish && isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-slate-500"
                      disabled={busyTerm === ts.key}
                      onClick={() => onUnpublish(ts.key)}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      {t("examTerms.unpublish")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-50 border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm text-slate-600">
          <BookOpenCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-slate-800">{t("examTerms.flowTitle")}</p>
            <p>{t("examTerms.flowDesc")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
