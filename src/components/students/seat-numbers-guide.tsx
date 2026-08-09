"use client";

import Link from "next/link";
import { Armchair, GraduationCap, ArrowRight } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

/** Explains board (10/12) vs school exam (mid/final) seat numbers. */
export function SeatNumbersGuide({
  teacher = false,
  highlight = "exam",
  className,
}: {
  teacher?: boolean;
  highlight?: "exam" | "board";
  className?: string;
}) {
  const t = useT();
  const examHref = teacher ? "/teacher/exam-seat-numbers" : "/exam-seat-numbers";
  const boardHref = teacher
    ? "/teacher/board-records?view=entry&std=10"
    : "/students/board-records?view=entry&std=10";

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <Link
        href={examHref}
        className={cn(
          "group rounded-2xl border p-4 transition hover:shadow-md",
          highlight === "exam"
            ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200"
            : "border-slate-200 bg-white hover:border-amber-200",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Armchair className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {t("examSeats.guideExamTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t("examSeats.guideExamDesc")}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 group-hover:underline">
              {t("examSeats.guideExamCta")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>

      <Link
        href={boardHref}
        className={cn(
          "group rounded-2xl border p-4 transition hover:shadow-md",
          highlight === "board"
            ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 ring-1 ring-violet-200"
            : "border-slate-200 bg-white hover:border-violet-200",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {t("examSeats.guideBoardTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t("examSeats.guideBoardDesc")}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-800 group-hover:underline">
              {t("examSeats.guideBoardCta")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
