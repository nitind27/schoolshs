"use client";

import { MetricCard } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import { Users, CheckCircle2, XCircle, Clock, Percent } from "lucide-react";

export interface AttendanceReportSummary {
  totalStudents: number;
  markedStudents: number;
  avgPercent: number;
  totalPresent: number;
  totalAbsent: number;
  totalHalf: number;
  totalMarkedDays: number;
}

export function AttendanceReportSummaryCards({ summary }: { summary: AttendanceReportSummary }) {
  const t = useT();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        label={t("attendance.reportTotalStudents")}
        value={summary.totalStudents}
        sub={t("attendance.reportMarkedCount", { count: summary.markedStudents })}
        icon={<Users className="h-5 w-5" />}
        accent="blue"
      />
      <MetricCard
        label={t("attendance.reportAvgPercent")}
        value={`${summary.avgPercent}%`}
        icon={<Percent className="h-5 w-5" />}
        accent="emerald"
      />
      <MetricCard
        label={t("attendance.present")}
        value={summary.totalPresent}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accent="emerald"
      />
      <MetricCard
        label={t("attendance.absent")}
        value={summary.totalAbsent}
        icon={<XCircle className="h-5 w-5" />}
        accent="rose"
      />
      <MetricCard
        label={t("attendance.halfDay")}
        value={summary.totalHalf}
        icon={<Clock className="h-5 w-5" />}
        accent="amber"
      />
    </div>
  );
}
