"use client";

import { useState } from "react";
import Link from "next/link";
import { studentListName, studentFullNameEn, studentFullNameGu } from "@/lib/student-names";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentMetricCard,
  StudentQuickLink,
  StudentStatusPill,
  StudentScholarshipTimeline,
  StudentDigitalIdModal,
} from "@/components/student-portal/student-portal-ui";
import {
  User,
  Award,
  GraduationCap,
  FileCheck,
  FileText,
  CalendarDays,
  BookOpen,
  Armchair,
  IdCard,
  Building2,
  CheckCircle2,
  ArrowRight,
  Medal,
  Printer,
  Sparkles,
  Phone,
  HelpCircle,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentDashboard() {
  const t = useT();
  const { student, loading, error } = useStudentData();
  const [showIdModal, setShowIdModal] = useState(false);

  if (loading) return <StudentLoading label={t("common.loadingPortal")} />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const reportCards = (student.reportCards as Record<string, unknown>[]) || [];
  const examSeats = (student.examSeatAssignments as Record<string, unknown>[]) || [];

  const fullNameDisplay = studentListName(student);
  const fullNameEn = studentFullNameEn(student);
  const fullNameGu = studentFullNameGu(student);
  const initials = (student.firstName?.[0] || "S") + (student.surname?.[0] || "T");

  const schemeName = String(student.scholarshipScheme || "").trim();
  const hasScholarship = schemeName && schemeName !== "None" && schemeName !== "—";

  const latestReportCard = reportCards.length > 0 ? reportCards[0] : null;

  const quickLinks = [
    {
      href: "/student/profile",
      icon: User,
      tone: "teal" as const,
      label: t("studentNav.myProfile"),
      desc: t("studentPortal.personalInfoDesc") || "Bio-data, Aadhaar, parents & address",
      badge: student.grNumber ? `GR: ${student.grNumber}` : undefined,
    },
    {
      href: "/student/scholarship",
      icon: FileCheck,
      tone: "indigo" as const,
      label: t("studentNav.scholarshipStatus"),
      desc: hasScholarship ? schemeName : "Government & Institutional Aid",
      badge: hasScholarship ? "Active" : undefined,
    },
    {
      href: "/student/results",
      icon: Award,
      tone: "amber" as const,
      label: t("studentNav.myResults"),
      desc: `${reportCards.length} ${t("studentPortal.reportCards") || "Report Cards Available"}`,
      badge: reportCards.length > 0 ? `${reportCards.length} Cards` : undefined,
    },
    {
      href: "/student/exam-seat-numbers",
      icon: Armchair,
      tone: "sky" as const,
      label: t("examSeats.myTitle"),
      desc: examSeats.length > 0 ? "Digital Admit Card & Seat Pass" : t("examSeats.notAssigned"),
      badge: examSeats.length > 0 ? `${examSeats.length} Active` : undefined,
    },
    {
      href: "/student/board",
      icon: GraduationCap,
      tone: "violet" as const,
      label: t("studentNav.boardRecords"),
      desc: "GSEB 10th (SSC) & 12th (HSC) Official Records",
      badge: String(student.board10th || "GSEB"),
    },
    {
      href: "/student/documents",
      icon: FileText,
      tone: "rose" as const,
      label: t("studentNav.documents"),
      desc: "Certificates, Marksheets & Identity Proofs",
      badge: "Vault",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* =====================================================================
          1. Hero Banner: Personalized Student Welcome & ID Card Quick Action
          ===================================================================== */}
      <section className="student-hero">
        <div className="student-hero-inner">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="student-hero-avatar-ring">
              {student.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoPath as string}
                  alt={fullNameDisplay}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="tracking-wider text-teal-100">{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="student-hero-kicker">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("studentPortal.welcomeBack")}
                </span>
                {student.school?.name && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-50 backdrop-blur-md">
                    <Building2 className="h-3 w-3 text-teal-200" />
                    {student.school.name}
                  </span>
                )}
              </div>

              <h1 className="student-hero-name">{fullNameDisplay}</h1>

              {fullNameGu && fullNameGu !== fullNameEn && (
                <p className="mt-1 text-sm font-semibold text-teal-100/90">{fullNameGu}</p>
              )}

              <p className="student-hero-meta">
                <span>
                  {t("studentPortal.classRoll", {
                    standard: student.standard || "—",
                    section: student.section || "—",
                    roll: student.rollNumber || "—",
                  })}
                </span>
              </p>

              <div className="student-hero-tags">
                <Badge status={student.status as string} />
                <StudentStatusPill>{String(student.category || "General")}</StudentStatusPill>
                {student.admissionStatus && (
                  <StudentStatusPill variant={student.admissionStatus === "verified" ? "success" : "default"}>
                    {student.admissionStatus === "verified" ? "Verified" : student.admissionStatus}
                  </StudentStatusPill>
                )}
              </div>

              <div className="student-hero-actions">
                <button type="button" onClick={() => setShowIdModal(true)} className="student-hero-btn student-hero-btn--primary">
                  <IdCard className="h-4 w-4" />
                  {t("studentPortal.digitalId")}
                </button>
                <Link href="/student/profile" className="student-hero-btn student-hero-btn--ghost">
                  <User className="h-4 w-4" />
                  {t("studentPortal.viewProfile")}
                </Link>
              </div>
            </div>
          </div>

          <div className="student-hero-aside">
            <div className="student-hero-chip">
              <span>{t("studentPortal.class")}</span>
              <strong>{student.standard || "—"}-{student.section || "—"}</strong>
            </div>
            <div className="student-hero-chip">
              <span>{t("studentPortal.rollNumber")}</span>
              <strong>{student.rollNumber || "—"}</strong>
            </div>
            <div className="student-hero-chip">
              <span>{t("studentPortal.grNumber")}</span>
              <strong>{student.grNumber || "—"}</strong>
            </div>
            <div className="student-hero-chip">
              <span>AY</span>
              <strong>{student.financialYear || "—"}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. Metrics Overview Row
          ===================================================================== */}
      <div className="student-metrics">
        <StudentMetricCard
          label={t("studentNav.scholarshipStatus")}
          value={hasScholarship ? schemeName : (student.status as string) || "General"}
          sub={hasScholarship ? "Scholarship Active" : "Direct Benefit Scheme"}
          accent="teal"
          icon={FileCheck}
        />
        <StudentMetricCard
          label={t("studentNav.myResults")}
          value={`${reportCards.length} ${t("studentPortal.reportCards") || "Cards"}`}
          sub={
            latestReportCard?.percentage
              ? `Latest: ${latestReportCard.percentage}%`
              : t("studentPortal.reportCardsAvailable")
          }
          accent="indigo"
          icon={Award}
        />
        <StudentMetricCard
          label={t("examSeats.myTitle")}
          value={examSeats.length > 0 ? `${examSeats.length} Active` : "Ready"}
          sub={examSeats.length > 0 ? "Seat Number Assigned" : "Hall Ticket"}
          accent="amber"
          icon={Armchair}
        />
        <StudentMetricCard
          label={t("studentPortal.currentClass")}
          value={`${student.standard || "—"}-${student.section || "—"}`}
          sub={t("studentPortal.rollLabel", { roll: student.rollNumber || "—" })}
          accent="emerald"
          icon={BookOpen}
        />
      </div>

      {/* =====================================================================
          3. Scholarship Application Spotlight & Direct Benefit Transfer (DBT)
          ===================================================================== */}
      <section className="student-section overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Scholarship & Direct Benefit Transfer (DBT) Status
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  {student.financialYear || "Current AY"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Government scholarship scheme eligibility and bank disbursement verification
              </p>
            </div>
          </div>
          <Link
            href="/student/scholarship"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 transition"
          >
            <span>View Full Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4-Stage Progress Timeline */}
        <div className="pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Application Lifecycle
          </p>
          <StudentScholarshipTimeline status={student.status as string} />
        </div>

        {/* Scheme & Bank Account Details Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Scheme
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">
              {hasScholarship ? schemeName : "Government Pre/Post Matric Scheme"}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Category: {String(student.category || "General")}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Linked Bank Account (DBT)
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">
              {student.bankName ? (
                student.bankName as string
              ) : (
                <span className="text-slate-400 italic">Bank linked via Aadhaar</span>
              )}
            </p>
            <p className="mt-2 text-xs font-mono text-slate-500">
              {student.accountNumber
                ? `A/C: ••••${String(student.accountNumber).slice(-4)}`
                : "Aadhaar Payment Bridge"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Verification Status
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <span>{student.admissionStatus === "verified" ? "Verified by School" : "Under Process"}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500 truncate">
              IFSC: {student.ifscCode ? String(student.ifscCode) : "Verified via SSIP"}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. Quick Navigation Hub: 6 Feature Cards
          ===================================================================== */}
      <div>
        <div className="mb-4">
          <h2 className="student-section-title">{t("studentPortal.quickAccess")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("studentPortal.studentServices")}</p>
        </div>
        <div className="student-quick-grid">
          {quickLinks.map((c) => (
            <StudentQuickLink key={c.href} {...c} />
          ))}
        </div>
      </div>

      {/* =====================================================================
          5. Academic Highlights / Recent Report Cards Preview (if available)
          ===================================================================== */}
      {latestReportCard && (
        <section className="student-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <Medal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {t("studentPortal.academicSnapshot")}
                </h3>
                <p className="text-xs text-slate-500">
                  Standard {String(latestReportCard.standard || student.standard)} • Academic Year{" "}
                  {String(latestReportCard.academicYear || student.financialYear)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {latestReportCard.examId != null && (
                <Link href={`/student/results/print?examId=${String(latestReportCard.examId)}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Printer className="h-3.5 w-3.5" />
                    Print Marksheet
                  </Button>
                </Link>
              )}
              <Link href="/student/results">
                <Button size="sm" className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white">
                  <span>View All Results</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Percentage
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {Number(latestReportCard.percentage || 0).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Grade {String(latestReportCard.grade || "A")}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, Number(latestReportCard.percentage || 0)))}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Marks Secured
              </p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {String(latestReportCard.totalMarks || "—")}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Result Status:{" "}
                <span className="font-bold text-emerald-700">
                  {String(latestReportCard.result || "Pass")}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Class Standing & Rank
              </p>
              <p className="mt-2 text-3xl font-extrabold text-amber-600">
                {latestReportCard.rank ? `#${String(latestReportCard.rank)}` : "Verified"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Official Report Card published by school
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          6. School Helpdesk & Support Banner
          ===================================================================== */}
      <div className="student-help-banner">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold sm:text-base">{t("studentPortal.needHelp")}</h4>
            <p className="mt-0.5 text-xs text-teal-50/85">{t("studentPortal.needHelpHint")}</p>
          </div>
        </div>
        {student.school?.phone && (
          <a
            href={`tel:${student.school.phone}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-teal-900 shadow-sm"
          >
            <Phone className="h-3.5 w-3.5" />
            {student.school.phone}
          </a>
        )}
      </div>

      {/* =====================================================================
          7. Footer Metadata & Verification Stamp
          ===================================================================== */}
      <div className="student-footer-meta">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("studentPortal.lastUpdated")}
            </p>
            <p className="text-xs font-bold text-slate-800">
              {student.updatedAt
                ? new Date(student.updatedAt as string).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Live Session Active"}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{t("studentPortal.verifiedSession")}</span>
        </div>
      </div>

      {/* =====================================================================
          Digital ID Card Modal
          ===================================================================== */}
      <StudentDigitalIdModal
        student={student}
        isOpen={showIdModal}
        onClose={() => setShowIdModal(false)}
      />
    </div>
  );
}
