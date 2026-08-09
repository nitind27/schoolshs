"use client";

import { PageLoader } from "@/components/ui/loader";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard, DashboardSection } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeacherHero } from "@/components/teacher/teacher-hero";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";
import {
  TeacherDashboardDetailModal,
  type TeacherDetailKind,
} from "@/components/teacher/teacher-dashboard-detail-modal";
import { useT } from "@/i18n/locale-provider";
import {
  Users,
  BookOpen,
  Award,
  FileText,
  ArrowRight,
  ClipboardList,
  CalendarClock,
  Download,
  RefreshCw,
  UserRound,
  Percent,
  AlertCircle,
  CheckCircle2,
  Clock,
  Hash,
  Armchair,
  GraduationCap,
} from "lucide-react";

type ClassCard = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string;
  academicYear: string;
  studentCount: number;
  boys: number;
  girls: number;
  markedToday: number;
  presentToday: number;
  unmarkedToday: number;
  attendancePct: number;
  examPublished: boolean;
};

type Period = {
  periodIndex: number;
  subject: string;
  room: string | null;
  classId: string;
  className: string;
  startTime: string | null;
  endTime: string | null;
  label: string;
};

type DashboardData = {
  linked: boolean;
  schoolName: string;
  teacherName: string;
  designation?: string;
  academicYear: string;
  month: number;
  year: number;
  generatedAt: string;
  stats: {
    totalClasses: number;
    totalStudents: number;
    boys: number;
    girls: number;
    other: number;
    avgPerClass: number;
    attendanceMarkedToday: number;
    attendancePendingToday: number;
    monthAttendancePct: number;
    todayPeriods: number;
    weeklyPeriods: number;
  };
  classes: ClassCard[];
  students: {
    id: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    rollNumber?: string | null;
    grNumber?: string | null;
    gender?: string | null;
    category?: string | null;
    className: string;
    standard: string;
    section: string;
    boardSeatNumber?: string;
  }[];
  todaySchedule: Period[];
  quickHints: { noStaffLink: boolean; noClasses?: boolean };
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function TeacherDashboard() {
  const t = useT();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailKind, setDetailKind] = useState<TeacherDetailKind | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/dashboard");
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to load dashboard");
      setData(payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const downloadExport = async (format: "xlsx" | "pdf") => {
    setExporting(true);
    setError(null);
    try {
      const p = new URLSearchParams({ type: "dashboard", format });
      const res = await fetch(`/api/teacher/export?${p.toString()}`);
      if (!res.ok) throw new Error(t("common.exportFailed"));
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = /filename=\"?([^\";]+)\"?/i.exec(cd);
      const filename = match?.[1] || `teacher-dashboard.${format}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return <PageLoader />;
  }

  const stats = data?.stats;
  const now = new Date();
  const attHref = (classId: string) =>
    `/teacher/attendance?classId=${classId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`;

  return (
    <div className="teacher-dashboard space-y-5">
      <TeacherHero schoolName={data?.schoolName} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {t("teacherPortal.dashboardTitle")}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {data?.teacherName
                ? t("teacherPortal.welcomeTeacher", { name: data.teacherName })
                : t("teacherPortal.dashboardSubtitle")}
              {data?.academicYear ? ` · ${data.academicYear}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {t("dashboard.refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => downloadExport("xlsx")}
            >
              <Download className="h-4 w-4" />
              {t("dashboard.exportExcel")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => downloadExport("pdf")}
            >
              <Download className="h-4 w-4" />
              {t("dashboard.exportPdf")}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {data?.quickHints?.noStaffLink && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("teacherPortal.noStaffLink")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label={t("teacherPortal.myClasses")}
          value={stats?.totalClasses ?? 0}
          sub={t("teacherPortal.avgPerClass", {
            count: stats?.avgPerClass ?? 0,
          })}
          icon={<BookOpen className="h-5 w-5" />}
          accent="teal"
          onClick={() => setDetailKind("classes")}
        />
        <MetricCard
          label={t("teacherPortal.totalStudents")}
          value={stats?.totalStudents ?? 0}
          sub={t("teacherPortal.genderSplit", {
            boys: stats?.boys ?? 0,
            girls: stats?.girls ?? 0,
          })}
          icon={<Users className="h-5 w-5" />}
          accent="cyan"
          onClick={() => setDetailKind("students")}
        />
        <MetricCard
          label={t("teacherPortal.monthAttendance")}
          value={`${stats?.monthAttendancePct ?? 0}%`}
          sub={t("teacherPortal.monthAttendanceSub", {
            month: MONTH_NAMES[(data?.month ?? now.getMonth() + 1) - 1],
          })}
          icon={<Percent className="h-5 w-5" />}
          accent="indigo"
          onClick={() => setDetailKind("attendance")}
        />
        <MetricCard
          label={t("teacherPortal.todaySchedule")}
          value={stats?.todayPeriods ?? 0}
          sub={t("teacherPortal.weeklyPeriods", {
            count: stats?.weeklyPeriods ?? 0,
          })}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
          onClick={() => setDetailKind("schedule")}
        />
      </div>

      {(stats?.attendancePendingToday ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-950">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              {t("teacherPortal.attendancePendingHint", {
                count: stats?.attendancePendingToday ?? 0,
              })}
            </p>
          </div>
          <Link href="/teacher/attendance">
            <Button size="sm" className={tp.btn}>
              <ClipboardList className="h-4 w-4" />
              {t("teacherPortal.markAttendanceBtn")}
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <DashboardSection
            icon={<BookOpen className="h-5 w-5" />}
            title={t("teacherPortal.myClasses")}
            description={t("teacherPortal.classesDesc")}
            iconClassName={tp.sectionIcon}
            action={
              <Link href="/teacher/attendance" className={`text-sm ${tp.link}`}>
                {t("teacherPortal.viewAll")}
              </Link>
            }
          >
            {!data?.classes?.length ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                {t("teacherPortal.noClassAssigned")}
              </p>
            ) : (
              <div
                className={
                  data.classes.length > 1
                    ? "grid gap-3 xl:grid-cols-2"
                    : "grid gap-3"
                }
              >
                {data.classes.map((cls) => (
                  <div key={cls.id} className="teacher-class-card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/classes/${cls.id}`}
                            className={tp.titleLink}
                          >
                            {cls.name}
                          </Link>
                          {cls.examPublished ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${tp.badgeSuccess}`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {t("teacherPortal.examPublished")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
                              {t("teacherPortal.examDraft")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Std {cls.standard}-{cls.section}
                          {cls.stream ? ` · ${cls.stream}` : ""} ·{" "}
                          {cls.academicYear}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 px-2.5 py-1 font-medium">
                            <Users className="h-3.5 w-3.5" />
                            {t("teacherPortal.studentsEnrolled", {
                              count: cls.studentCount,
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 text-slate-600 px-2.5 py-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {t("teacherPortal.genderSplit", {
                              boys: cls.boys,
                              girls: cls.girls,
                            })}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 text-violet-700 px-2.5 py-1 font-medium">
                            <Percent className="h-3.5 w-3.5" />
                            {cls.attendancePct}%
                          </span>
                          {cls.unmarkedToday > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 text-amber-800 px-2.5 py-1 font-medium">
                              {t("teacherPortal.unmarkedToday", {
                                count: cls.unmarkedToday,
                              })}
                            </span>
                          ) : cls.studentCount > 0 ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium ${tp.badgeSuccess}`}
                            >
                              {t("teacherPortal.attendanceDoneToday")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                        <Link href={attHref(cls.id)}>
                          <Button size="sm" className={`w-full ${tp.btn}`}>
                            <ClipboardList className="h-3.5 w-3.5" />
                            {t("teacherPortal.markAttendanceBtn")}
                          </Button>
                        </Link>
                        <Link href={`/results/term?classId=${cls.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <Award className="h-3.5 w-3.5" />
                            {t("teacherPortal.enterMarks")}
                          </Button>
                        </Link>
                        {["10", "12"].includes(cls.standard) ? (
                          <Link
                            href={`/teacher/board-records?std=${cls.standard}&view=entry&classId=${cls.id}`}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-violet-200 text-violet-700"
                            >
                              <Hash className="h-3.5 w-3.5" />
                              {t("teacherPortal.boardSeatNumber")}
                            </Button>
                          </Link>
                        ) : null}
                        <Link href={`/classes/${cls.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-slate-600"
                          >
                            {t("teacherPortal.viewRoster")}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <div className="space-y-4">
          <DashboardSection
            icon={<CalendarClock className="h-5 w-5" />}
            title={t("teacherPortal.todaySchedule")}
            description={t("teacherPortal.todayScheduleDesc")}
            iconClassName={tp.scheduleIcon}
            action={
              <Link
                href="/teacher/timetable"
                className={`text-sm ${tp.scheduleLink}`}
              >
                {t("teacherPortal.fullTimetable")}
              </Link>
            }
          >
            {!data?.todaySchedule?.length ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {t("teacherPortal.noPeriodsToday")}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {data.todaySchedule.map((p) => (
                  <div
                    key={`${p.classId}-${p.periodIndex}`}
                    className="teacher-period-card flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-800 flex flex-col items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold leading-none mt-0.5">
                        {p.label}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {p.subject}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {p.className}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {p.startTime && p.endTime
                          ? `${p.startTime} – ${p.endTime}`
                          : ""}
                        {p.room ? ` · ${p.room}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            icon={<ClipboardList className="h-5 w-5" />}
            title={t("teacherPortal.quickActions")}
            description={t("teacherPortal.quickActionsDesc")}
            iconClassName={tp.academicsIcon}
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {[
                {
                  href: "/teacher/attendance",
                  icon: ClipboardList,
                  title: t("teacherNav.attendance"),
                  desc: t("teacherPortal.markAttendance"),
                  color: "text-teal-600 bg-teal-50",
                },
                {
                  href: "/results",
                  icon: Award,
                  title: t("teacherNav.results"),
                  desc: t("teacherPortal.enterPublishMarks"),
                  color: "text-indigo-600 bg-indigo-50",
                },
                {
                  href: "/teacher/students",
                  icon: Users,
                  title: t("teacherNav.students"),
                  desc: t("teacherPortal.studentsDesc"),
                  color: "text-cyan-600 bg-cyan-50",
                },
                {
                  href: "/teacher/roll-numbers",
                  icon: Hash,
                  title: t("teacherNav.rollNumbers"),
                  desc: t("rollNumbers.teacherSubtitle"),
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  href: "/teacher/exam-seat-numbers",
                  icon: Armchair,
                  title: t("teacherNav.examSeats"),
                  desc: t("examSeats.teacherSubtitle"),
                  color: "text-amber-700 bg-amber-50",
                },
                {
                  href: "/teacher/board-records?view=entry&std=10",
                  icon: GraduationCap,
                  title: t("teacherNav.boardSeats"),
                  desc: t("examSeats.guideBoardDesc"),
                  color: "text-violet-700 bg-violet-50",
                },
                {
                  href: "/teacher/board-records",
                  icon: FileText,
                  title: t("teacherNav.boardRecords"),
                  desc: t("teacherPortal.boardRecordsDesc"),
                  color: "text-violet-600 bg-violet-50",
                },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="teacher-action-link"
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.color}`}
                  >
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{a.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </DashboardSection>
        </div>
      </div>

      <TeacherDashboardDetailModal
        open={detailKind != null}
        kind={detailKind || "classes"}
        onClose={() => setDetailKind(null)}
        classes={data?.classes || []}
        students={data?.students || []}
        schedule={data?.todaySchedule || []}
        month={data?.month || now.getMonth() + 1}
        year={data?.year || now.getFullYear()}
      />
    </div>
  );
}
