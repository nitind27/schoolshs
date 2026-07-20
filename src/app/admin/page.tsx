"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import {
  School,
  Users,
  GraduationCap,
  Plus,
  Shield,
  BookOpen,
  Activity,
  IndianRupee,
  FileText,
  CreditCard,
  Building2,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "@/components/admin/admin-portal.css";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  isActive: boolean;
  _count: { students: number; users: number; classes: number; staff: number };
  users: { id: string; email: string; name: string; isActive: boolean }[];
  subscription?: {
    planName?: string;
    paymentStatus?: string;
    totalAmount?: string | null;
    paidAmount?: string | null;
  } | null;
  settings?: { logoPath?: string | null } | null;
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  school: { id: string; name: string; code: string };
}

interface PlatformStats {
  schoolCount: number;
  studentCount: number;
  adminCount: number;
  activeSchools: number;
  inactiveSchools: number;
  totalRevenue: number;
  totalContractValue: number;
  totalPaid: number;
  pendingPayments: number;
  planBreakdown: Record<string, number>;
}

export default function AdminDashboardPage() {
  const t = useT();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/schools").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
    ])
      .then(([schoolData, adminData, statsData]) => {
        setSchools(schoolData.schools || []);
        setAdmins(adminData.users || []);
        setStats(statsData);
      })
      .finally(() => setLoading(false));
  }, []);

  const recentSchools = schools.slice(0, 5);
  const outstanding = (stats?.totalContractValue ?? 0) - (stats?.totalPaid ?? 0);

  return (
    <div className="ad-portal space-y-6">
      <header className="ad-hero">
        <div className="ad-hero-inner">
          <div className="ad-hero-brand">
            <div className="ad-hero-mark">
              <Shield className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <div className="ad-eyebrow">{t("roles.super_admin")}</div>
              <h1>{t("admin.title")}</h1>
              <p>{t("admin.subtitle")}</p>
            </div>
          </div>
          <div className="ad-hero-actions">
            <Link href="/admin/schools/new" className="ad-btn is-primary">
              <Plus className="h-4 w-4" />
              {t("admin.newSchool")}
            </Link>
            <Link href="/admin/schools" className="ad-btn is-ghost">
              <Building2 className="h-4 w-4" />
              {t("admin.allSchools")}
            </Link>
          </div>
        </div>
      </header>

      <div className="ad-stat-grid is-six">
        <div className="ad-stat">
          <div className="ad-stat-icon">
            <School className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">{t("admin.totalSchools")}</div>
          <div className="ad-stat-value">{(stats?.schoolCount ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="ad-stat is-ok">
          <div className="ad-stat-icon">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">Active Schools</div>
          <div className="ad-stat-value">{(stats?.activeSchools ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="ad-stat is-slate">
          <div className="ad-stat-icon">
            <Ban className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">Inactive</div>
          <div className="ad-stat-value">{(stats?.inactiveSchools ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-icon">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">{t("admin.totalStudents")}</div>
          <div className="ad-stat-value">{(stats?.studentCount ?? 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="ad-stat is-ok">
          <div className="ad-stat-icon">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">Total Revenue</div>
          <div className="ad-stat-value" style={{ fontSize: "1.25rem" }}>
            {formatINR(stats?.totalRevenue)}
          </div>
        </div>
        <div className="ad-stat is-warn">
          <div className="ad-stat-icon">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="ad-stat-label">Pending Payments</div>
          <div className="ad-stat-value">{(stats?.pendingPayments ?? 0).toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="ad-grid-main">
        <section className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>
                <TrendingUp className="h-5 w-5 text-sky-700" />
                Revenue Overview
              </h2>
              <p>Contract value, collections and outstanding balance</p>
            </div>
            <Link href="/admin/payments" className="ad-panel-link">
              View all →
            </Link>
          </div>
          <div className="ad-panel-body">
            <div className="ad-revenue-grid">
              <div className="ad-revenue-tile">
                <span>Contract Value</span>
                <strong>{formatINR(stats?.totalContractValue)}</strong>
              </div>
              <div className="ad-revenue-tile is-ok">
                <span>Collected</span>
                <strong>{formatINR(stats?.totalPaid)}</strong>
              </div>
              <div className="ad-revenue-tile is-warn">
                <span>Outstanding</span>
                <strong>{formatINR(outstanding)}</strong>
              </div>
            </div>
            {stats?.planBreakdown && Object.keys(stats.planBreakdown).length > 0 && (
              <div className="ad-chips">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <span key={plan} className="ad-chip">
                    {plan}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Quick Actions</h2>
              <p>Common admin tasks</p>
            </div>
          </div>
          <div className="ad-panel-body">
            <div className="ad-actions">
              <Link href="/admin/schools/new" className="ad-action">
                <div className="ad-action-icon">
                  <Plus className="h-4 w-4" />
                </div>
                <span>Register School</span>
              </Link>
              <Link href="/admin/admins/new" className="ad-action">
                <div className="ad-action-icon is-slate">
                  <Users className="h-4 w-4" />
                </div>
                <span>Create Admin</span>
              </Link>
              <Link href="/admin/contracts" className="ad-action">
                <div className="ad-action-icon is-ok">
                  <FileText className="h-4 w-4" />
                </div>
                <span>View Contracts</span>
              </Link>
              <Link href="/admin/payments" className="ad-action">
                <div className="ad-action-icon is-warn">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span>Record Payment</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <BookOpen className="h-5 w-5 text-sky-700" />
              Recent Schools
            </h2>
          </div>
          <Link href="/admin/schools" className="ad-panel-link">
            {schools.length} total →
          </Link>
        </div>
        <div className="ad-panel-body is-flush">
          {loading ? (
            <div className="ad-loading">
              <div className="ad-spinner" />
            </div>
          ) : recentSchools.length === 0 ? (
            <div className="ad-empty">
              <School className="h-9 w-9 opacity-40" />
              <p>{t("admin.noSchools")}</p>
            </div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>District</th>
                    <th style={{ textAlign: "center" }}>Students</th>
                    <th>Plan</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentSchools.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="ad-school-cell">
                          {s.settings?.logoPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/uploads/${s.settings.logoPath}`}
                              alt=""
                              className="ad-school-logo"
                            />
                          ) : (
                            <div className="ad-school-logo">
                              <School className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="ad-school-name">{s.name}</p>
                            <p className="ad-mono">{s.code}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: "var(--ad-muted)" }}>{s.district || "—"}</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {s._count.students.toLocaleString("en-IN")}
                      </td>
                      <td style={{ textTransform: "capitalize", fontSize: "0.8rem" }}>
                        {s.subscription?.planName || "—"}
                      </td>
                      <td>
                        <StatusBadge status={s.subscription?.paymentStatus} />
                      </td>
                      <td>
                        <StatusBadge active={s.isActive} />
                      </td>
                      <td>
                        <Link href={`/admin/schools/${s.id}`} className="ad-btn is-outline is-sm">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <Activity className="h-5 w-5 text-sky-700" />
              {t("admin.allAdmins")}
            </h2>
          </div>
          <Link href="/admin/admins" className="ad-panel-link">
            {admins.length} admins →
          </Link>
        </div>
        <div className="ad-panel-body is-flush">
          {loading ? (
            <div className="ad-loading">
              <div className="ad-spinner" />
            </div>
          ) : admins.length === 0 ? (
            <div className="ad-empty">
              <Users className="h-8 w-8 opacity-40" />
              <p>{t("admin.noAdmins")}</p>
            </div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("admin.emailLoginHeader")}</th>
                    <th>{t("admin.selectSchool")}</th>
                    <th>{t("admin.lastLogin")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.slice(0, 8).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="ad-school-cell">
                          <div className="ad-avatar">{a.name.charAt(0)}</div>
                          <span className="ad-school-name">{a.name}</span>
                        </div>
                      </td>
                      <td className="ad-mono" style={{ margin: 0, fontSize: "0.75rem", color: "var(--ad-muted)" }}>
                        {a.email}
                      </td>
                      <td>
                        <p className="ad-school-name" style={{ fontSize: "0.82rem" }}>
                          {a.school.name}
                        </p>
                        <p className="ad-mono">{a.school.code}</p>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--ad-muted)" }}>
                        {a.lastLoginAt ? (
                          new Date(a.lastLoginAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        ) : (
                          <span style={{ opacity: 0.45 }}>{t("common.never")}</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge active={a.isActive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
