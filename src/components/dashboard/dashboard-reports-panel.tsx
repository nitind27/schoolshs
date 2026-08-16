"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  LayoutGrid,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  User,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DashboardFiltersBar,
  EMPTY_FILTERS,
  type DashboardFilterMeta,
  type DashboardFilterValues,
} from "@/components/dashboard/dashboard-filters";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardSummaryTable } from "@/components/dashboard/dashboard-summary-table";
import { DoughnutChart, VerticalBarChart, type ChartSegment } from "@/components/dashboard/charts";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import type { DashboardExportOptions } from "@/lib/dashboard-export-options";
import type { OpsOverview } from "@/components/dashboard/dashboard-command-center";
import type { HrModalKind } from "@/components/dashboard/dashboard-hr-data-modal";
import { MONTH_NAMES } from "@/lib/staff-hr";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { DashboardStaffExportDialog, type StaffExportMode } from "@/components/dashboard/dashboard-staff-export-dialog";
import {
  DashboardStaffPrintReport,
  type StaffPrintPayload,
} from "@/components/dashboard/dashboard-staff-print-report";

type TableRow = { label: string; value: number; percent?: number };
type ReportView = "students" | "staff";

type HrSummary = {
  month: number;
  year: number;
  totalStaff: number;
  withSalary?: number;
  attendanceMarked: number;
  attendanceUnmarked?: number;
  payrollPending: number;
  payrollPaid: number;
  totalGross?: number;
  totalNet?: number;
} | null;

interface Props {
  filters: DashboardFilterValues;
  filterMeta: DashboardFilterMeta;
  defaultAcademicYear: string;
  onFiltersChange: (filters: DashboardFilterValues) => void;
  stats: {
    total: number;
    totalClasses?: number;
    totalStaff?: number;
    schoolName?: string;
    completionRate: number;
    byStatus?: Record<string, number>;
    byGender?: { total: number; male?: number; female?: number; other?: number };
    admissions?: { pending: number; verified: number; rejected: number; total: number };
    admissionRecent?: {
      id: string;
      name: string;
      classLabel: string;
      category?: string | null;
      verifiedAt: string | null;
      verifiedBy: string;
    }[];
    recentSubmissions?: {
      id: string;
      createdAt: string;
      totalCount: number;
      successCount: number;
      failedCount: number;
      status: string;
    }[];
  } | null;
  ops: OpsOverview | null;
  hr: HrSummary;
  report: DashboardReportData | null;
  loading?: boolean;
  lastUpdated?: Date | null;
  onRefresh: () => void;
  onPrintReady?: (rows: ExportStudentRow[], options: DashboardExportOptions) => void;
  categorySegments: ChartSegment[];
  standardSegments: ChartSegment[];
  statusSegments: ChartSegment[];
  genderSegments: ChartSegment[];
  classSegments: ChartSegment[];
  admissionSegments: ChartSegment[];
  staffSegments: ChartSegment[];
  staffAttnSegments: ChartSegment[];
  payrollSegments: ChartSegment[];
  tableByStandard: TableRow[];
  tableByClass: TableRow[];
  tableByCategory: TableRow[];
  tableByStatus: TableRow[];
  tableByGender: TableRow[];
  onDrill: (dimension: "category" | "standard" | "status" | "gender" | "class", seg: ChartSegment) => void;
  onOpenAllStudents?: () => void;
  onOpenAdmission?: (status: string, label: string) => void;
  onOpenStaffList?: (designation: string, label: string) => void;
  onOpenHr?: (kind: HrModalKind) => void;
  onHrPeriodChange?: (month: number, year: number) => void;
}

