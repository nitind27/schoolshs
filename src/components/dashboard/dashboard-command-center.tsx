"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Calculator,
  ClipboardCheck,
  FileImage,
  FileSpreadsheet,
  Receipt,
  Send,
  ArrowRight,
  UserRoundX,
  UserPlus,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export type OpsOverview = {
  academicYear?: string;
  students?: { total: number; withoutPhoto: number; withPhoto: number };
  admissions?: { pending: number; verified: number; rejected: number };
  scholarship?: {
    draft: number;
    ready: number;
    submitted: number;
    completionRate: number;
  };
  classes?: { total: number };
  staff?: { total: number; active: number };
  accounting?: { pending: number; verified: number; vouchersTotal: number };
  attendance?: { monthsMarkedThisMonth: number };
  idCards?: { needingPhoto: number; withPhoto: number };
};

export type HrOverview = {
  attendanceMarked: number;
  attendanceUnmarked?: number;
  payrollPending: number;
  payrollPaid: number;
  totalStaff: number;
  totalNet: number;
} | null;

type AttentionItem = {
  id: string;
  label: string;
  count: number;
  href?: string;
  onClick?: () => void;
  tone: "amber" | "rose" | "teal" | "violet" | "blue";
  icon: LucideIcon;
};

type HubLink = { href: string; label: string };

type HubCard = {
  id: string;
  eyebrow: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
  stats: { label: string; value: string }[];
  links: HubLink[];
  primaryHref: string;
};

interface Props {
  ops: OpsOverview | null;
  hr: HrOverview;
  onOpenAdmissionPending?: () => void;
  onOpenStaffAttendance?: () => void;
  onOpenPayrollPending?: () => void;
  onOpenDraftStudents?: () => void;
  /** Render only attention strip, only hubs, or both (default). */
  parts?: Array<"attention" | "hubs">;
}

