"use client";

import { studentShortNameGu } from "@/lib/student-names";
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
    { href: "/student/profile", icon: User, label: t("studentNav.myProfile"), desc: studentShortNameGu(student) },
    { href: "/student/results", icon: Award, label: t("studentNav.myResults"), desc: `${reportCards.length} ${t("studentPortal.reportCards")}` },
    { href: "/student/board", icon: GraduationCap, label: t("studentNav.boardRecords"), desc: String(student.board10th || "GSEB") },
    { href: "/student/scholarship", icon: FileCheck, label: t("studentNav.scholarshipStatus"), desc: String(student.scholarshipScheme || "—") },
    { href: "/student/documents", icon: FileText, label: t("studentNav.documents"), desc: t("studentPortal.myDocuments") },
  ];

  return (
    <div className="space-y-5">
      <section className="student-hero relative">
        <div className="relative z-10">
          <p className="student-hero-kicker">{t("studentPortal.welcomeBack")}</p>
          <h1 className="student-hero-name">{studentShortNameGu(student)}</h1>
          <p className="student-hero-meta">
            {t("studentPortal.classRoll", {
              standard: student.standard || "—",
              section: student.section || "—",
              roll: student.rollNumber || "—",
            })}
          </p>
          <div className="student-hero-tags">
            <Badge status={student.status as string} />
            <StudentStatusPill>{String(student.category)}</StudentStatusPill>
            {typeof student.schoolClass === "object" && student.schoolClass !== null && (
              <StudentStatusPill>
                {String((student.schoolClass as { name?: string }).name || "")}
              </StudentStatusPill>
            )}
          </div>
        </div>
      </section>

      <div className="student-metrics">
        <StudentMetricCard
          label={t("studentNav.myResults")}
          value={reportCards.length}
          sub={t("studentPortal.reportCardsAvailable")}
          icon={Award}
        />
        <StudentMetricCard
          label={t("studentPortal.examRecords")}
          value={examResults.length}
          sub={t("studentPortal.examRecordsSynced")}
          icon={ClipboardList}
        />
        <StudentMetricCard
          label={t("studentPortal.currentClass")}
          value={`${student.standard || "—"}-${student.section || "—"}`}
          sub={t("studentPortal.rollLabel", { roll: student.rollNumber || "—" })}
          icon={BookOpen}
        />
        <StudentMetricCard
          label={t("common.status")}
          value={String(student.status || "—")}
          sub={String(student.scholarshipScheme || t("studentPortal.noScholarship"))}
          icon={FileCheck}
        />
      </div>

      <div>
        <h2 className="student-section-title mb-3">{t("studentPortal.quickAccess")}</h2>
        <div className="student-quick-grid">
          {quickLinks.map((c) => (
            <StudentQuickLink key={c.href} {...c} />
          ))}
        </div>
      </div>

      <div className="student-footer-meta">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.06em] text-slate-500">
            {t("studentPortal.lastUpdated")}
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {student.updatedAt
              ? new Date(student.updatedAt as string).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
          </p>
        </div>
        <CalendarDays className="h-8 w-8 text-[var(--sp-accent,#0d7377)] opacity-70" />
      </div>
    </div>
  );
}
