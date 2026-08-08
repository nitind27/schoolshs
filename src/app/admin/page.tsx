"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { BarChart, DoughnutChart, VerticalBarChart } from "@/components/dashboard/charts";
import {
  School,
  Users,
  GraduationCap,
  Plus,
  Shield,
  Activity,
  IndianRupee,
  FileText,
  CreditCard,
  Building2,
  ExternalLink,
  CheckCircle2,
  Briefcase,
  LayoutGrid,
  MessageSquare,
  MapPin,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  Eye,
  Mail,
  Headphones,
  Bell,
  CalendarClock,
  Clock3,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "@/components/admin/admin-portal.css";

interface ReminderRow {
  kind: "expired" | "expiring" | "due_overdue" | "due_soon";
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  planName: string | null;
  date: string | null;
  daysLeft: number | null;
  paymentStatus: string | null;
  message: string;
}

interface SchoolDirectoryRow {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  city?: string | null;
  isActive: boolean;
  students: number;
  staff: number;
  classes: number;
  users: number;
  admins: { id: string; name: string; email: string; isActive: boolean }[];
  logoPath?: string | null;
  planName?: string | null;
  paymentStatus?: string | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nextDueDate?: string | null;
  portalDaysLeft?: number | null;
  paymentDaysLeft?: number | null;
}

interface PlatformStats {
  schoolCount: number;
  studentCount: number;
  staffCount?: number;
  classCount?: number;
  adminCount: number;
  activeSchools: number;
  inactiveSchools: number;
  totalRevenue: number;
  totalContractValue: number;
  totalPaid: number;
  pendingPayments: number;
  openSupportTickets?: number;
  collectionRate?: number;
  planBreakdown: Record<string, number>;
  paymentStatusBreakdown?: Record<string, number>;
  districtBreakdown?: { label: string; value: number }[];
  topSchoolsByStudents?: {
    id: string;
    name: string;
    code: string;
    students: number;
    isActive: boolean;
  }[];
  monthlyPayments?: { key: string; label: string; amount: number }[];
  schoolsByMonth?: { key: string; label: string; count: number }[];
  reminders?: ReminderRow[];
  summary?: {
    portalExpired: number;
    portalExpiringSoon: number;
    paymentOverdue: number;
    paymentDueSoon: number;
  };
  schoolDirectory?: SchoolDirectoryRow[];
}

const PLAN_COLORS = ["#0369a1", "#0ea5e9", "#0891b2", "#0d9488", "#64748b", "#b45309"];
const STATUS_COLORS: Record<string, string> = {
  paid: "#047857",
  partial: "#b45309",
  pending: "#64748b",
  overdue: "#b91c1c",
  none: "#94a3b8",
};
const DISTRICT_COLORS = ["#0369a1", "#0ea5e9", "#0891b2", "#0d9488", "#334155", "#b45309", "#7c3aed", "#db2777"];
const STUDENT_BAR_COLORS = ["#0ea5e9", "#0369a1", "#0891b2", "#0d9488", "#0284c7", "#155e75", "#334155", "#b45309"];

function progressTone(rate: number) {
  if (rate >= 75) return "is-ok";
  if (rate >= 40) return "is-warn";
  return "is-danger";
}

function formatDateIN(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function portalBadge(daysLeft: number | null | undefined) {
  if (daysLeft == null) return { label: "No expiry set", tone: "slate" as const };
  if (daysLeft < 0) return { label: `Expired ${Math.abs(daysLeft)}d`, tone: "rose" as const };
  if (daysLeft === 0) return { label: "Expires today", tone: "rose" as const };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, tone: "amber" as const };
  return { label: `${daysLeft}d left`, tone: "emerald" as const };
}

function reminderTone(kind: ReminderRow["kind"]) {
  if (kind === "expired" || kind === "due_overdue") return "is-rose";
  if (kind === "expiring" || kind === "due_soon") return "is-amber";
  return "is-slate";
}

export default function AdminDashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"overview" | "analytics">("overview");
  const [schoolQuery, setSchoolQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((statsData) => {
        if (!statsData.error) setStats(statsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const outstanding = (stats?.totalContractValue ?? 0) - (stats?.totalPaid ?? 0);
  const collectionRate = stats?.collectionRate ?? 0;
  const directory = stats?.schoolDirectory || [];
  const reminders = stats?.reminders || [];
  const reminderSummary = stats?.summary;

  const filteredDirectory = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.district || "").toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q),
    );
  }, [directory, schoolQuery]);

  const planSegments = useMemo(() => {
    const entries = Object.entries(stats?.planBreakdown || {});
    return entries.map(([label, value], i) => ({
      label: label === "none" ? "—" : label,
      value,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
    }));
  }, [stats?.planBreakdown]);

  const statusSegments = useMemo(() => {
    const entries = Object.entries(stats?.paymentStatusBreakdown || {});
    return entries.map(([label, value]) => ({
      label,
      value,
      color: STATUS_COLORS[label] || "#64748b",
    }));
  }, [stats?.paymentStatusBreakdown]);

  const activeSegments = useMemo(
    () => [
      { label: t("common.active"), value: stats?.activeSchools ?? 0, color: "#047857" },
      { label: t("common.inactive"), value: stats?.inactiveSchools ?? 0, color: "#94a3b8" },
    ],
    [stats?.activeSchools, stats?.inactiveSchools, t],
  );

  const districtSegments = useMemo(
    () =>
      (stats?.districtBreakdown || []).map((d, i) => ({
        label: d.label,
        value: d.value,
        color: DISTRICT_COLORS[i % DISTRICT_COLORS.length],
      })),
    [stats?.districtBreakdown],
  );

  const topStudentSegments = useMemo(
    () =>
      (stats?.topSchoolsByStudents || []).map((s, i) => ({
        label: s.code || s.name.slice(0, 12),
        value: s.students,
        color: STUDENT_BAR_COLORS[i % STUDENT_BAR_COLORS.length],
      })),
    [stats?.topSchoolsByStudents],
  );

  const growthSegments = useMemo(
    () =>
      (stats?.schoolsByMonth || []).map((m) => ({
        label: m.label,
        value: m.count,
        color: "#0ea5e9",
      })),
    [stats?.schoolsByMonth],
  );

  const monthlyPeak = useMemo(
    () => Math.max(...(stats?.monthlyPayments || []).map((m) => m.amount), 1),
    [stats?.monthlyPayments],
  );

  const manageLinks = [
    { href: "/admin/schools", label: t("admin.manageSchools"), icon: Building2, tone: "blue" },
    { href: "/admin/admins", label: t("admin.manageAdmins"), icon: Users, tone: "violet" },
    { href: "/admin/payments", label: t("admin.managePayments"), icon: CreditCard, tone: "green" },
    { href: "/admin/contracts", label: t("admin.manageContracts"), icon: FileText, tone: "amber" },
    { href: "/admin/contact-support", label: t("admin.manageSupport"), icon: Headphones, tone: "rose" },
    { href: "/admin/login-activity", label: t("admin.manageActivity"), icon: Activity, tone: "slate" },
    { href: "/admin/settings/email", label: t("admin.manageEmail"), icon: Mail, tone: "sky" },
  ];

  const flowSteps = [
    { n: 1, title: t("admin.flow1Title"), desc: t("admin.flow1Desc"), href: "/admin/schools/new", icon: Plus },
    { n: 2, title: t("admin.flow2Title"), desc: t("admin.flow2Desc"), href: "/admin/admins/new", icon: Users },
    { n: 3, title: t("admin.flow3Title"), desc: t("admin.flow3Desc"), href: "/admin/payments", icon: CreditCard },
    { n: 4, title: t("admin.flow4Title"), desc: t("admin.flow4Desc"), href: "/admin/schools", icon: Building2 },
  ];

  const hasCritical =
    (stats?.pendingPayments ?? 0) > 0 ||
    (stats?.openSupportTickets ?? 0) > 0 ||
    (stats?.inactiveSchools ?? 0) > 0 ||
    (reminderSummary?.portalExpired ?? 0) > 0 ||
    (reminderSummary?.portalExpiringSoon ?? 0) > 0 ||
    (reminderSummary?.paymentOverdue ?? 0) > 0 ||
    (reminderSummary?.paymentDueSoon ?? 0) > 0;

  return (
    <div className="ad-portal ad-portal-v2 ad-portal-polish space-y-4">

      {/* ── HERO ── */}
      <header className="ad-hero-v2">
        <div className="ad-hero-v2-top">
          <div className="ad-hero-v2-brand">
            <div className="ad-hero-v2-mark">
              <Shield className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <div className="ad-eyebrow-v2">{t("roles.super_admin")}</div>
              <h1 className="ad-hero-v2-title">{t("admin.homeTitle")}</h1>
              <p className="ad-hero-v2-sub">{t("admin.homeSubtitle")}</p>
            </div>
          </div>
          <div className="ad-hero-v2-actions">
            <Link href="/admin/schools/new" className="ad-btn is-primary">
              <Plus className="h-4 w-4" />
              {t("admin.newSchool")}
            </Link>
            <Link href="/admin/schools" className="ad-btn is-ghost">
              <Eye className="h-4 w-4" />
              {t("admin.allSchools")}
            </Link>
          </div>
        </div>

        <div className="ad-hero-v2-kpis" aria-label={t("admin.kpiTitle")}>
          <div className="ad-hkpi">
            <div className="ad-hkpi-ico ad-hkpi-ico--blue"><Building2 className="h-4 w-4" /></div>
            <div className="ad-hkpi-copy">
              <div className="ad-hkpi-val">{loading ? "—" : (stats?.schoolCount ?? 0).toLocaleString("en-IN")}</div>
              <div className="ad-hkpi-lbl">{t("admin.schoolsLabel")}</div>
              <div className="ad-hkpi-sub">{(stats?.activeSchools ?? 0)} {t("common.active")}</div>
            </div>
          </div>
          <div className="ad-hkpi">
            <div className="ad-hkpi-ico ad-hkpi-ico--emerald"><GraduationCap className="h-4 w-4" /></div>
            <div className="ad-hkpi-copy">
              <div className="ad-hkpi-val">{loading ? "—" : (stats?.studentCount ?? 0).toLocaleString("en-IN")}</div>
              <div className="ad-hkpi-lbl">{t("admin.studentsLabel")}</div>
              <div className="ad-hkpi-sub">{(stats?.classCount ?? 0)} {t("admin.classesLabel")}</div>
            </div>
          </div>
          <div className="ad-hkpi">
            <div className="ad-hkpi-ico ad-hkpi-ico--amber"><IndianRupee className="h-4 w-4" /></div>
            <div className="ad-hkpi-copy">
              <div className="ad-hkpi-val ad-hkpi-val--sm">{loading ? "—" : formatINR(stats?.totalPaid)}</div>
              <div className="ad-hkpi-lbl">{t("admin.kpiCollected")}</div>
              <div className="ad-hkpi-sub">{collectionRate}% {t("admin.collectedLabel")}</div>
            </div>
          </div>
          <div className="ad-hkpi">
            <div className="ad-hkpi-ico ad-hkpi-ico--violet"><Briefcase className="h-4 w-4" /></div>
            <div className="ad-hkpi-copy">
              <div className="ad-hkpi-val">{loading ? "—" : (stats?.staffCount ?? 0).toLocaleString("en-IN")}</div>
              <div className="ad-hkpi-lbl">{t("admin.kpiStaff")}</div>
              <div className="ad-hkpi-sub">{(stats?.adminCount ?? 0)} {t("admin.schoolAdmins")}</div>
            </div>
          </div>
        </div>

        <div className="ad-hero-v2-grid-bg" aria-hidden />
      </header>

      {/* ── MAIN TABS ── */}
      <nav className="ad-main-tabs" data-active={mainTab} role="tablist" aria-label={t("admin.homeTitle")}>
        <span className="ad-main-tabs-thumb" aria-hidden />
        <button
          type="button"
          role="tab"
          className={mainTab === "overview" ? "is-active" : undefined}
          aria-selected={mainTab === "overview"}
          onClick={() => setMainTab("overview")}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>{t("admin.kpiTitle")}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={mainTab === "analytics" ? "is-active" : undefined}
          aria-selected={mainTab === "analytics"}
          onClick={() => setMainTab("analytics")}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{t("admin.analyticsTitle")}</span>
        </button>
      </nav>

      {mainTab === "overview" ? (
      <>
      {/* ── ATTENTION ── */}
      {hasCritical && (
        <section className="ad-alert-strip">
          <div className="ad-alert-strip-label">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{t("admin.attentionTitle")}</span>
          </div>
          <div className="ad-alert-chips">
            {(reminderSummary?.portalExpired ?? 0) > 0 && (
              <a href="#portal-reminders" className="ad-alert-chip is-rose">
                <CalendarClock className="h-3.5 w-3.5" />
                <strong>{reminderSummary?.portalExpired}</strong>
                <span>Portal expired</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </a>
            )}
            {(reminderSummary?.portalExpiringSoon ?? 0) > 0 && (
              <a href="#portal-reminders" className="ad-alert-chip is-amber">
                <Clock3 className="h-3.5 w-3.5" />
                <strong>{reminderSummary?.portalExpiringSoon}</strong>
                <span>Expiring ≤30d</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </a>
            )}
            {(reminderSummary?.paymentOverdue ?? 0) > 0 && (
              <a href="#portal-reminders" className="ad-alert-chip is-rose">
                <CreditCard className="h-3.5 w-3.5" />
                <strong>{reminderSummary?.paymentOverdue}</strong>
                <span>Payment overdue</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </a>
            )}
            {(reminderSummary?.paymentDueSoon ?? 0) > 0 && (
              <a href="#portal-reminders" className="ad-alert-chip is-amber">
                <Bell className="h-3.5 w-3.5" />
                <strong>{reminderSummary?.paymentDueSoon}</strong>
                <span>Due ≤14d</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </a>
            )}
            {(stats?.pendingPayments ?? 0) > 0 && (
              <Link href="/admin/payments" className="ad-alert-chip is-amber">
                <CreditCard className="h-3.5 w-3.5" />
                <strong>{(stats?.pendingPayments ?? 0).toLocaleString("en-IN")}</strong>
                <span>{t("admin.attentionPayments")}</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            )}
            {(stats?.openSupportTickets ?? 0) > 0 && (
              <Link href="/admin/contact-support" className="ad-alert-chip is-rose">
                <MessageSquare className="h-3.5 w-3.5" />
                <strong>{(stats?.openSupportTickets ?? 0).toLocaleString("en-IN")}</strong>
                <span>{t("admin.attentionTickets")}</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            )}
            {(stats?.inactiveSchools ?? 0) > 0 && (
              <Link href="/admin/schools" className="ad-alert-chip is-slate">
                <School className="h-3.5 w-3.5" />
                <strong>{(stats?.inactiveSchools ?? 0).toLocaleString("en-IN")}</strong>
                <span>{t("admin.attentionInactive")}</span>
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── PORTAL / PAYMENT REMINDERS ── */}
      <section id="portal-reminders" className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <Bell className="h-5 w-5 text-amber-600" />
              Portal & payment reminders
            </h2>
            <p>Contract end date = portal expiry · Next due date = payment reminder</p>
          </div>
          <Link href="/admin/contracts" className="ad-panel-link">
            Contracts
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="ad-panel-body">
          {loading ? (
            <div className="ad-loading"><div className="ad-spinner" /></div>
          ) : reminders.length === 0 ? (
            <div className="ad-empty" style={{ padding: "1.25rem" }}>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-70" />
              <p>No expiry or payment reminders right now.</p>
            </div>
          ) : (
            <div className="ad-reminder-list">
              {reminders.map((r) => (
                <Link
                  key={`${r.kind}-${r.schoolId}-${r.date || ""}`}
                  href={`/admin/schools/${r.schoolId}?tab=contract`}
                  className={`ad-reminder-item ${reminderTone(r.kind)}`}
                >
                  <div className="ad-reminder-ico">
                    {r.kind === "expired" || r.kind === "expiring" ? (
                      <CalendarClock className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="ad-reminder-title">{r.schoolName}</p>
                    <p className="ad-reminder-meta">
                      <span className="ad-mono">{r.schoolCode}</span>
                      {r.planName ? <span>· {r.planName}</span> : null}
                      {r.date ? <span>· {formatDateIN(r.date)}</span> : null}
                    </p>
                    <p className="ad-reminder-msg">{r.message}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-50 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── QUICK-NAV ── */}
      <section className="ad-quicknav">
        <div className="ad-quicknav-label">
          <Zap className="h-3.5 w-3.5" />
          <span>{t("admin.manageTitle")}</span>
        </div>
        <div className="ad-quicknav-items">
          {manageLinks.map((item) => (
            <Link key={item.href} href={item.href} className="ad-quicknav-item" data-tone={item.tone}>
              <span className="ad-quicknav-ico"><item.icon className="h-4 w-4" /></span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FINANCE ── */}
      <div className="ad-finance-row">
        <section className="ad-finance-card">
          <div className="ad-finance-card-head">
            <div className="ad-finance-card-ico"><TrendingUp className="h-4 w-4" /></div>
            <div>
              <h2>{t("admin.kpiTitle")}</h2>
              <p>{t("admin.kpiCollected")}</p>
            </div>
            <Link href="/admin/payments" className="ad-panel-link ml-auto">
              {t("admin.managePayments")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="ad-finance-tiles">
            <div className="ad-ftile is-ink">
              <span>{t("admin.manageContracts")}</span>
              <strong>{formatINR(stats?.totalContractValue)}</strong>
            </div>
            <div className="ad-ftile is-ok">
              <span>{t("admin.kpiCollected")}</span>
              <strong>{formatINR(stats?.totalPaid)}</strong>
            </div>
            <div className="ad-ftile is-warn">
              <span>{t("admin.attentionPayments")}</span>
              <strong>{formatINR(outstanding)}</strong>
            </div>
          </div>
          <div className="ad-finance-progress">
            <div className="ad-finance-progress-meta">
              <span>{t("admin.collectedLabel")}</span>
              <strong className={collectionRate >= 75 ? "text-emerald-700" : collectionRate >= 40 ? "text-amber-700" : "text-red-700"}>
                {collectionRate}%
              </strong>
            </div>
            <div className="ad-progress-track">
              <div
                className={`ad-progress-fill ${progressTone(collectionRate)}`}
                style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
              />
            </div>
          </div>
          {(stats?.monthlyPayments || []).length > 0 && (
            <div className="ad-money-bars">
              {(stats?.monthlyPayments || []).map((m) => (
                <div key={m.key} className="ad-money-bar-row">
                  <span>{m.label}</span>
                  <div className="ad-money-track">
                    <div
                      className="ad-money-fill"
                      style={{ width: `${monthlyPeak > 0 ? (m.amount / monthlyPeak) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{formatINR(m.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ad-finance-card ad-finance-card--center">
          <div className="ad-finance-card-head">
            <div className="ad-finance-card-ico"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <h2>{t("admin.managePayments")}</h2>
              <p>{t("admin.schoolsLabel")}</p>
            </div>
          </div>
          <DoughnutChart
            segments={statusSegments}
            centerLabel={t("admin.schoolsLabel")}
            centerValue={(stats?.schoolCount ?? 0).toLocaleString("en-IN")}
            size={160}
          />
        </section>
      </div>

      {/* ── ALL SCHOOLS DIRECTORY ── */}
      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <Building2 className="h-5 w-5 text-sky-700" />
              All schools · live data
            </h2>
            <p>
              {(stats?.schoolCount ?? 0).toLocaleString("en-IN")} schools ·{" "}
              {(stats?.studentCount ?? 0).toLocaleString("en-IN")} students ·{" "}
              {(stats?.staffCount ?? 0).toLocaleString("en-IN")} staff
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input
              type="search"
              value={schoolQuery}
              onChange={(e) => setSchoolQuery(e.target.value)}
              placeholder="Search school / code / district"
              className="ad-search-input"
            />
            <Link href="/admin/schools" className="ad-panel-link">
              Manage
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="ad-panel-body is-flush">
          {loading ? (
            <div className="ad-loading"><div className="ad-spinner" /></div>
          ) : filteredDirectory.length === 0 ? (
            <div className="ad-empty">
              <School className="h-9 w-9 opacity-40" />
              <p>{schoolQuery ? "No schools match your search." : t("admin.noSchools")}</p>
              {!schoolQuery ? (
                <Link href="/admin/schools/new" className="ad-btn is-primary is-sm" style={{ marginTop: "0.75rem" }}>
                  <Plus className="h-4 w-4" />
                  {t("admin.newSchool")}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table ad-table--dense">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Students</th>
                    <th>Staff</th>
                    <th>Classes</th>
                    <th>Plan</th>
                    <th>Payment</th>
                    <th>Portal expiry</th>
                    <th>Next due</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectory.map((s) => {
                    const badge = portalBadge(s.portalDaysLeft);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="ad-school-cell">
                            {s.logoPath ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/api/uploads/${s.logoPath}`} alt="" className="ad-school-logo" />
                            ) : (
                              <div className="ad-school-logo"><School className="h-4 w-4" /></div>
                            )}
                            <div className="min-w-0">
                              <p className="ad-school-name">{s.name}</p>
                              <p className="ad-mono">
                                {s.code}
                                {s.district ? ` · ${s.district}` : ""}
                              </p>
                              {s.admins?.[0] ? (
                                <p className="ad-school-admin">{s.admins[0].email}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{s.students.toLocaleString("en-IN")}</td>
                        <td style={{ color: "var(--ad-muted)" }}>{s.staff.toLocaleString("en-IN")}</td>
                        <td style={{ color: "var(--ad-muted)" }}>{s.classes.toLocaleString("en-IN")}</td>
                        <td>
                          <span className="ad-pill">{s.planName || "—"}</span>
                        </td>
                        <td>
                          <div className="ad-pay-cell">
                            <span className={`ad-pay-status is-${s.paymentStatus || "none"}`}>
                              {s.paymentStatus || "—"}
                            </span>
                            <small>
                              {formatINR(s.paidAmount)} / {formatINR(s.totalAmount)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="ad-date-cell">
                            <span>{formatDateIN(s.contractEndDate)}</span>
                            <span className={`ad-expiry-badge is-${badge.tone}`}>{badge.label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="ad-date-cell">
                            <span>{formatDateIN(s.nextDueDate)}</span>
                            {s.paymentDaysLeft != null && s.paymentDaysLeft <= 14 ? (
                              <span className={`ad-expiry-badge is-${s.paymentDaysLeft < 0 ? "rose" : "amber"}`}>
                                {s.paymentDaysLeft < 0
                                  ? `Overdue ${Math.abs(s.paymentDaysLeft)}d`
                                  : s.paymentDaysLeft === 0
                                    ? "Due today"
                                    : `${s.paymentDaysLeft}d`}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td><StatusBadge active={s.isActive} /></td>
                        <td>
                          <Link href={`/admin/schools/${s.id}`} className="ad-btn is-outline is-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── ONBOARD FLOW ── */}
      <section className="ad-section ad-flow-card">
        <div className="ad-section-head">
          <div>
            <h2 className="ad-section-title">{t("admin.flowTitle")}</h2>
            <p className="ad-section-desc">{t("admin.flowDesc")}</p>
          </div>
          <Link href="/admin/schools/new" className="ad-btn is-primary is-sm">
            {t("admin.flowStart")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ol className="ad-flow-steps">
          {flowSteps.map((step, i) => (
            <li key={step.n} className="ad-flow-step">
              {i > 0 ? <span className="ad-flow-join" aria-hidden /> : null}
              <Link href={step.href} className="ad-flow-link">
                <span className="ad-flow-num">{step.n}</span>
                <span className="ad-flow-text">
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </span>
                <ArrowRight className="ad-flow-arrow h-4 w-4" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      </>
      ) : (
      /* ── ANALYTICS TAB ── */
      <div className="ad-analytics-body">
        {loading || !stats ? (
          <div className="ad-panel">
            <div className="ad-panel-body">
              <div className="ad-loading"><div className="ad-spinner" /></div>
            </div>
          </div>
        ) : (
          <>
            <section className="ad-panel">
              <div className="ad-panel-head">
                <div>
                  <h2>
                    <TrendingUp className="h-5 w-5 text-sky-700" />
                    {t("admin.analyticsTitle")}
                  </h2>
                  <p>
                    {(stats.schoolCount ?? 0).toLocaleString("en-IN")} schools ·{" "}
                    {(stats.studentCount ?? 0).toLocaleString("en-IN")} students ·{" "}
                    {(stats.staffCount ?? 0).toLocaleString("en-IN")} staff
                  </p>
                </div>
              </div>
              <div className="ad-panel-body">
                <div className="ad-finance-tiles">
                  <div className="ad-ftile is-ink">
                    <span>{t("admin.schoolsLabel")}</span>
                    <strong>{(stats.schoolCount ?? 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="ad-ftile is-ok">
                    <span>{t("admin.studentsLabel")}</span>
                    <strong>{(stats.studentCount ?? 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="ad-ftile is-warn">
                    <span>{t("admin.kpiCollected")}</span>
                    <strong>{formatINR(stats.totalPaid)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <div className="ad-chart-grid is-3">
              <section className="ad-panel">
                <div className="ad-panel-head">
                  <div>
                    <h2>
                      <LayoutGrid className="h-5 w-5 text-sky-700" />
                      Plans
                    </h2>
                    <p>Schools by subscription plan</p>
                  </div>
                </div>
                <div className="ad-panel-body">
                  <div className="ad-chart-wrap">
                    {planSegments.length === 0 ? (
                      <div className="ad-analytics-empty">No plan data yet</div>
                    ) : (
                      <DoughnutChart
                        className="w-full"
                        segments={planSegments}
                        centerLabel={t("admin.schoolsLabel")}
                        centerValue={planSegments.reduce((s, x) => s + x.value, 0)}
                        size={140}
                      />
                    )}
                  </div>
                </div>
              </section>

              <section className="ad-panel">
                <div className="ad-panel-head">
                  <div>
                    <h2>
                      <School className="h-5 w-5 text-sky-700" />
                      School status
                    </h2>
                    <p>Active vs inactive</p>
                  </div>
                </div>
                <div className="ad-panel-body">
                  <div className="ad-chart-wrap">
                    <DoughnutChart
                      className="w-full"
                      segments={activeSegments}
                      centerLabel={t("admin.schoolsLabel")}
                      centerValue={(stats.schoolCount ?? 0).toLocaleString("en-IN")}
                      size={140}
                    />
                  </div>
                </div>
              </section>

              <section className="ad-panel">
                <div className="ad-panel-head">
                  <div>
                    <h2>
                      <MapPin className="h-5 w-5 text-sky-700" />
                      Districts
                    </h2>
                    <p>Schools by district</p>
                  </div>
                </div>
                <div className="ad-panel-body">
                  <div className="ad-chart-wrap">
                    {districtSegments.length === 0 ? (
                      <div className="ad-analytics-empty">No district data yet</div>
                    ) : (
                      <BarChart className="w-full" segments={districtSegments} />
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="ad-split-2">
              <section className="ad-panel">
                <div className="ad-panel-head">
                  <div>
                    <h2>
                      <Activity className="h-5 w-5 text-sky-700" />
                      New schools (6 months)
                    </h2>
                    <p>School onboarding growth</p>
                  </div>
                </div>
                <div className="ad-panel-body">
                  <div className="ad-chart-wrap">
                    {growthSegments.every((s) => s.value === 0) ? (
                      <div className="ad-analytics-empty">No new schools in last 6 months</div>
                    ) : (
                      <VerticalBarChart className="w-full" segments={growthSegments} />
                    )}
                  </div>
                </div>
              </section>

              <section className="ad-panel">
                <div className="ad-panel-head">
                  <div>
                    <h2>
                      <GraduationCap className="h-5 w-5 text-sky-700" />
                      Top schools by students
                    </h2>
                    <p>Highest student counts</p>
                  </div>
                </div>
                <div className="ad-panel-body">
                  <div className="ad-chart-wrap">
                    {topStudentSegments.length === 0 ? (
                      <div className="ad-analytics-empty">No student data yet</div>
                    ) : (
                      <VerticalBarChart className="w-full" segments={topStudentSegments} />
                    )}
                  </div>
                </div>
              </section>
            </div>

            <section className="ad-panel">
              <div className="ad-panel-head">
                <div>
                  <h2>
                    <IndianRupee className="h-5 w-5 text-sky-700" />
                    Monthly collections
                  </h2>
                  <p>Payment amount received (last 6 months)</p>
                </div>
                <Link href="/admin/payments" className="ad-panel-link">
                  Payments
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="ad-panel-body">
                <div className="ad-chart-wrap">
                  {(stats.monthlyPayments || []).length === 0 ? (
                    <div className="ad-analytics-empty">No payment history yet</div>
                  ) : (
                    <BarChart
                      className="w-full"
                      segments={(stats.monthlyPayments || []).map((m) => ({
                        label: m.label,
                        value: m.amount,
                        color: "#0ea5e9",
                      }))}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="ad-panel">
              <div className="ad-panel-head">
                <div>
                  <h2>
                    <CreditCard className="h-5 w-5 text-sky-700" />
                    Payment status mix
                  </h2>
                  <p>How many schools are paid / pending / overdue</p>
                </div>
              </div>
              <div className="ad-panel-body">
                <div className="ad-chart-wrap">
                  {statusSegments.length === 0 ? (
                    <div className="ad-analytics-empty">No payment status data</div>
                  ) : (
                    <DoughnutChart
                      className="w-full"
                      segments={statusSegments}
                      centerLabel="Schools"
                      centerValue={(stats.schoolCount ?? 0).toLocaleString("en-IN")}
                      size={140}
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      )}
    </div>
  );
}
