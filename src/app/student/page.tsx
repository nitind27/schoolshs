"use client";

import { Badge } from "@/components/ui/badge";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentMetricCard,
  StudentQuickLink,
  StudentStatusPill,
} from "@/components/student-portal/student-portal-ui";
import {
  User,
  Award,
  GraduationCap,
  FileCheck,
  FileText,
  CalendarDays,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentDashboard() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading label={t("common.loadingPortal")} />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const reportCards = (student.reportCards as unknown[]) || [];
  const examResults = (student.examResults as unknown[]) || [];

  const quickLinks = [
    { href: "/student/profile", icon: User, label: t("studentNav.myProfile"), desc: `${student.firstName} ${student.surname}`, accent: "sky" as const },
    { href: "/student/results", icon: Award, label: t("studentNav.myResults"), desc: `${reportCards.length} ${t("studentPortal.reportCards")}`, accent: "blue" as const },
    { href: "/student/board", icon: GraduationCap, label: t("studentNav.boardRecords"), desc: String(student.board10th || "GSEB"), accent: "violet" as const },
    { href: "/student/scholarship", icon: FileCheck, label: t("studentNav.scholarshipStatus"), desc: String(student.scholarshipScheme || "—"), accent: "emerald" as const },
    { href: "/student/documents", icon: FileText, label: t("studentNav.documents"), desc: t("studentPortal.myDocuments"), accent: "amber" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="student-hero relative">
        <div className="relative z-10">
          <p className="text-sky-200 text-sm font-medium">{t("studentPortal.welcomeBack")}</p>
          <h1 className="text-3xl font-bold mt-1 sm:text-4xl">
            {student.firstName} {student.surname}
          </h1>
          <p className="text-sky-100/90 mt-2 text-sm sm:text-base">
            {t("studentPortal.classRoll", {
              standard: student.standard || "—",
              section: student.section || "—",
              roll: student.rollNumber || "—",
            })}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge status={student.status as string} />
            <StudentStatusPill variant="muted">{String(student.category)}</StudentStatusPill>
            {typeof student.schoolClass === "object" && student.schoolClass !== null && (
              <StudentStatusPill variant="default">
                {String((student.schoolClass as { name?: string }).name || "")}
              </StudentStatusPill>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StudentMetricCard
          label={t("studentNav.myResults")}
          value={reportCards.length}
          sub={t("studentPortal.reportCardsAvailable")}
          icon={Award}
          accent="blue"
        />
        <StudentMetricCard
          label={t("studentPortal.examRecords")}
          value={examResults.length}
          sub={t("studentPortal.examRecordsSynced")}
          icon={ClipboardList}
          accent="sky"
        />
        <StudentMetricCard
          label={t("studentPortal.currentClass")}
          value={`${student.standard || "—"}-${student.section || "—"}`}
          sub={t("studentPortal.rollLabel", { roll: student.rollNumber || "—" })}
          icon={BookOpen}
          accent="emerald"
        />
        <StudentMetricCard
          label={t("common.status")}
          value={String(student.status || "—")}
          sub={String(student.scholarshipScheme || t("studentPortal.noScholarship"))}
          icon={FileCheck}
          accent="violet"
        />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("studentPortal.quickAccess")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((c) => (
            <StudentQuickLink key={c.href} {...c} />
          ))}
        </div>
      </div>

      <div className="student-section flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("studentPortal.lastUpdated")}</p>
          <p className="font-semibold text-slate-900 mt-1">
            {student.updatedAt
              ? new Date(student.updatedAt as string).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
          </p>
        </div>
        <CalendarDays className="h-10 w-10 text-sky-500 opacity-80" />
      </div>
    </div>
  );
}