function ReportKpi({
  tone,
  icon,
  value,
  label,
  onClick,
  href,
  extra,
}: {
  tone: string;
  icon: ReactNode;
  value: string | number;
  label: string;
  onClick?: () => void;
  href?: string;
  extra?: ReactNode;
}) {
  const className = `ops-reports-kpi is-${tone}${onClick || href ? " is-click" : ""}`;
  const inner = (
    <>
      {icon}
      <strong>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</strong>
      <span>{label}</span>
      {extra}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

function ReportBlock({
  step,
  title,
  desc,
  children,
}: {
  step: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="ops-rpt-block">
      <header className="ops-rpt-block-head">
        <span className="ops-rpt-n">{step}</span>
        <div className="min-w-0">
          <h3>{title}</h3>
          {desc ? <p>{desc}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function DashboardReportsPanel({
  filters,
  filterMeta,
  defaultAcademicYear,
  onFiltersChange,
  stats,
  ops,
  hr,
  report,
  loading,
  lastUpdated,
  onRefresh,
  onPrintReady,
  categorySegments,
  standardSegments,
  statusSegments,
  genderSegments,
  classSegments,
  admissionSegments,
  staffSegments,
  staffAttnSegments,
  payrollSegments,
  tableByStandard,
  tableByClass,
  tableByCategory,
  tableByStatus,
  tableByGender,
  onDrill,
  onOpenAllStudents,
  onOpenAdmission,
  onOpenStaffList,
  onOpenHr,
  onHrPeriodChange,
}: Props) {
  const t = useT();
  const [view, setView] = useState<ReportView>("students");
  const [staffFy, setStaffFy] = useState("");
  const [staffDesignation, setStaffDesignation] = useState("");
  const [staffExportMode, setStaffExportMode] = useState<StaffExportMode | null>(null);
  const [staffPrint, setStaffPrint] = useState<StaffPrintPayload | null>(null);

  const total = stats?.total || 0;
  const staff = hr?.totalStaff || stats?.totalStaff || ops?.staff?.active || 0;
  const classes = stats?.totalClasses || ops?.classes?.total || 0;
  const unmarked =
    hr?.attendanceUnmarked ?? Math.max(0, staff - (hr?.attendanceMarked || 0));
  const fy = filters.academicYear || defaultAcademicYear || "2025-26";
  const statementFy = staffFy || fy;
  const hrMonth = hr?.month || new Date().getMonth() + 1;
  const hrYear = hr?.year || new Date().getFullYear();
  const nowYear = new Date().getFullYear();
  const hrYears = Array.from({ length: nowYear - 2016 }, (_, i) => nowYear + 1 - i);
  if (!hrYears.includes(hrYear)) hrYears.unshift(hrYear);
  const fyOptions = Array.from(
    new Set([...FINANCIAL_YEARS, fy, statementFy, defaultAcademicYear].filter(Boolean)),
  ) as string[];
  const designationOptions = staffSegments.map((s) => s.label).filter(Boolean);
  const visibleStaffSegments = staffDesignation
    ? staffSegments.filter((s) => s.label === staffDesignation || s.id === staffDesignation)
    : staffSegments;
  const periodLabel = `${MONTH_NAMES[hrMonth - 1] || hrMonth} ${hrYear}`;
  const inr = (n: number) =>
    `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const byStatus = stats?.byStatus || {};
  const boys = stats?.byGender?.male || 0;
  const girls = stats?.byGender?.female || 0;
  const otherGender = stats?.byGender?.other || 0;
  const photoNeed = ops?.idCards?.needingPhoto || ops?.students?.withoutPhoto || 0;
  const completion = stats?.completionRate || 0;
  const admissionRecent = stats?.admissionRecent || [];
  const submissions = stats?.recentSubmissions || [];

  const drillStatus = (id: string, label: string, value: number, color: string) =>
    onDrill("status", { id, label, value, color });
  const drillGender = (id: string, label: string, value: number, color: string) =>
    onDrill("gender", { id, label, value, color });

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const submissionStatusLabel = (status: string) => {
    const key = `dashboard.submission${status.charAt(0).toUpperCase()}${status.slice(1)}`;
    const label = t(key);
    return label === key ? status : label;
  };

  return (
    <div className="ops-reports">
      <header className="ops-reports-hero">
        <span className="ops-reports-hero-ico">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ops-reports-kicker">{fy}</p>
          <h2>{t("dashboard.reportsTitle")}</h2>
          <p>
            {view === "students"
              ? t("dashboard.reportsStudentSubtitle")
              : t("dashboard.reportsStaffSubtitle")}
          </p>
        </div>
        <div className="ops-reports-switch" role="tablist" aria-label={t("dashboard.reportsTitle")}>
          <button
            type="button"
            role="tab"
            className={view === "students" ? "is-active" : undefined}
            aria-selected={view === "students"}
            onClick={() => setView("students")}
          >
            <Users className="h-3.5 w-3.5" />
            {t("dashboard.reportsTabStudents")}
          </button>
          <button
            type="button"
            role="tab"
            className={view === "staff" ? "is-active" : undefined}
            aria-selected={view === "staff"}
            onClick={() => setView("staff")}
          >
            <Briefcase className="h-3.5 w-3.5" />
            {t("dashboard.reportsTabStaff")}
          </button>
        </div>
      </header>

      {view === "students" ? (
        <>
          <ReportBlock
            step="01"
            title={t("dashboard.reportsSectionFilters")}
            desc={t("dashboard.reportsSectionFiltersDesc")}
          >
            <section className="ops-control ops-control-compact ops-reports-tools" aria-label={t("dashboard.controlCenterTitle")}>
              <div className="ops-top ops-top-tools">
                <DashboardFiltersBar
                  filters={filters}
                  meta={filterMeta}
                  onChange={onFiltersChange}
                  onReset={() =>
                    onFiltersChange({
                      ...EMPTY_FILTERS,
                      academicYear: defaultAcademicYear || "",
                    })
                  }
                  resultCount={total}
                  defaultAcademicYear={defaultAcademicYear}
                />
                <DashboardToolbar
                  report={report}
                  filters={filters}
                  loading={loading}
                  onRefresh={onRefresh}
                  onPrintReady={onPrintReady}
                  lastUpdated={lastUpdated}
                />
              </div>
              <p className="ops-reports-hint">{t("dashboard.reportsDownloadHint")}</p>
            </section>
          </ReportBlock>

          <ReportBlock
            step="02"
            title={t("dashboard.reportsSectionSnapshot")}
            desc={t("dashboard.reportsSectionSnapshotDesc")}
          >
            <section className="ops-reports-kpis is-6" aria-label={t("dashboard.reportsSectionSnapshot")}>
              <ReportKpi
                tone="blue"
                icon={<Users className="h-4 w-4" />}
                value={total}
                label={t("dashboard.totalStudents")}
                onClick={onOpenAllStudents}
              />
              <ReportKpi
                tone="sky"
                icon={<User className="h-4 w-4" />}
                value={boys}
                label={t("dashboard.boys")}
                onClick={() => drillGender("male", t("gender.male"), boys, "#2563eb")}
              />
              <ReportKpi
                tone="pink"
                icon={<UserRound className="h-4 w-4" />}
                value={girls}
                label={t("dashboard.girls")}
                onClick={() => drillGender("female", t("gender.female"), girls, "#db2777")}
              />
              {otherGender > 0 ? (
                <ReportKpi
                  tone="slate"
                  icon={<Users className="h-4 w-4" />}
                  value={otherGender}
                  label={t("dashboard.otherGender")}
                  onClick={() =>
                    drillGender("other", t("gender.other"), otherGender, "#64748b")
                  }
                />
              ) : null}
              <ReportKpi
                tone="violet"
                icon={<GraduationCap className="h-4 w-4" />}
                value={classes}
                label={t("dashboard.reportsKpiClasses")}
                href="/classes"
              />
              <ReportKpi
                tone="slate"
                icon={<CheckCircle className="h-4 w-4" />}
                value={`${completion}%`}
                label={t("dashboard.completionRate")}
                extra={
                  <span className="ops-reports-kpi-bar" aria-hidden>
                    <i style={{ width: `${Math.min(100, Math.max(0, completion))}%` }} />
                  </span>
                }
              />
              <ReportKpi
                tone="amber"
                icon={<Camera className="h-4 w-4" />}
                value={photoNeed}
                label={t("dashboard.attnNeedPhoto")}
                href="/id-cards"
              />
            </section>
          </ReportBlock>

          <ReportBlock
            step="03"
            title={t("dashboard.reportsSectionPipeline")}
            desc={t("dashboard.reportsSectionPipelineDesc")}
          >
            <div className="ops-rpt-kpis-stack">
              <div className="ops-rpt-kpi-row">
                <p className="ops-rpt-kpi-row-label">{t("dashboard.reportsPipelineScholarship")}</p>
                <section className="ops-reports-kpis is-4" aria-label={t("dashboard.reportsPipelineScholarship")}>
                  <ReportKpi
                    tone="amber"
                    icon={<AlertCircle className="h-4 w-4" />}
                    value={byStatus.draft || 0}
                    label={t("dashboard.incomplete")}
                    onClick={() =>
                      drillStatus("draft", t("status.draft"), byStatus.draft || 0, "#d97706")
                    }
                  />
                  <ReportKpi
                    tone="teal"
                    icon={<FileCheck className="h-4 w-4" />}
                    value={byStatus.ready || 0}
                    label={t("dashboard.readyToSubmit")}
                    onClick={() =>
                      drillStatus("ready", t("status.ready"), byStatus.ready || 0, "#059669")
                    }
                  />
                  <ReportKpi
                    tone="violet"
                    icon={<Send className="h-4 w-4" />}
                    value={byStatus.submitted || 0}
                    label={t("dashboard.submitted")}
                    onClick={() =>
                      drillStatus("submitted", t("status.submitted"), byStatus.submitted || 0, "#7c3aed")
                    }
                  />
                  <ReportKpi
                    tone="blue"
                    icon={<ShieldCheck className="h-4 w-4" />}
                    value={byStatus.approved || 0}
                    label={t("dashboard.reportsKpiApproved")}
                    onClick={() =>
                      drillStatus("approved", t("status.approved"), byStatus.approved || 0, "#2563eb")
                    }
                  />
                </section>
              </div>
              <div className="ops-rpt-kpi-row">
                <p className="ops-rpt-kpi-row-label">{t("dashboard.reportsPipelineAdmission")}</p>
                <section className="ops-reports-kpis is-3" aria-label={t("dashboard.reportsPipelineAdmission")}>
                  <ReportKpi
                    tone="rose"
                    icon={<ClipboardCheck className="h-4 w-4" />}
                    value={stats?.admissions?.pending || 0}
                    label={t("admissionStatus.pending")}
                    onClick={() =>
                      onOpenAdmission?.("pending", t("admissionStatus.pending"))
                    }
                  />
                  <ReportKpi
                    tone="emerald"
                    icon={<CheckCircle className="h-4 w-4" />}
                    value={stats?.admissions?.verified || 0}
                    label={t("admissionStatus.verified")}
                    onClick={() =>
                      onOpenAdmission?.("verified", t("admissionStatus.verified"))
                    }
                  />
                  <ReportKpi
                    tone="slate"
                    icon={<LayoutGrid className="h-4 w-4" />}
                    value={stats?.admissions?.rejected || 0}
                    label={t("admissionStatus.rejected")}
                    onClick={() =>
                      onOpenAdmission?.("rejected", t("admissionStatus.rejected"))
                    }
                  />
                </section>
              </div>
            </div>
          </ReportBlock>

          <ReportBlock
            step="04"
            title={t("dashboard.reportsSectionCharts")}
            desc={t("dashboard.reportsSectionChartsDesc")}
          >
          <section className="ops-insights ops-insights-compact ops-reports-charts">
            <div className="ops-charts-grid">
              <article className="ops-chart-card" data-tone="violet">
                <header>
                  <h3>{t("dashboard.categoryChart")}</h3>
                  <p>{t("dashboard.chartClickHint")}</p>
                </header>
                <DoughnutChart
                  segments={categorySegments}
                  centerValue={total}
                  centerLabel={t("dashboard.totalLabel")}
                  size={148}
                  onSegmentClick={(seg) => onDrill("category", seg)}
                />
              </article>

              <article className="ops-chart-card" data-tone="blue">
                <header>
                  <h3>{t("dashboard.standardBarChart")}</h3>
                  <p>{t("dashboard.chartClickHint")}</p>
                </header>
                {standardSegments.length > 0 ? (
                  <VerticalBarChart
                    segments={standardSegments}
                    onSegmentClick={(seg) => onDrill("standard", seg)}
                  />
                ) : (
                  <div className="ops-insights-empty-box">
                    <GraduationCap className="h-7 w-7 opacity-40" />
                    <p>{t("dashboard.noClassData")}</p>
                  </div>
                )}
              </article>

              <article className="ops-chart-card" data-tone="teal">
                <header>
                  <h3>{t("dashboard.statusChart")}</h3>
                  <p>{t("dashboard.statusChartDesc")}</p>
                </header>
                {statusSegments.length > 0 ? (
                  <VerticalBarChart
                    segments={statusSegments}
                    onSegmentClick={(seg) => onDrill("status", seg)}
                  />
                ) : (
                  <div className="ops-insights-empty-box">
                    <p>{t("dashboard.noClassData")}</p>
                  </div>
                )}
              </article>

              <article className="ops-chart-card" data-tone="pink">
                <header>
                  <h3>{t("dashboard.genderChart")}</h3>
                  <p>{t("dashboard.chartClickHint")}</p>
                </header>
                <DoughnutChart
                  segments={genderSegments}
                  centerValue={stats?.byGender?.total || 0}
                  centerLabel={t("dashboard.totalLabel")}
                  size={148}
                  onSegmentClick={(seg) => onDrill("gender", seg)}
                />
              </article>

              <article className="ops-chart-card ops-chart-wide" data-tone="blue">
                <header>
                  <h3>{t("dashboard.classBarChart")}</h3>
                  <p>{t("dashboard.chartClickHint")}</p>
                </header>
                {classSegments.length > 0 ? (
                  <VerticalBarChart
                    segments={classSegments}
                    onSegmentClick={(seg) => onDrill("class", seg)}
                  />
                ) : (
                  <div className="ops-insights-empty-box">
                    <p>{t("dashboard.noClassData")}</p>
                  </div>
                )}
              </article>

              <article className="ops-chart-card ops-chart-wide" data-tone="amber">
                <header>
                  <h3>{t("dashboard.admissionChartTitle")}</h3>
                  <p>{t("dashboard.admissionChartDesc")}</p>
                </header>
                {admissionSegments.length > 0 ? (
                  <DoughnutChart
                    className="ops-doughnut-wide"
                    segments={admissionSegments}
                    centerValue={stats?.admissions?.total || 0}
                    centerLabel={t("dashboard.totalLabel")}
                    size={148}
                    showZero
                    legendTiles
                    onSegmentClick={(seg) =>
                      onOpenAdmission?.(seg.id || seg.label, seg.label)
                    }
                  />
                ) : (
                  <div className="ops-insights-empty-box">
                    <p>{t("dashboard.noClassData")}</p>
                  </div>
                )}
              </article>
            </div>
          </section>
          </ReportBlock>

          <ReportBlock
            step="05"
            title={t("dashboard.reportsSectionActivity")}
            desc={t("dashboard.reportsSectionActivityDesc")}
          >
            <div className="ops-rpt-activity">
              <article className="ops-rpt-list">
                <header>
                  <h4>{t("dashboard.admissionRecentTitle")}</h4>
                  <p>{t("dashboard.admissionRecentDesc")}</p>
                </header>
                {admissionRecent.length === 0 ? (
                  <p className="ops-rpt-empty">{t("dashboard.admissionRecentEmpty")}</p>
                ) : (
                  <ul>
                    {admissionRecent.slice(0, 6).map((row) => (
                      <li key={row.id}>
                        <Link href={`/students/${row.id}`}>
                          <strong>{row.name || "—"}</strong>
                          <span>
                            {row.classLabel}
                            {row.category ? ` · ${row.category}` : ""}
                          </span>
                          <em>
                            {fmtDate(row.verifiedAt)} · {row.verifiedBy}
                          </em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/admissions" className="ops-rpt-list-more">
                  {t("dashboard.shortcutVerifyDesk")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>

              <article className="ops-rpt-list is-teal">
                <header>
                  <h4>{t("dashboard.recentSubmissions")}</h4>
                  <p>{t("dashboard.reportsSubmissionsDesc")}</p>
                </header>
                {submissions.length === 0 ? (
                  <p className="ops-rpt-empty">{t("dashboard.noSubmissions")}</p>
                ) : (
                  <ul>
                    {submissions.slice(0, 6).map((row) => (
                      <li key={row.id}>
                        <div>
                          <strong>{fmtDate(row.createdAt)}</strong>
                          <span>
                            {t("dashboard.success")}: {row.successCount} · {t("dashboard.failed")}: {row.failedCount}
                            {" · "}
                            {row.totalCount}
                          </span>
                          <em className="ops-rpt-status">{submissionStatusLabel(row.status)}</em>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/bulk-submit" className="ops-rpt-list-more">
                  {t("nav.bulkSubmit")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </div>
          </ReportBlock>

          <ReportBlock
            step="06"
            title={t("dashboard.dataSummary")}
            desc={t("dashboard.dataSummaryDesc")}
          >
            <DashboardSummaryTable
              total={total}
              byStandard={tableByStandard}
              byClass={tableByClass}
              byCategory={tableByCategory}
              byStatus={tableByStatus}
              byGender={tableByGender}
            />
          </ReportBlock>

          <div className="ops-flow-more ops-staff-shortcuts ops-rpt-links">
            <span className="ops-flow-more-label">{t("dashboard.studentShortcuts")}</span>
            <div className="ops-flow-actions">
              {(
                [
                  { href: "/students", label: t("dashboard.shortcutAllStudents"), icon: Users, tone: "blue" as const },
                  { href: "/import", label: t("dashboard.shortcutImport"), icon: Upload, tone: "teal" as const },
                  { href: "/id-cards", label: t("dashboard.shortcutIdCards"), icon: CreditCard, tone: "violet" as const },
                  { href: "/attendance", label: t("dashboard.shortcutStudentAttn"), icon: CalendarDays, tone: "amber" as const },
                  { href: "/admissions", label: t("dashboard.shortcutVerifyDesk"), icon: ClipboardCheck, tone: "sky" as const },
                  { href: "/bulk-submit", label: t("dashboard.readyToSubmit"), icon: Send, tone: "indigo" as const },
                ]
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="ops-flow-action" data-tone={item.tone}>
                    <span className="ops-flow-action-ico"><Icon className="h-4 w-4" /></span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <ReportBlock
            step="01"
            title={t("dashboard.reportsStaffFilters")}
            desc={t("dashboard.reportsStaffFiltersDesc")}
          >
            <section className="ops-reports-staff-tools">
              <div className="ops-staff-filters is-4">
                <label className="ops-staff-filter-field">
                  <span>{t("dashboard.reportsStaffMonth")}</span>
                  <select
                    className="dashboard-filter-select"
                    value={hrMonth}
                    onChange={(e) =>
                      onHrPeriodChange?.(Number(e.target.value), hrYear)
                    }
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ops-staff-filter-field">
                  <span>{t("dashboard.reportsStaffYear")}</span>
                  <select
                    className="dashboard-filter-select"
                    value={hrYear}
                    onChange={(e) =>
                      onHrPeriodChange?.(hrMonth, Number(e.target.value))
                    }
                  >
                    {hrYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ops-staff-filter-field">
                  <span>{t("dashboard.reportsStaffFy")}</span>
                  <select
                    className="dashboard-filter-select"
                    value={statementFy}
                    onChange={(e) => setStaffFy(e.target.value)}
                  >
                    {fyOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ops-staff-filter-field">
                  <span>{t("staffRegister.colDesignation")}</span>
                  <select
                    className="dashboard-filter-select"
                    value={staffDesignation}
                    onChange={(e) => setStaffDesignation(e.target.value)}
                  >
                    <option value="">{t("dashboard.filterAll")}</option>
                    {designationOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="dashboard-toolbar ops-staff-toolbar">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{t("dashboard.reportTitle")}</p>
                  <p className="text-xs text-slate-500">
                    {periodLabel}
                    {statementFy ? ` · ${statementFy}` : ""}
                    {staffDesignation ? ` · ${staffDesignation}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {t("dashboard.reportsStaffDownloadHint")}
                  </p>
                </div>
                <div className="dashboard-toolbar-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onHrPeriodChange?.(hrMonth, hrYear)}
                    className="gap-1.5 border-slate-200 bg-white font-semibold shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("dashboard.refresh")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStaffExportMode("excel")}
                    className="gap-1.5 border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 hover:bg-emerald-100"
                    title={t("dashboard.exportExcelHint")}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>{t("dashboard.exportExcel")}</span>
                      <span className="text-[10px] font-medium text-emerald-700/80">
                        {t("dashboard.exportExcelSub")}
                      </span>
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStaffExportMode("pdf")}
                    className="gap-1.5 border-red-200 bg-red-50 font-semibold text-red-800 hover:bg-red-100"
                    title={t("dashboard.exportPdfHint")}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>{t("dashboard.exportPdf")}</span>
                      <span className="text-[10px] font-medium text-red-700/80">
                        {t("dashboard.exportPdfSub")}
                      </span>
                    </span>
                  </Button>
                </div>
              </div>
            </section>
          </ReportBlock>

          <ReportBlock
            step="02"
            title={t("dashboard.reportsStaffSnapshotAttn")}
            desc={t("dashboard.reportsSectionSnapshotDesc")}
          >
            <section className="ops-reports-kpis is-4" aria-label={t("dashboard.reportsStaffSnapshotAttn")}>
              <ReportKpi
                tone="teal"
                icon={<Briefcase className="h-4 w-4" />}
                value={staff}
                label={t("dashboard.staffActive")}
                onClick={() => onOpenStaffList?.("", t("dashboard.staffActive"))}
              />
              <ReportKpi
                tone="sky"
                icon={<Users className="h-4 w-4" />}
                value={hr?.withSalary || 0}
                label={t("dashboard.hrWithSalary")}
                href="/staff"
              />
              <ReportKpi
                tone="blue"
                icon={<CheckCircle className="h-4 w-4" />}
                value={hr?.attendanceMarked || 0}
                label={t("dashboard.hrAttendanceMarked")}
                onClick={() => onOpenHr?.("attendance")}
              />
              <ReportKpi
                tone="amber"
                icon={<Clock className="h-4 w-4" />}
                value={unmarked}
                label={t("dashboard.hrAttendanceUnmarked")}
                onClick={() => onOpenHr?.("attendanceUnmarked")}
              />
            </section>
          </ReportBlock>

          <ReportBlock
            step="03"
            title={t("dashboard.reportsStaffSnapshotPay")}
            desc={t("dashboard.hrMonthLabel", { month: String(hrMonth), year: String(hrYear) })}
          >
            <section className="ops-reports-kpis is-3" aria-label={t("dashboard.reportsStaffSnapshotPay")}>
              <ReportKpi
                tone="violet"
                icon={<Wallet className="h-4 w-4" />}
                value={hr?.payrollPaid || 0}
                label={t("dashboard.hrPaid")}
                onClick={() => onOpenHr?.("payrollPaid")}
              />
              <ReportKpi
                tone="rose"
                icon={<Wallet className="h-4 w-4" />}
                value={hr?.payrollPending || 0}
                label={t("dashboard.hrPayPending")}
                onClick={() => onOpenHr?.("payrollPending")}
              />
              <ReportKpi
                tone="emerald"
                icon={<IndianRupee className="h-4 w-4" />}
                value={inr(hr?.totalNet || 0)}
                label={t("dashboard.reportsKpiNet")}
                href="/staff/payroll"
              />
            </section>
          </ReportBlock>

          <ReportBlock
            step="04"
            title={t("dashboard.reportsStaffCharts")}
            desc={t("dashboard.reportsStaffChartsDesc")}
          >
            <section className="ops-insights ops-insights-compact ops-reports-charts">
              <div className="ops-charts-grid">
                <article className="ops-chart-card ops-chart-wide" data-tone="teal">
                  <header>
                    <h3>{t("dashboard.staffByDesignation")}</h3>
                    <p>{t("dashboard.staffByDesignationDesc")}</p>
                  </header>
                  {visibleStaffSegments.length > 0 ? (
                    <VerticalBarChart
                      segments={visibleStaffSegments}
                      onSegmentClick={(seg) =>
                        onOpenStaffList?.(seg.id || seg.label, seg.label)
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="violet">
                  <header>
                    <h3>{t("dashboard.hrModalAttendance")}</h3>
                    <p>{t("dashboard.chartClickHint")}</p>
                  </header>
                  {staffAttnSegments.length > 0 ? (
                    <DoughnutChart
                      segments={staffAttnSegments}
                      centerValue={staff}
                      centerLabel={t("dashboard.totalLabel")}
                      size={140}
                      showZero
                      onSegmentClick={(seg) =>
                        onOpenHr?.(seg.id === "unmarked" ? "attendanceUnmarked" : "attendance")
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.noClassData")}</p>
                    </div>
                  )}
                </article>

                <article className="ops-chart-card" data-tone="blue">
                  <header>
                    <h3>{t("dashboard.hrPayrollChart")}</h3>
                    <p>{t("dashboard.hrPayrollChartDesc")}</p>
                  </header>
                  {hr ? (
                    <DoughnutChart
                      segments={payrollSegments}
                      centerValue={(hr.payrollPaid || 0) + (hr.payrollPending || 0)}
                      centerLabel={t("dashboard.totalLabel")}
                      size={140}
                      showZero
                      onSegmentClick={(seg) =>
                        onOpenHr?.(seg.id === "paid" ? "payrollPaid" : "payrollPending")
                      }
                    />
                  ) : (
                    <div className="ops-insights-empty-box">
                      <p>{t("dashboard.hrPayrollEmpty")}</p>
                      <Link href="/staff/payroll" className="text-sm font-bold text-blue-700 hover:underline">
                        {t("dashboard.shortcutPayroll")}
                      </Link>
                    </div>
                  )}
                </article>
              </div>
            </section>
          </ReportBlock>

          <div className="ops-flow-more ops-staff-shortcuts ops-rpt-links">
            <span className="ops-flow-more-label">{t("dashboard.staffShortcuts")}</span>
            <div className="ops-flow-actions">
              {(
                [
                  { href: "/staff", label: t("dashboard.shortcutAllStaff"), icon: Users, tone: "teal" as const },
                  { href: "/staff/attendance", label: t("dashboard.shortcutAttendance"), icon: CalendarDays, tone: "amber" as const },
                  { href: "/staff/payroll", label: t("dashboard.shortcutPayroll"), icon: Wallet, tone: "violet" as const },
                  { href: "/staff/salary-slip", label: t("dashboard.shortcutSalarySlip"), icon: FileSpreadsheet, tone: "blue" as const },
                  { href: "/staff/salary-statement", label: t("dashboard.shortcutStatement"), icon: FileSpreadsheet, tone: "sky" as const },
                  { href: "/staff/income-tax", label: t("dashboard.hubLinkTax"), icon: Receipt, tone: "indigo" as const },
                ]
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="ops-flow-action" data-tone={item.tone}>
                    <span className="ops-flow-action-ico"><Icon className="h-4 w-4" /></span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <DashboardStaffExportDialog
            open={Boolean(staffExportMode)}
            onClose={() => setStaffExportMode(null)}
            mode={staffExportMode || "excel"}
            month={hrMonth}
            year={hrYear}
            fy={statementFy}
            designation={staffDesignation}
            periodLabel={periodLabel}
            schoolName={stats?.schoolName || ""}
            kpis={[
              { label: t("dashboard.staffActive"), value: staff.toLocaleString("en-IN") },
              { label: t("dashboard.hrAttendanceMarked"), value: String(hr?.attendanceMarked || 0) },
              { label: t("dashboard.hrAttendanceUnmarked"), value: String(unmarked) },
              { label: t("dashboard.hrPaid"), value: String(hr?.payrollPaid || 0) },
              { label: t("dashboard.hrPayPending"), value: String(hr?.payrollPending || 0) },
              { label: t("dashboard.reportsKpiNet"), value: inr(hr?.totalNet || 0) },
            ]}
            designations={visibleStaffSegments.map((s) => ({ label: s.label, value: s.value }))}
            onPrintReady={setStaffPrint}
          />
          <DashboardStaffPrintReport payload={staffPrint} />
        </>
      )}
    </div>
  );
}