export function DashboardCommandCenter({
  ops,
  hr,
  onOpenAdmissionPending,
  onOpenStaffAttendance,
  onOpenPayrollPending,
  onOpenDraftStudents,
  parts = ["attention", "hubs"],
}: Props) {
  const t = useT();
  const showAttention = parts.includes("attention");
  const showHubs = parts.includes("hubs");

  const attnUnmarked =
    hr?.attendanceUnmarked ??
    Math.max(0, (hr?.totalStaff || 0) - (hr?.attendanceMarked || 0));

  const attention = (
    [
      {
        id: "adm",
        label: t("dashboard.attnAdmissionPending"),
        count: ops?.admissions?.pending || 0,
        href: "/admissions",
        onClick: onOpenAdmissionPending,
        tone: "amber" as const,
        icon: ClipboardList,
      },
      {
        id: "draft",
        label: t("dashboard.attnDraftStudents"),
        count: ops?.scholarship?.draft || 0,
        onClick: onOpenDraftStudents,
        tone: "rose" as const,
        icon: UserRoundX,
      },
      {
        id: "staffAttn",
        label: t("dashboard.attnStaffAttendance"),
        count: attnUnmarked,
        href: "/staff/attendance",
        onClick: onOpenStaffAttendance,
        tone: "teal" as const,
        icon: ClipboardCheck,
      },
      {
        id: "pay",
        label: t("dashboard.attnPayrollPending"),
        count: hr?.payrollPending || 0,
        href: "/staff/payroll",
        onClick: onOpenPayrollPending,
        tone: "violet" as const,
        icon: Wallet,
      },
      {
        id: "photo",
        label: t("dashboard.attnNeedPhoto"),
        count: ops?.idCards?.needingPhoto || ops?.students?.withoutPhoto || 0,
        href: "/id-cards",
        tone: "blue" as const,
        icon: FileImage,
      },
      {
        id: "voucher",
        label: t("dashboard.attnVouchers"),
        count: ops?.accounting?.pending || 0,
        href: "/accounting/vouchers",
        tone: "amber" as const,
        icon: Receipt,
      },
    ] satisfies AttentionItem[]
  ).filter((a) => a.count > 0);

  const hubs: HubCard[] = [
    {
      id: "academics",
      eyebrow: t("dashboard.hubEyebrowAcademics"),
      title: t("dashboard.hubAcademics"),
      desc: t("dashboard.hubAcademicsDesc"),
      icon: BookOpen,
      tone: "blue",
      primaryHref: "/students",
      /* Keep hub stats module-specific — avoid repeating top pulse counts */
      stats: [
        { label: t("dashboard.hubStatClasses"), value: String(ops?.classes?.total ?? "—") },
        {
          label: t("dashboard.hubStatAttnMonths"),
          value: String(ops?.attendance?.monthsMarkedThisMonth ?? "—"),
        },
      ],
      links: [
        { href: "/classes", label: t("nav.classes") },
        { href: "/students", label: t("nav.students") },
        { href: "/admissions", label: t("navExt.admissions") },
        { href: "/attendance", label: t("navExt.attendance") },
        { href: "/results", label: t("navExt.results") },
        { href: "/timetable", label: t("navExt.timetable") },
      ],
    },
    {
      id: "scholarship",
      eyebrow: t("dashboard.hubEyebrowScholarship"),
      title: t("dashboard.hubScholarship"),
      desc: t("dashboard.hubScholarshipDesc"),
      icon: Send,
      tone: "violet",
      primaryHref: "/bulk-submit",
      stats: [
        {
          label: t("dashboard.completionRate"),
          value: `${ops?.scholarship?.completionRate ?? 0}%`,
        },
        { label: t("status.submitted"), value: String(ops?.scholarship?.submitted ?? "—") },
      ],
      links: [
        { href: "/bulk-submit", label: t("nav.bulkSubmit") },
        { href: "/import", label: t("nav.bulkImport") },
        { href: "/auto-apply", label: t("nav.autoApply") },
        { href: "/export", label: t("nav.exportData") },
      ],
    },
    {
      id: "staff",
      eyebrow: t("dashboard.hubEyebrowStaff"),
      title: t("dashboard.hubStaff"),
      desc: t("dashboard.hubStaffDesc"),
      icon: Briefcase,
      tone: "teal",
      primaryHref: "/staff",
      stats: [
        { label: t("dashboard.staffActive"), value: String(hr?.totalStaff ?? ops?.staff?.active ?? "—") },
        {
          label: t("dashboard.hrAttendanceMarked"),
          value: `${hr?.attendanceMarked ?? 0}/${hr?.totalStaff ?? 0}`,
        },
      ],
      links: [
        { href: "/staff", label: t("dashboard.shortcutAllStaff") },
        { href: "/staff/attendance", label: t("dashboard.shortcutAttendance") },
        { href: "/staff/payroll", label: t("dashboard.shortcutPayroll") },
        { href: "/staff/salary-slip", label: t("dashboard.shortcutSalarySlip") },
        { href: "/staff/salary-statement", label: t("dashboard.shortcutStatement") },
      ],
    },
    {
      id: "finance",
      eyebrow: t("dashboard.hubEyebrowFinance"),
      title: t("dashboard.hubFinance"),
      desc: t("dashboard.hubFinanceDesc"),
      icon: Calculator,
      tone: "amber",
      primaryHref: "/accounting",
      stats: [
        { label: t("dashboard.hubStatVouchers"), value: String(ops?.accounting?.vouchersTotal ?? "—") },
        { label: t("dashboard.hubStatPendingAudit"), value: String(ops?.accounting?.pending ?? "—") },
      ],
      links: [
        { href: "/accounting", label: t("navExt.accounting") },
        { href: "/accounting/vouchers", label: t("dashboard.hubLinkVouchers") },
        { href: "/staff/payroll", label: t("dashboard.shortcutPayroll") },
        { href: "/staff/income-tax", label: t("dashboard.hubLinkTax") },
      ],
    },
    {
      id: "docs",
      eyebrow: t("dashboard.hubEyebrowDocs"),
      title: t("dashboard.hubDocs"),
      desc: t("dashboard.hubDocsDesc"),
      icon: FileSpreadsheet,
      tone: "sky",
      primaryHref: "/certificates",
      stats: [
        {
          label: t("dashboard.hubStatWithPhoto"),
          value: String(ops?.idCards?.withPhoto ?? "—"),
        },
        { label: t("dashboard.hubStatVerifiedAdm"), value: String(ops?.admissions?.verified ?? "—") },
      ],
      links: [
        { href: "/certificates", label: t("navExt.certificates") },
        { href: "/id-cards", label: t("nav.idCards") },
        { href: "/bonafide", label: t("dashboard.hubLinkBonafide") },
        { href: "/lc", label: t("dashboard.hubLinkLc") },
        { href: "/students/board-records", label: t("dashboard.hubLinkBoard") },
        { href: "/export", label: t("nav.exportData") },
      ],
    },
  ];

  if (!showAttention && !showHubs) return null;

  return (
    <section
      className={
        showAttention && !showHubs
          ? "ops-command ops-command-priority"
          : !showAttention && showHubs
            ? "ops-command ops-command-hubs"
            : "ops-command"
      }
    >
      {showHubs ? (
        <header className="ops-command-head">
          <div>
            <p className="ops-eyebrow">{t("dashboard.commandEyebrow")}</p>
            <h2>{t("dashboard.hubsTitle")}</h2>
            <p>
              {t("dashboard.hubsDesc")}
              {ops?.academicYear ? (
                <span className="ops-command-year"> · {ops.academicYear}</span>
              ) : null}
            </p>
          </div>
        </header>
      ) : (
        <header className="ops-command-head">
          <div>
            <p className="ops-eyebrow">{t("dashboard.priorityEyebrow")}</p>
            <h2>{t("dashboard.priorityTitle")}</h2>
            <p>{t("dashboard.priorityDesc")}</p>
          </div>
        </header>
      )}

      {showAttention ? (
        <>
          <div className="ops-quick-add">
            <div className="ops-quick-add-label">
              <UserPlus className="h-4 w-4" />
              <span>{t("dashboard.priorityQuickAdd")}</span>
            </div>
            <div className="ops-quick-add-grid">
              <Link href="/students/new" className="ops-quick-add-card is-student">
                <span className="ops-quick-add-ico">
                  <UserPlus className="h-5 w-5" />
                </span>
                <span className="ops-quick-add-copy">
                  <strong>{t("nav.addStudent")}</strong>
                  <small>{t("dashboard.featuredAddStudent")}</small>
                </span>
                <ArrowRight className="ops-quick-add-arrow h-4 w-4" />
              </Link>
              <Link href="/staff/new" className="ops-quick-add-card is-staff">
                <span className="ops-quick-add-ico">
                  <Briefcase className="h-5 w-5" />
                </span>
                <span className="ops-quick-add-copy">
                  <strong>{t("nav.staffAdd")}</strong>
                  <small>{t("dashboard.featuredAddStaff")}</small>
                </span>
                <ArrowRight className="ops-quick-add-arrow h-4 w-4" />
              </Link>
            </div>
          </div>

          {attention.length > 0 ? (
            <div className="ops-attention">
              <div className="ops-attention-label">
                <AlertTriangle className="h-4 w-4" />
                <span>{t("dashboard.commandAttention")}</span>
                <em>{attention.length}</em>
              </div>
              <div className="ops-attention-chips">
                {attention.map((item) => {
                  const Icon = item.icon;
                  const body = (
                    <>
                      <span className="ops-attn-ico"><Icon className="h-4 w-4" /></span>
                      <span className="ops-attn-meta">
                        <strong>{item.count.toLocaleString("en-IN")}</strong>
                        <span>{item.label}</span>
                      </span>
                      <ArrowRight className="ops-attn-arrow h-4 w-4" />
                    </>
                  );
                  if (item.onClick) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`ops-attention-chip is-${item.tone}`}
                        onClick={item.onClick}
                      >
                        {body}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.id}
                      href={item.href || "/dashboard"}
                      className={`ops-attention-chip is-${item.tone}`}
                    >
                      {body}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="ops-attention is-clear">
              <ClipboardCheck className="h-4 w-4" />
              <span>{t("dashboard.commandAllClear")}</span>
            </div>
          )}
        </>
      ) : null}

      {showHubs ? (
        <div className="ops-hubs">
          {hubs.map((hub) => {
            const Icon = hub.icon;
            return (
              <article key={hub.id} className="ops-hub" data-tone={hub.tone}>
                <header className="ops-hub-head">
                  <span className="ops-hub-ico"><Icon className="h-4 w-4" /></span>
                  <div className="ops-hub-title">
                    <p className="ops-eyebrow">{hub.eyebrow}</p>
                    <h3>{hub.title}</h3>
                    <p>{hub.desc}</p>
                  </div>
                  <Link href={hub.primaryHref} className="ops-hub-open">
                    {t("dashboard.open")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </header>
                <div className="ops-hub-stats">
                  {hub.stats.map((s) => (
                    <div key={s.label}>
                      <span>{s.label}</span>
                      <strong>{s.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="ops-hub-links">
                  {hub.links.slice(0, 4).map((l) => (
                    <Link key={l.href + l.label} href={l.href}>
                      {l.label}
                    </Link>
                  ))}
                  {hub.links.length > 4 ? (
                    <Link href={hub.primaryHref} className="ops-hub-more">
                      +{hub.links.length - 4}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
